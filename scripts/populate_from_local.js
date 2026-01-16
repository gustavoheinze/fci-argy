const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = 'database.sqlite';
const LOCAL_DATA_PATH = 'fci_enriched.json';

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Note: Tables should already exist from previous script, but we ensure here too
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
`);

const insertFund = db.prepare(`
    INSERT OR REPLACE INTO funds (
        id, fund_id, name, fund_name, cnv_code, isin, bloomberg, currency, renta_type,
        region, benchmark, horizon, duration, manager, manager_cuit, depository, depository_cuit,
        aum, vcp, min_investment, fees_mgmt, fees_depo, fee_entry, fee_exit,
        return_day, return_month, return_year, return_ytd, tna_day,
        date_data, date_ref, last_sync, full_json
    ) VALUES (
        @id, @fund_id, @name, @fund_name, @cnv_code, @isin, @bloomberg, @currency, @renta_type,
        @region, @benchmark, @horizon, @duration, @manager, @manager_cuit, @depository, @depository_cuit,
        @aum, @vcp, @min_investment, @fees_mgmt, @fees_depo, @fee_entry, @fee_exit,
        @return_day, @return_month, @return_year, @return_ytd, @tna_day,
        @date_data, @date_ref, @last_sync, @full_json
    )
`);

const insertComp = db.prepare(`
    INSERT INTO composition (
        fund_id, asset_name, percentage, type, raw_data
    ) VALUES (
        @fund_id, @asset_name, @percentage, @type, @raw_data
    )
`);

const clearComps = db.prepare('DELETE FROM composition WHERE fund_id = ?');

function parsePct(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace('%', '').replace(',', '.'));
}

async function main() {
    console.log('Loading local data...');
    const raw = fs.readFileSync(LOCAL_DATA_PATH, 'utf8');
    const { data } = JSON.parse(raw);
    console.log(`Found ${data.length} records in local file.`);

    const transaction = db.transaction((funds) => {
        for (const f of funds) {
            const fundId = String(f.claseId || f.id);
            const parentId = String(f.fondoId || f.fondoPrincipal?.id);

            const fundData = {
                id: fundId,
                fund_id: parentId,
                name: f.clase || f.nombre,
                fund_name: f.fondoPrincipal?.nombre,
                cnv_code: f.codigoCNV,
                isin: f.tickerISIN,
                bloomberg: f.tickerBloomberg,
                currency: String(f.monedaId || (f.fondoPrincipal?.monedaId)),
                renta_type: String(f.tipoRentaId || (f.fondoPrincipal?.tipoRentaId)),
                region: null,
                benchmark: null,
                horizon: null,
                duration: null,
                manager: null,
                manager_cuit: null,
                depository: null,
                depository_cuit: null,
                aum: f.patrimonio || 0,
                vcp: 0,
                min_investment: f.inversionMinima || 0,
                fees_mgmt: 0,
                fees_depo: 0,
                fee_entry: 0,
                fee_exit: 0,
                return_day: 0,
                return_month: 0,
                return_year: 0,
                return_ytd: 0,
                tna_day: 0,
                date_data: f.fechaDatos,
                date_ref: null,
                last_sync: new Date().toISOString(),
                full_json: JSON.stringify(f)
            };

            insertFund.run(fundData);
            clearComps.run(fundId);

            if (f.composicion && Array.isArray(f.composicion)) {
                for (const c of f.composicion) {
                    insertComp.run({
                        fund_id: fundId,
                        asset_name: c.activo,
                        percentage: parsePct(c.porcentaje),
                        type: c.tipo,
                        raw_data: JSON.stringify(c)
                    });
                }
            }
        }
    });

    transaction(data);
    console.log('Done populating from local file!');
}

main().catch(console.error);
