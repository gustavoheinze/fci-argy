const https = require('https');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = 'database.sqlite';
const MASTER_JSON = 'cafci_master_full.json';
const LOG_FILE = 'sync_log.txt';
const DELAY_MS = 5000; // Increased delay

function log(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}`;
    console.log(formatted);
    fs.appendFileSync(LOG_FILE, formatted + '\n');
}

function logError(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ERROR: ${msg}`;
    console.error(formatted);
    fs.appendFileSync(LOG_FILE, formatted + '\n');
}

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Origin': 'https://www.cafci.org.ar',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7'
};

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { req.destroy(); reject(new Error(`Timeout: ${url}`)); }, 30000);
        const req = https.get(url, { headers: HEADERS }, (res) => {
            clearTimeout(timeout);
            if (res.statusCode === 429) return reject(new Error('Rate limit'));
            if (res.statusCode < 200 || res.statusCode >= 300) return resolve(null);
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
        });
        req.on('error', (err) => { clearTimeout(timeout); reject(err); });
    });
}

function toVal(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
}

function toNum(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return val;
    const n = parseFloat(String(val).replace(',', '.'));
    return isNaN(n) ? null : n;
}

async function updateProgressFile(db) {
    try {
        const stats = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM funds) as total,
                (SELECT COUNT(*) FROM funds WHERE full_json_ficha IS NOT NULL) as enriched
        `).get();

        const status = {
            totalFunds: stats.total,
            enrichedFunds: stats.enriched,
            progressPct: stats.total > 0 ? (stats.enriched / stats.total) * 100 : 0,
            lastUpdate: new Date().toISOString(),
            mode: 'SMART_SYNC_V5'
        };

        const filePath = path.join(__dirname, '..', 'public', 'sync_status.json');
        fs.writeFileSync(filePath, JSON.stringify(status, null, 2));
    } catch (e) {
        console.error('Error updating progress file:', e.message);
    }
}

async function main() {
    log('Opening database...');
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Ensure last_comp_sync exists
    try { db.exec("ALTER TABLE funds ADD COLUMN last_comp_sync TEXT;"); } catch (e) { }

    log('Fetching latest master list from API...');
    const masterUrl = 'https://api.pub.cafci.org.ar/fondo?estado=1&include=entidad;depositaria,entidad;gerente,tipoRenta,region,benchmark,horizonte,duration,tipo_fondo,clase_fondo&limit=0&order=clase_fondos.nombre';
    const masterData = await fetchUrl(masterUrl);

    if (!masterData || !masterData.data) {
        logError('Could not fetch master list. Using local cache if exists.');
    } else {
        fs.writeFileSync(MASTER_JSON, JSON.stringify(masterData, null, 2));
        log(`Master list updated: ${masterData.data.length} funds.`);
    }

    const localMaster = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf8')).data;
    const dbFunds = db.prepare('SELECT id, updated_at, last_sync, last_comp_sync, date_data FROM funds').all();
    const dbMap = new Map(dbFunds.map(f => [f.id, f]));

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const targets = [];
    for (const f of localMaster) {
        if (!f.clase_fondos) continue;
        for (const cl of f.clase_fondos) {
            const local = dbMap.get(String(cl.id));

            let reason = null;
            if (!local) {
                reason = 'NEW_FUND';
            } else {
                const metadataChanged = toVal(cl.updatedAt) !== local.updated_at;
                const perfOld = !local.last_sync || local.last_sync.split('T')[0] < today;
                const compOld = !local.last_comp_sync || local.last_comp_sync < sevenDaysAgo;

                if (metadataChanged) reason = 'METADATA_CHANGED';
                else if (perfOld) reason = 'PERF_EXPIRED';
                else if (compOld) reason = 'COMP_EXPIRED';
            }

            if (reason) {
                targets.push({
                    id: String(cl.id),
                    fund_id: String(f.id),
                    name: cl.nombre,
                    reason,
                    needsComposition: reason === 'METADATA_CHANGED' || reason === 'COMP_EXPIRED' || reason === 'NEW_FUND'
                });
            }
        }
    }

    log(`Smart Sync Strategy: ${targets.length} / ${dbMap.size} funds need update.`);
    if (targets.length === 0) {
        log('System already at 100% capacity. No action needed.');
        return;
    }

    const updateFund = db.prepare(`
        UPDATE funds SET
            isin = COALESCE(@isin, isin),
            bloomberg = COALESCE(@bloomberg, bloomberg),
            figi = COALESCE(@figi, figi),
            updated_at = @updated_at,
            min_investment = COALESCE(@min_investment, min_investment),
            aum = @aum,
            vcp = @vcp,
            return_day = @return_day,
            return_month = @return_month,
            return_1y = @return_1y,
            return_year = @return_year,
            return_ytd = @return_ytd,
            tna_day = @tna_day,
            tna_month = @tna_month,
            date_data = @date_data,
            date_ref = @date_ref,
            last_sync = @last_sync,
            last_comp_sync = COALESCE(@last_comp_sync, last_comp_sync),
            full_json_ficha = @full_json_ficha
        WHERE id = @id
    `);

    const insertComp = db.prepare(`
        INSERT INTO composition (
            fund_id, asset_name, percentage, type, region, cantidad, monto, vcp_unitario, especie_id, moneda_id, full_json
        ) VALUES (
            @fund_id, @asset_name, @percentage, @type, @region, @cantidad, @monto, @vcp_unitario, @especie_id, @moneda_id, @full_json
        )
    `);

    const clearComps = db.prepare('DELETE FROM composition WHERE fund_id = ?');

    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        log(`[${i + 1}/${targets.length}] ${t.name} (${t.reason})...`);

        try {
            const detailUrl = `https://api.pub.cafci.org.ar/fondo/${t.fund_id}/clase/${t.id}/ficha`;
            const res = await fetchUrl(detailUrl);

            if (res && res.data) {
                const d = res.data;
                const info = d.info || {};
                const daily = info.diaria || {};
                const actual = daily.actual || {};
                const returns = daily.rendimientos || {};
                const weekly = info.semanal || {};
                const model = d.model || {};

                const fundData = {
                    id: t.id,
                    isin: toVal(model.tickerISIN),
                    bloomberg: toVal(model.tickerBloomberg),
                    figi: toVal(model.tickerFIGI),
                    updated_at: toVal(model.updatedAt),
                    min_investment: toNum(model.inversionMinima),
                    aum: toNum(actual.patrimonio),
                    vcp: toNum(actual.vcpUnitario),
                    return_day: toNum(returns.day ? returns.day.rendimiento : null),
                    return_month: toNum(returns.month ? returns.month.rendimiento : null),
                    return_1y: toNum(returns.oneYear ? returns.oneYear.rendimiento : null),
                    return_year: toNum(returns.year ? returns.year.rendimiento : null),
                    return_ytd: toNum(returns.yearM1 ? returns.yearM1.rendimiento : null),
                    tna_day: toNum(returns.day ? returns.day.tna : null),
                    tna_month: toNum(returns.month ? returns.month.tna : null),
                    date_data: weekly.fechaDatos || null,
                    date_ref: daily.referenceDay || null,
                    last_sync: new Date().toISOString(),
                    last_comp_sync: t.needsComposition ? new Date().toISOString() : null,
                    full_json_ficha: JSON.stringify(d)
                };

                db.transaction(() => {
                    updateFund.run(fundData);

                    // Check if composition date is truly new
                    const local = dbMap.get(t.id);
                    const isNewComposition = weekly.fechaDatos && (!local || local.date_data !== weekly.fechaDatos);

                    if (t.needsComposition && isNewComposition && weekly.carteras && Array.isArray(weekly.carteras)) {
                        log(`   [DATA] New composition date found: ${weekly.fechaDatos}. Updating.`);
                        clearComps.run(t.id);
                        for (const c of weekly.carteras) {
                            insertComp.run({
                                fund_id: t.id,
                                asset_name: toVal(c.nombreActivo),
                                percentage: toNum(c.share),
                                type: toVal(c.tipoActivoPadre || (c.tipoActivo ? c.tipoActivo.nombre : null)),
                                region: toVal(c.region ? c.region.nombre : null),
                                cantidad: toNum(c.cantidad),
                                monto: toNum(c.monto),
                                vcp_unitario: toNum(c.vcpUnitario),
                                especie_id: toVal(c.especieId),
                                moneda_id: toVal(c.monedaId),
                                full_json: JSON.stringify(c)
                            });
                        }
                    } else if (t.needsComposition && !isNewComposition) {
                        log(`   [SKIP] Composition date ${weekly.fechaDatos} unchanged. skipping DB write.`);
                    }
                })();
                log(`   [OK] Sync success.`);
            }
        } catch (err) {
            logError(`   [ERROR] ${err.message}`);
            if (err.message.includes('Rate limit')) {
                await new Promise(r => setTimeout(r, 60000));
            }
        }

        if (i % 5 === 0) await updateProgressFile(db);
        await new Promise(r => setTimeout(r, DELAY_MS));
    }
    await updateProgressFile(db);
    log('Smart Sync complete!');
}

main().catch(logError);
