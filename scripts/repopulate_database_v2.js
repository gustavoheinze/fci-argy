const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = 'database.sqlite';
const MASTER_JSON = 'cafci_master_full.json';

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
    DROP TABLE IF EXISTS composition;
    DROP TABLE IF EXISTS funds;

    CREATE TABLE funds (
        id TEXT PRIMARY KEY,
        fund_id TEXT,
        name TEXT,
        fund_name TEXT,
        cnv_code TEXT,
        isin TEXT,
        bloomberg TEXT,
        currency TEXT,
        currency_id TEXT,
        renta_type TEXT,
        renta_type_id TEXT,
        region TEXT,
        region_id TEXT,
        benchmark TEXT,
        benchmark_id TEXT,
        horizon TEXT,
        horizon_id TEXT,
        duration TEXT,
        duration_id TEXT,
        manager TEXT,
        manager_id TEXT,
        manager_cuit TEXT,
        depository TEXT,
        depository_id TEXT,
        depository_cuit TEXT,
        tipo_fondo TEXT,
        tipo_fondo_id TEXT,
        aum REAL,
        vcp REAL,
        min_investment REAL,
        fees_mgmt REAL,
        fees_depo REAL,
        fee_entry REAL,
        fee_exit REAL,
        liquidez TEXT,
        escision_status TEXT,
        launch_date TEXT,
        return_day REAL,
        return_month REAL,
        return_year REAL,
        return_ytd REAL,
        tna_day REAL,
        date_data TEXT,
        date_ref TEXT,
        last_sync TEXT,
        full_json_master TEXT,
        full_json_ficha TEXT
    );

    CREATE TABLE composition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fund_id TEXT,
        asset_name TEXT,
        percentage REAL,
        type TEXT,
        region TEXT,
        cantidad REAL,
        monto REAL,
        vcp_unitario REAL,
        especie_id TEXT,
        moneda_id TEXT,
        full_json TEXT,
        FOREIGN KEY(fund_id) REFERENCES funds(id)
    );
    CREATE INDEX idx_comp_fund_id ON composition(fund_id);
`);

const insertFund = db.prepare(`
    INSERT INTO funds (
        id, fund_id, name, fund_name, cnv_code, isin, bloomberg, 
        currency, currency_id, renta_type, renta_type_id, 
        region, region_id, benchmark, benchmark_id, 
        horizon, horizon_id, duration, duration_id, 
        manager, manager_id, manager_cuit, 
        depository, depository_id, depository_cuit,
        tipo_fondo, tipo_fondo_id,
        min_investment, fees_mgmt, fees_depo, fee_entry, fee_exit,
        liquidez, launch_date, last_sync, full_json_master
    ) VALUES (
        @id, @fund_id, @name, @fund_name, @cnv_code, @isin, @bloomberg, 
        @currency, @currency_id, @renta_type, @renta_type_id, 
        @region, @region_id, @benchmark, @benchmark_id, 
        @horizon, @horizon_id, @duration, @duration_id, 
        @manager, @manager_id, @manager_cuit, 
        @depository, @depository_id, @depository_cuit,
        @tipo_fondo, @tipo_fondo_id,
        @min_investment, @fees_mgmt, @fees_depo, @fee_entry, @fee_exit,
        @liquidez, @launch_date, @last_sync, @full_json_master
    )
`);

function toVal(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'object') return JSON.stringify(val);
    if (typeof val === 'string' || typeof val === 'number') return val;
    return String(val);
}

function toNum(val) {
    if (val === undefined || val === null || val === '') return null;
    const n = parseFloat(String(val).replace(',', '.'));
    return isNaN(n) ? null : n;
}

async function main() {
    console.log('Loading master list...');
    const data = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf8'));
    const funds = data.data;

    let count = 0;
    for (const fund of funds) {
        if (!fund.clase_fondos) continue;
        for (const cl of fund.clase_fondos) {
            const fundData = {
                id: toVal(cl.id),
                fund_id: toVal(fund.id),
                name: toVal(cl.nombre),
                fund_name: toVal(fund.nombre),
                cnv_code: toVal(cl.codigoCNV || fund.codigoCNV),
                isin: toVal(cl.tickerISIN),
                bloomberg: toVal(cl.tickerBloomberg),
                currency: toVal(fund.moneda ? fund.moneda.nombre : null),
                currency_id: toVal(fund.monedaId),
                renta_type: toVal(fund.tipoRenta ? fund.tipoRenta.nombre : null),
                renta_type_id: toVal(fund.tipoRentaId),
                region: toVal(fund.region ? fund.region.nombre : null),
                region_id: toVal(fund.regionId),
                benchmark: toVal(fund.benchmark ? fund.benchmark.nombre : null),
                benchmark_id: toVal(fund.benchmarkId),
                horizon: toVal(fund.horizonte ? fund.horizonte.nombre : null),
                horizon_id: toVal(fund.horizonteId),
                duration: toVal(fund.duration ? fund.duration.nombre : null),
                duration_id: toVal(fund.durationId),
                manager: toVal(fund.gerente ? fund.gerente.nombre : null),
                manager_id: toVal(fund.gerenteId),
                manager_cuit: toVal(fund.gerente ? fund.gerente.cuit : null),
                depository: toVal(fund.depositaria ? fund.depositaria.nombre : null),
                depository_id: toVal(fund.depositariaId),
                depository_cuit: toVal(fund.depositaria ? fund.depositaria.cuit : null),
                tipo_fondo: toVal(fund.tipoFondo ? fund.tipoFondo.nombre : null),
                tipo_fondo_id: toVal(fund.tipoFondoId),
                min_investment: toNum(cl.inversionMinima),
                fees_mgmt: toNum(cl.honorarioAdministracionGerente),
                fees_depo: toNum(cl.honorarioAdministracionDepositaria),
                fee_entry: toNum(cl.honorarioIngreso),
                fee_exit: toNum(cl.honorarioRescate),
                liquidez: toVal(cl.liquidez),
                launch_date: toVal(cl.inicio || fund.inicio),
                last_sync: new Date().toISOString(),
                full_json_master: JSON.stringify(fund)
            };
            try {
                insertFund.run(fundData);
                count++;
            } catch (e) {
                console.error(`Failed to insert fund ${cl.id}:`, e.message);
                process.exit(1);
            }
        }
    }
    console.log(`Success! Initialized ${count} fund classes.`);
}

main().catch(console.error);
