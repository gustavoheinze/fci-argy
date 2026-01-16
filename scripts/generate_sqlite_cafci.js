const fs = require('fs');
const https = require('https');
const Database = require('better-sqlite3');

const DB_PATH = 'database.sqlite';
const BATCH_SIZE = 5; // Much lower to avoid timeouts/blocks
const RETRY_DELAY = 2000;
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Origin': 'https://www.cafci.org.ar',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache'
};

// Initialize DB
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS funds (
        id TEXT PRIMARY KEY,
        fund_id TEXT,
        name TEXT,
        fund_name TEXT,
        cnv_code TEXT,
        isin TEXT,
        bloomberg TEXT,
        currency TEXT,
        renta_type TEXT,
        region TEXT,
        benchmark TEXT,
        horizon TEXT,
        duration TEXT,
        manager TEXT,
        manager_cuit TEXT,
        depository TEXT,
        depository_cuit TEXT,
        aum REAL,
        vcp REAL,
        min_investment REAL,
        fees_mgmt REAL,
        fees_depo REAL,
        fee_entry REAL,
        fee_exit REAL,
        return_day REAL,
        return_month REAL,
        return_year REAL,
        return_ytd REAL,
        tna_day REAL,
        date_data TEXT,
        date_ref TEXT,
        escision_status TEXT,
        launch_date TEXT,
        last_sync TEXT,
        full_json TEXT
    );

    CREATE TABLE IF NOT EXISTS composition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fund_id TEXT,
        asset_name TEXT,
        percentage REAL,
        type TEXT,
        region TEXT,
        cantidad REAL,
        monto REAL,
        raw_data TEXT,
        FOREIGN KEY(fund_id) REFERENCES funds(id)
    );

    CREATE INDEX IF NOT EXISTS idx_comp_fund_id ON composition(fund_id);
`);

// Prepare Statements
const insertFund = db.prepare(`
    INSERT OR REPLACE INTO funds (
        id, fund_id, name, fund_name, cnv_code, isin, bloomberg, currency, renta_type,
        region, benchmark, horizon, duration, manager, manager_cuit, depository, depository_cuit,
        aum, vcp, min_investment, fees_mgmt, fees_depo, fee_entry, fee_exit,
        return_day, return_month, return_year, return_ytd, tna_day,
        date_data, date_ref, escision_status, launch_date, last_sync, full_json
    ) VALUES (
        @id, @fund_id, @name, @fund_name, @cnv_code, @isin, @bloomberg, @currency, @renta_type,
        @region, @benchmark, @horizon, @duration, @manager, @manager_cuit, @depository, @depository_cuit,
        @aum, @vcp, @min_investment, @fees_mgmt, @fees_depo, @fee_entry, @fee_exit,
        @return_day, @return_month, @return_year, @return_ytd, @tna_day,
        @date_data, @date_ref, @escision_status, @launch_date, @last_sync, @full_json
    )
`);

const insertComp = db.prepare(`
    INSERT INTO composition (
        fund_id, asset_name, percentage, type, region, cantidad, monto, raw_data
    ) VALUES (
        @fund_id, @asset_name, @percentage, @type, @region, @cantidad, @monto, @raw_data
    )
`);

const clearComps = db.prepare('DELETE FROM composition WHERE fund_id = ?');
const checkExists = db.prepare('SELECT 1 FROM funds WHERE id = ?');

// Helpers
function fetchUrl(url, retries = 3) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            req.destroy();
            reject(new Error(`Timeout: ${url}`));
        }, 15000);

        const req = https.get(url, { headers: HEADERS }, (res) => {
            clearTimeout(timeout);
            if (res.statusCode === 429) {
                if (retries > 0) {
                    setTimeout(() => fetchUrl(url, retries - 1).then(resolve).catch(reject), RETRY_DELAY * 2);
                } else {
                    reject(new Error(`Rate limit exceeded: ${url}`));
                }
                return;
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                if (retries > 0 && res.statusCode >= 500) {
                    setTimeout(() => fetchUrl(url, retries - 1).then(resolve).catch(reject), RETRY_DELAY);
                    return;
                }
                resolve(null);
                return;
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
            if (retries > 0) setTimeout(() => fetchUrl(url, retries - 1).then(resolve).catch(reject), RETRY_DELAY);
            else reject(err);
        });
    });
}

function parseNumber(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(',', '.'));
}

async function processClass(masterClass, masterFund) {
    try {
        if (checkExists.get(String(masterClass.id))) {
            return { skipped: true };
        }

        const detailUrl = `https://api.pub.cafci.org.ar/fondo/${masterFund.id}/clase/${masterClass.id}/ficha`;
        const res = await fetchUrl(detailUrl);

        if (!res || !res.data) {
            return { failed: true, id: masterClass.id, name: masterClass.nombre };
        }

        const d = res.data;
        // Merge master and detail info
        const info = d.info || {};
        const daily = info.diaria || {};
        const actual = daily.actual || {};
        const returns = daily.rendimientos || {};
        const weekly = info.semanal || {};
        const model = d.model || {};

        const fundData = {
            id: String(masterClass.id),
            fund_id: String(masterFund.id),
            name: masterClass.nombre,
            fund_name: masterFund.nombre,
            cnv_code: masterClass.codigoCNV || model.codigoCNV,
            isin: masterClass.tickerISIN || model.tickerISIN,
            bloomberg: masterClass.tickerBloomberg || model.tickerBloomberg,
            currency: model.moneda ? model.moneda.codigoCafci : (masterFund.moneda ? masterFund.moneda.codigoCafci : null),
            renta_type: model.fondo && model.fondo.tipoRenta ? model.fondo.tipoRenta.nombre : null,
            region: model.fondo && model.fondo.region ? model.fondo.region.nombre : null,
            benchmark: model.fondo && model.fondo.benchmark ? model.fondo.benchmark.nombre : null,
            horizon: model.fondo && model.fondo.horizonte ? model.fondo.horizonte.nombre : null,
            duration: model.fondo && model.fondo.duration ? model.fondo.duration.nombre : null,
            manager: model.fondo && model.fondo.gerente ? model.fondo.gerente.nombre : null,
            manager_cuit: model.fondo && model.fondo.gerente ? model.fondo.gerente.cuit : null,
            depository: model.fondo && model.fondo.depositaria ? model.fondo.depositaria.nombre : null,
            depository_cuit: model.fondo && model.fondo.depositaria ? model.fondo.depositaria.cuit : null,
            aum: parseNumber(actual.patrimonio),
            vcp: parseNumber(actual.vcpUnitario),
            min_investment: parseNumber(model.inversionMinima),
            fees_mgmt: parseNumber(model.honorarioAdministracionGerente),
            fees_depo: parseNumber(model.honorarioAdministracionDepositaria),
            fee_entry: parseNumber(model.honorarioIngreso),
            fee_exit: parseNumber(model.honorarioRescate),
            return_day: parseNumber(returns.day ? returns.day.rendimiento : null),
            return_month: parseNumber(returns.month ? returns.month.rendimiento : null),
            return_year: parseNumber(returns.year ? returns.year.rendimiento : null),
            return_ytd: parseNumber(returns.yearM1 ? returns.yearM1.rendimiento : null),
            tna_day: parseNumber(returns.day ? returns.day.tna : null),
            date_data: weekly.fechaDatos || null,
            date_ref: daily.referenceDay || null,
            escision_status: model.fondo ? model.fondo.tipoEscision : null,
            launch_date: model.fondo ? model.fondo.inicio : null,
            last_sync: new Date().toISOString(),
            full_json: JSON.stringify(d)
        };

        const compositions = (weekly.carteras || []).map(c => ({
            fund_id: String(masterClass.id),
            asset_name: c.nombreActivo,
            percentage: parseNumber(c.share),
            type: c.tipoActivoPadre || null,
            region: null,
            cantidad: parseNumber(c.cantidad),
            monto: parseNumber(c.monto),
            raw_data: JSON.stringify(c)
        }));

        // Transaction
        db.transaction(() => {
            insertFund.run(fundData);
            clearComps.run(fundData.id);
            for (const c of compositions) insertComp.run(c);
        })();

        return { success: true };

    } catch (err) {
        return { error: err.message, id: masterClass.id };
    }
}

async function main() {
    console.log('Fetching Master List...');
    const listRes = await fetchUrl('https://api.pub.cafci.org.ar/fondo?limit=0&include=entidad;depositaria,entidad;gerente,tipoRenta,region,benchmark,horizonte,duration,tipo_fondo,clase_fondo');

    if (!listRes || !listRes.data) {
        console.error('Failed to load master list');
        return;
    }

    const masterFunds = listRes.data;
    console.log(`Found ${masterFunds.length} funds. Generating tasks...`);

    let tasks = [];
    for (const fund of masterFunds) {
        if (!fund.clase_fondos) continue;
        for (const clase of fund.clase_fondos) {
            tasks.push({ clase, fund });
        }
    }

    console.log(`Total classes to process: ${tasks.length}`);

    // Batch process
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const chunk = tasks.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(tasks.length / BATCH_SIZE);

        console.log(`Processing batch ${batchNum}/${totalBatches} (${i} - ${i + chunk.length})...`);

        const results = await Promise.all(chunk.map(t => processClass(t.clase, t.fund)));

        const success = results.filter(r => r && r.success).length;
        const skipped = results.filter(r => r && r.skipped).length;
        const failed = results.filter(r => r && (r.failed || r.error)).length;

        console.log(`   Batch Result: ${success} saved, ${skipped} skipped, ${failed} failed.`);

        if (failed > 0) {
            const errors = results.filter(r => r && r.error).map(r => r.error).slice(0, 3);
            if (errors.length > 0) console.log(`   Sample errors: ${errors.join(', ')}`);
        }

        // Small delay to be nice
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('Done!');
}

main().catch(console.error);
