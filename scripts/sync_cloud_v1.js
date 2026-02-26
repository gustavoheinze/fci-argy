const https = require('https');
const { Database } = require('@sqlitecloud/drivers');
const fs = require('fs');

// Configuration from environment variables
const CONNECTION_STRING = process.env.SQLITECLOUD_CONNECTION_STRING;
const MASTER_JSON = 'cafci_master_full.json';
const DELAY_MS = 5000;
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

async function main() {
    if (!CONNECTION_STRING) {
        console.error('ERROR: SQLITECLOUD_CONNECTION_STRING is not set.');
        process.exit(1);
    }

    console.log('Connecting to SQLite Cloud...');
    const db = new Database(CONNECTION_STRING);

    console.log('Fetching latest master list from API...');
    const masterUrl = 'https://api.pub.cafci.org.ar/fondo?estado=1&include=entidad;depositaria,entidad;gerente,tipoRenta,region,benchmark,horizonte,duration,tipo_fondo,clase_fondo&limit=0&order=clase_fondos.nombre';
    const masterData = await fetchUrl(masterUrl);

    if (!masterData || !masterData.data) {
        console.error('Could not fetch master list from API.');
        return;
    }

    console.log(`Master list fetched: ${masterData.data.length} funds.`);
    const localMaster = masterData.data;

    console.log('Reading current status from database...');
    const dbFunds = await db.sql('SELECT id, updated_at, last_sync, last_comp_sync, date_data FROM funds');
    const dbMap = new Map(dbFunds.map(f => [String(f.id), f]));

    const today = new Date().toLocaleDateString('en-CA');
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

    console.log(`Sync Strategy: ${targets.length} / ${dbMap.size} funds need update.`);
    if (targets.length === 0) {
        console.log('All funds up to date.');
        return;
    }

    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        process.stdout.write(`[${i + 1}/${targets.length}] ${t.name}... `);

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

                // Update fund data
                const fundUpdateSql = `
                    UPDATE funds SET
                        isin = COALESCE(?, isin),
                        bloomberg = COALESCE(?, bloomberg),
                        figi = COALESCE(?, figi),
                        updated_at = ?,
                        min_investment = COALESCE(?, min_investment),
                        aum = ?,
                        vcp = ?,
                        return_day = ?,
                        return_month = ?,
                        return_1y = ?,
                        return_year = ?,
                        return_ytd = ?,
                        tna_day = ?,
                        tna_month = ?,
                        date_data = ?,
                        date_ref = ?,
                        last_sync = ?,
                        last_comp_sync = COALESCE(?, last_comp_sync),
                        full_json_ficha = ?
                    WHERE id = ?
                `;

                const fundParams = [
                    toVal(model.tickerISIN),
                    toVal(model.tickerBloomberg),
                    toVal(model.tickerFIGI),
                    toVal(model.updatedAt),
                    toNum(model.inversionMinima),
                    toNum(actual.patrimonio),
                    toNum(actual.vcpUnitario),
                    toNum(returns.day ? returns.day.rendimiento : null),
                    toNum(returns.month ? returns.month.rendimiento : null),
                    toNum(returns.oneYear ? returns.oneYear.rendimiento : null),
                    toNum(returns.year ? returns.year.rendimiento : null),
                    toNum(returns.yearM1 ? returns.yearM1.rendimiento : null),
                    toNum(returns.day ? returns.day.tna : null),
                    toNum(returns.month ? returns.month.tna : null),
                    weekly.fechaDatos || null,
                    daily.referenceDay || null,
                    new Date().toISOString(),
                    t.needsComposition ? new Date().toISOString() : null,
                    JSON.stringify(d),
                    t.id
                ];

                await db.sql(fundUpdateSql, ...fundParams);

                // Update composition if needed
                const local = dbMap.get(t.id);
                const isNewComposition = weekly.fechaDatos && (!local || local.date_data !== weekly.fechaDatos);

                if (t.needsComposition && isNewComposition && weekly.carteras) {
                    await db.sql('DELETE FROM composition WHERE fund_id = ?', t.id);
                    for (const c of weekly.carteras) {
                        const compSql = `
                            INSERT INTO composition (
                                fund_id, asset_name, percentage, type, region, cantidad, monto, vcp_unitario, especie_id, moneda_id, full_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        await db.sql(compSql,
                            t.id, toVal(c.nombreActivo), toNum(c.share),
                            toVal(c.tipoActivoPadre || (c.tipoActivo ? c.tipoActivo.nombre : null)),
                            toVal(c.region ? c.region.nombre : null),
                            toNum(c.cantidad), toNum(c.monto), toNum(c.vcpUnitario),
                            toVal(c.especieId), toVal(c.monedaId), JSON.stringify(c)
                        );
                    }
                    process.stdout.write('[OK - Updated Composition]\n');
                } else {
                    process.stdout.write('[OK - Data Only]\n');
                }
            } else {
                process.stdout.write('[FAILED - Empty Response]\n');
            }
        } catch (err) {
            console.log(`\n[ERROR] ${t.id}: ${err.message}`);
            if (err.message.includes('Rate limit')) {
                console.log('Cooling down for 60s...');
                await new Promise(r => setTimeout(r, 60000));
            }
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log('\nCloud Sync complete!');
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
