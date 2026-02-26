const https = require('https');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = 'database.sqlite';
const DELAY_MS = 3000;
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Origin': 'https://www.cafci.org.ar',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7'
};

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { req.destroy(); reject(new Error(`Timeout: ${url}`)); }, 15000);
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
            mode: 'OPTIMIZED_SYNC'
        };

        const filePath = path.join(__dirname, '..', 'public', 'sync_status.json');
        fs.writeFileSync(filePath, JSON.stringify(status, null, 2));
    } catch (e) {
        console.error('Error updating progress file:', e.message);
    }
}

async function main() {
    console.log('Opening database...');
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Add tracking columns if they don't exist
    try {
        db.exec("ALTER TABLE funds ADD COLUMN last_comp_sync TEXT;");
    } catch (e) { }

    console.log('Preparing statements...');
    const updateFund = db.prepare(`
        UPDATE funds SET
            isin = COALESCE(@isin, isin),
            bloomberg = COALESCE(@bloomberg, bloomberg),
            figi = COALESCE(@figi, figi),
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

    // SMART SELECTION LOGIC
    // 1. Never synced
    // 2. Performance older than today
    // 3. Composition older than 7 days
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const targets = db.prepare(`
        SELECT id, fund_id, name, last_sync, last_comp_sync, full_json_ficha 
        FROM funds 
        WHERE last_sync IS NULL 
           OR substr(last_sync, 1, 10) < ?
           OR last_comp_sync < ?
    `).all(today, sevenDaysAgo);

    console.log(`Smart Sync: Found ${targets.length} funds needing update.`);

    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const needsComposition = !t.last_comp_sync || t.last_comp_sync < sevenDaysAgo;

        console.log(`[${i + 1}/${targets.length}] ${t.name} (Comp: ${needsComposition ? 'YES' : 'SKIP'})...`);

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
                    last_comp_sync: needsComposition ? new Date().toISOString() : null,
                    full_json_ficha: JSON.stringify(d)
                };

                db.transaction(() => {
                    updateFund.run(fundData);
                    if (needsComposition && weekly.carteras && Array.isArray(weekly.carteras)) {
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
                    }
                })();
                console.log(`   [OK] Perf updated. ${needsComposition ? 'Composition updated.' : 'Composition skipped.'}`);
            }
        } catch (err) {
            console.error(`   [ERROR] ${err.message}`);
            if (err.message.includes('Rate limit')) {
                await new Promise(r => setTimeout(r, 60000));
            }
        }

        if (i % 5 === 0) await updateProgressFile(db);
        await new Promise(r => setTimeout(r, DELAY_MS));
    }
    await updateProgressFile(db);
    console.log('Smart Sync complete!');
}

main().catch(console.error);
