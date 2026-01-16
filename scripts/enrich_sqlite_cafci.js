const https = require('https');
const Database = require('better-sqlite3');

const DB_PATH = 'database.sqlite';
const DELAY_MS = 2000;
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Origin': 'https://www.cafci.org.ar',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7'
};

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const updateFund = db.prepare(`
    UPDATE funds SET
        isin = COALESCE(@isin, isin),
        bloomberg = COALESCE(@bloomberg, bloomberg),
        currency = COALESCE(@currency, currency),
        currency_id = COALESCE(@currency_id, currency_id),
        renta_type = COALESCE(@renta_type, renta_type),
        renta_type_id = COALESCE(@renta_type_id, renta_type_id),
        region = COALESCE(@region, region),
        region_id = COALESCE(@region_id, region_id),
        benchmark = COALESCE(@benchmark, benchmark),
        benchmark_id = COALESCE(@benchmark_id, benchmark_id),
        horizon = COALESCE(@horizon, horizon),
        horizon_id = COALESCE(@horizon_id, horizon_id),
        duration = COALESCE(@duration, duration),
        duration_id = COALESCE(@duration_id, duration_id),
        manager = COALESCE(@manager, manager),
        manager_id = COALESCE(@manager_id, manager_id),
        manager_cuit = COALESCE(@manager_cuit, manager_cuit),
        depository = COALESCE(@depository, depository),
        depository_id = COALESCE(@depository_id, depository_id),
        depository_cuit = COALESCE(@depository_cuit, depository_cuit),
        aum = @aum,
        vcp = @vcp,
        min_investment = COALESCE(@min_investment, min_investment),
        fees_mgmt = COALESCE(@fees_mgmt, fees_mgmt),
        fees_depo = COALESCE(@fees_depo, fees_depo),
        fee_entry = COALESCE(@fee_entry, fee_entry),
        fee_exit = COALESCE(@fee_exit, fee_exit),
        return_day = @return_day,
        return_month = @return_month,
        return_year = @return_year,
        return_ytd = @return_ytd,
        tna_day = @tna_day,
        date_data = @date_data,
        date_ref = @date_ref,
        escision_status = COALESCE(@escision_status, escision_status),
        launch_date = COALESCE(@launch_date, launch_date),
        last_sync = @last_sync,
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

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            req.destroy();
            reject(new Error(`Timeout: ${url}`));
        }, 15000);

        const req = https.get(url, { headers: HEADERS }, (res) => {
            clearTimeout(timeout);
            if (res.statusCode === 429) {
                return reject(new Error('Rate limit'));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return resolve(null);
            }

            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(null);
                }
            });
        });
        req.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

function toVal(val) {
    if (val === undefined || val === null) return null;
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
    const targets = db.prepare('SELECT id, fund_id, name FROM funds WHERE full_json_ficha IS NULL').all();
    console.log(`Starting enrichment for ${targets.length} funds...`);

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
                const weekly = info.semanal || {};
                const model = d.model || {};

                const fundData = {
                    id: t.id,
                    isin: toVal(model.tickerISIN),
                    bloomberg: toVal(model.tickerBloomberg),
                    currency: toVal(model.moneda ? model.moneda.nombre : (model.fondo && model.fondo.moneda ? model.fondo.moneda.nombre : null)),
                    currency_id: toVal(model.monedaId || (model.fondo ? model.fondo.monedaId : null)),
                    renta_type: toVal(model.fondo && model.fondo.tipoRenta ? model.fondo.tipoRenta.nombre : null),
                    renta_type_id: toVal(model.fondo ? model.fondo.tipoRentaId : null),
                    region: toVal(model.fondo && model.fondo.region ? model.fondo.region.nombre : null),
                    region_id: toVal(model.fondo ? model.fondo.regionId : null),
                    benchmark: toVal(model.fondo && model.fondo.benchmark ? model.fondo.benchmark.nombre : null),
                    benchmark_id: toVal(model.fondo ? model.fondo.benchmarkId : null),
                    horizon: toVal(model.fondo && model.fondo.horizonte ? model.fondo.horizonte.nombre : null),
                    horizon_id: toVal(model.fondo ? model.fondo.horizonteId : null),
                    duration: toVal(model.fondo && model.fondo.duration ? model.fondo.duration.nombre : null),
                    duration_id: toVal(model.fondo ? model.fondo.durationId : null),
                    manager: toVal(model.fondo && model.fondo.gerente ? model.fondo.gerente.nombre : null),
                    manager_id: toVal(model.fondo ? model.fondo.gerenteId : null),
                    manager_cuit: toVal(model.fondo && model.fondo.gerente ? model.fondo.gerente.cuit : null),
                    depository: toVal(model.fondo && model.fondo.depositaria ? model.fondo.depositaria.nombre : null),
                    depository_id: toVal(model.fondo ? model.fondo.depositariaId : null),
                    depository_cuit: toVal(model.fondo && model.fondo.depositaria ? model.fondo.depositaria.cuit : null),
                    aum: toNum(actual.patrimonio),
                    vcp: toNum(actual.vcpUnitario),
                    min_investment: toNum(model.inversionMinima),
                    fees_mgmt: toNum(model.honorarioAdministracionGerente),
                    fees_depo: toNum(model.honorarioAdministracionDepositaria),
                    fee_entry: toNum(model.honorarioIngreso),
                    fee_exit: toNum(model.honorarioRescate),
                    return_day: toNum(returns.day ? returns.day.rendimiento : null),
                    return_month: toNum(returns.month ? returns.month.rendimiento : null),
                    return_year: toNum(returns.year ? returns.year.rendimiento : null),
                    return_ytd: toNum(returns.yearM1 ? returns.yearM1.rendimiento : null),
                    tna_day: toNum(returns.day ? returns.day.tna : null),
                    date_data: weekly.fechaDatos || null,
                    date_ref: daily.referenceDay || null,
                    escision_status: toVal(model.fondo ? model.fondo.tipoEscision : null),
                    launch_date: toVal(model.fondo ? model.fondo.inicio : null),
                    last_sync: new Date().toISOString(),
                    full_json_ficha: JSON.stringify(d)
                };

                try {
                    db.transaction(() => {
                        updateFund.run(fundData);
                        if (weekly.carteras && Array.isArray(weekly.carteras)) {
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
                } catch (sqlErr) {
                    console.error(`   SQL Error for ${t.id}: ${sqlErr.message}`);
                    process.exit(1);
                }
                console.log(`   OK. Comps: ${weekly.carteras ? weekly.carteras.length : 0}`);
            } else {
                console.log(`   Empty/Missing data.`);
                db.prepare("UPDATE funds SET full_json_ficha = '{}', last_sync = ? WHERE id = ?").run(new Date().toISOString(), t.id);
            }

        } catch (err) {
            console.error(`   Error: ${err.message}`);
            if (err.message.includes('Rate limit')) {
                console.log('Backing off for 60s...');
                await new Promise(r => setTimeout(r, 60000));
            }
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log('Enrichment complete!');
}

main().catch(console.error);
