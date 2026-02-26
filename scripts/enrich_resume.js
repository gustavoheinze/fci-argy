const https = require('https');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = 'database.sqlite';
const DELAY_MS = 1000; // Reducido a 1s para ir más rápido
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Origin': 'https://www.cafci.org.ar',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7'
};

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { req.destroy(); reject(new Error(`Timeout: ${url}`)); }, 10000);
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('Opening database...');
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    const updateFund = db.prepare(`
        UPDATE funds SET
            isin = COALESCE(@isin, isin),
            bloomberg = COALESCE(@bloomberg, bloomberg),
            figi = COALESCE(@figi, figi),
            created_at = COALESCE(@created_at, created_at),
            updated_at = COALESCE(@updated_at, updated_at),
            min_investment = COALESCE(@min_investment, min_investment),
            fee_entry = COALESCE(@fee_entry, fee_entry),
            fee_exit = COALESCE(@fee_exit, fee_exit),
            fee_transfer = COALESCE(@fee_transfer, fee_transfer),
            fee_mgmt_gerente = COALESCE(@fee_mgmt_gerente, fee_mgmt_gerente),
            fee_mgmt_depo = COALESCE(@fee_mgmt_depo, fee_mgmt_depo),
            fee_expenses = COALESCE(@fee_expenses, fee_expenses),
            fee_success_flag = COALESCE(@fee_success_flag, fee_success_flag),
            aum = COALESCE(@aum, aum),
            vcp = COALESCE(@vcp, vcp),
            return_day = COALESCE(@return_day, return_day),
            return_month = COALESCE(@return_month, return_month),
            return_1y = COALESCE(@return_1y, return_1y),
            return_3y = COALESCE(@return_3y, return_3y),
            return_5y = COALESCE(@return_5y, return_5y),
            return_year = COALESCE(@return_year, return_year),
            return_ytd = COALESCE(@return_ytd, return_ytd),
            return_y2 = COALESCE(@return_y2, return_y2),
            return_y3 = COALESCE(@return_y3, return_y3),
            return_y4 = COALESCE(@return_y4, return_y4),
            return_monthyear = COALESCE(@return_monthyear, return_monthyear),
            tna_day = COALESCE(@tna_day, tna_day),
            tna_month = COALESCE(@tna_month, tna_month),
            tna_ytd = COALESCE(@tna_ytd, tna_ytd),
            date_data = COALESCE(@date_data, date_data),
            date_ref = COALESCE(@date_ref, date_ref),
            last_sync = @last_sync,
            full_json_ficha = @full_json_ficha
        WHERE id = @id
    `);

    const insertComp = db.prepare('INSERT OR IGNORE INTO composition (fund_id, asset_name, percentage, type, region, cantidad, monto, vcp_unitario, especie_id, moneda_id, full_json) VALUES (@fund_id, @asset_name, @percentage, @type, @region, @cantidad, @monto, @vcp_unitario, @especie_id, @moneda_id, @full_json)');
    const clearComps = db.prepare('DELETE FROM composition WHERE fund_id = ?');

    const targets = db.prepare('SELECT id, fund_id, name FROM funds WHERE full_json_ficha IS NULL').all();
    console.log(`Funds remaining: ${targets.length}`);

    const startTime = Date.now();
    let errors = 0;

    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        console.log(`[${i + 1}/${targets.length}] ${t.name} (${t.id})...`);

        try {
            const detailUrl = `https://api.pub.cafci.org.ar/fondo/${t.fund_id}/clase/${t.id}/ficha`;
            const res = await fetchUrl(detailUrl);

            if (res && res.data) {
                const d = res.data;
                const info = d.info || {};
                const daily = info.diaria || {};
                const actual = daily.actual || {};
                const returns = daily.rendimientos || {};
                const monthly = info.mensual || {};
                const expenses = monthly.honorariosComisiones || {};
                const weekly = info.semanal || {};
                const model = d.model || {};

                const fundData = {
                    id: t.id,
                    isin: toVal(model.tickerISIN),
                    bloomberg: toVal(model.tickerBloomberg),
                    figi: toVal(model.tickerFIGI),
                    created_at: toVal(model.createdAt),
                    updated_at: toVal(model.updatedAt),
                    min_investment: toNum(expenses.minimoInversion || model.inversionMinima),
                    fee_entry: toNum(expenses.comisionIngreso || model.honorarioIngreso),
                    fee_exit: toNum(expenses.comisionRescate || model.honorarioRescate),
                    fee_transfer: toNum(expenses.comisionTransferencia || model.honorarioTransferencia),
                    fee_mgmt_gerente: toNum(expenses.honorariosAdministracionGerente || model.honorarioAdministracionGerente),
                    fee_mgmt_depo: toNum(expenses.honorariosAdministracionDepositaria || model.honorarioAdministracionDepositaria),
                    fee_expenses: toNum(expenses.gastosGestion || model.gastoOrdinarioGestion),
                    fee_success_flag: toVal(expenses.honorariosExito || model.honorarioExito),

                    aum: toNum(actual.patrimonio),
                    vcp: toNum(actual.vcpUnitario),
                    return_day: toNum(returns.day ? returns.day.rendimiento : null),
                    return_month: toNum(returns.month ? returns.month.rendimiento : null),
                    return_1y: toNum(returns.oneYear ? returns.oneYear.rendimiento : null),
                    return_3y: toNum(returns.threeYears ? returns.threeYears.rendimiento : null),
                    return_5y: toNum(returns.fiveYears ? returns.fiveYears.rendimiento : null),
                    return_year: toNum(returns.year ? returns.year.rendimiento : null),
                    return_ytd: toNum(returns.yearM1 ? returns.yearM1.rendimiento : null),
                    return_y2: toNum(returns.yearM2 ? returns.yearM2.rendimiento : null),
                    return_y3: toNum(returns.yearM3 ? returns.yearM3.rendimiento : null),
                    return_y4: toNum(returns.yearM4 ? returns.yearM4.rendimiento : null),
                    return_monthyear: toNum(returns.monthYear ? returns.monthYear.rendimiento : null),

                    tna_day: toNum(returns.day ? returns.day.tna : null),
                    tna_month: toNum(returns.month ? returns.month.tna : null),
                    tna_ytd: toNum(returns.yearM1 ? returns.yearM1.tna : null),

                    date_data: weekly.fechaDatos || null,
                    date_ref: daily.referenceDay || null,
                    last_sync: new Date().toISOString(),
                    full_json_ficha: JSON.stringify(d)
                };

                db.transaction(() => {
                    updateFund.run(fundData);

                    clearComps.run(t.id);
                    if (weekly.carteras) {
                        weekly.carteras.forEach(c => {
                            insertComp.run({
                                fund_id: t.id,
                                asset_name: c.nombreActivo || '',
                                percentage: parseFloat(c.share) || 0,
                                type: null,
                                region: null,
                                cantidad: null,
                                monto: null,
                                vcp_unitario: null,
                                especie_id: null,
                                moneda_id: null,
                                full_json: JSON.stringify(c)
                            });
                        });
                    }
                })();

                console.log(`   [OK] ${(weekly.carteras || []).length} assets.`);
            } else {
                console.log(`   [SKIP] No data from API`);
            }
        } catch (err) {
            errors++;
            console.log(`   [ERROR] ${err.message}`);
            if (err.message.includes('Rate limit')) {
                console.log('Rate limit detected, waiting 10s...');
                await sleep(10000);
                i--; // Retry
            }
        }

        await sleep(DELAY_MS);

        if ((i + 1) % 100 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const remaining = ((targets.length - i - 1) * (elapsed / (i + 1))) / 60;
            console.log(`\n--- Progress: ${Math.round(((i + 1) / targets.length) * 100)}% | Errors: ${errors} | ETA: ${Math.round(remaining)} min ---\n`);
        }
    }

    db.close();
    console.log(`\n✅ Done! Total errors: ${errors}`);
}

main().catch(console.error);
