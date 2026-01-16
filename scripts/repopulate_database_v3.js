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
        -- Identifiers
        id TEXT PRIMARY KEY,
        fund_id TEXT,
        name TEXT,
        fund_name TEXT,
        cnv_code TEXT,
        isin TEXT,
        bloomberg TEXT,
        figi TEXT,
        
        -- Master Metadata (Clase)
        created_at TEXT,
        updated_at TEXT,
        min_investment REAL,
        fee_entry REAL,
        fee_exit REAL,
        fee_transfer REAL,
        fee_mgmt_gerente REAL,
        fee_mgmt_depo REAL,
        fee_expenses REAL,
        fee_success_flag TEXT,
        currency_id TEXT,
        currency_name TEXT,
        class_type_id TEXT,
        
        -- Flags (Clase)
        flag_rg384 INTEGER,
        flag_liquidez INTEGER,
        flag_suscripcion INTEGER,
        flag_reexpresa INTEGER,
        flag_nulo INTEGER,
        flag_repatriacion INTEGER,
        flag_L27743 INTEGER,
        flag_recibe_suscripcion INTEGER,

        -- Fund Specifics (Fondo)
        fondo_clasificacion_vieja TEXT,
        fondo_region_vieja TEXT,
        fondo_horizonte_vieja TEXT,
        escision_status TEXT,
        objetivo TEXT,
        resolucion_particular TEXT,
        fecha_resolucion_particular TEXT,
        fecha_inscripcion_rpc TEXT,
        estado TEXT,
        etapa_liquidacion TEXT,
        tipo_renta_id TEXT,
        tipo_renta_name TEXT,
        region_id TEXT,
        region_name TEXT,
        duration_id TEXT,
        duration_name TEXT,
        benchmark_id TEXT,
        benchmark_name TEXT,
        mm_indice INTEGER,
        mm_puro INTEGER,
        valuacion TEXT,
        flag_ci49 INTEGER,
        dias_liquidacion TEXT,
        flag_indice INTEGER,
        horizonte_id TEXT,
        horizonte_name TEXT,
        manager_id TEXT,
        manager_name TEXT,
        manager_cuit TEXT,
        depository_id TEXT,
        depository_name TEXT,
        depository_cuit TEXT,
        inicio_date TEXT,
        tipo_fondo_id TEXT,
        tipo_fondo_name TEXT,
        tipo_dinero TEXT,
        flag_excento_tasa INTEGER,
        flag_d569 INTEGER,
        flag_calificado INTEGER,
        fecha_cierre_balances TEXT,

        -- Performance (populated by enrichment)
        aum REAL,
        vcp REAL,
        return_day REAL,
        return_month REAL,
        return_1y REAL,
        return_3y REAL,
        return_5y REAL,
        return_year REAL,
        return_ytd REAL,
        return_y2 REAL,
        return_y3 REAL,
        return_y4 REAL,
        return_monthyear REAL,
        tna_day REAL,
        tna_month REAL,
        tna_ytd REAL,
        
        -- Sync Metadata
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
        id, fund_id, name, fund_name, cnv_code, isin, bloomberg, figi,
        created_at, updated_at, min_investment, fee_entry, fee_exit, fee_transfer,
        fee_mgmt_gerente, fee_mgmt_depo, fee_expenses, fee_success_flag,
        currency_id, currency_name, class_type_id,
        flag_rg384, flag_liquidez, flag_suscripcion, flag_reexpresa, flag_nulo,
        flag_repatriacion, flag_L27743, flag_recibe_suscripcion,
        fondo_clasificacion_vieja, fondo_region_vieja, fondo_horizonte_vieja,
        escision_status, objetivo, resolucion_particular, fecha_resolucion_particular,
        fecha_inscripcion_rpc, estado, etapa_liquidacion,
        tipo_renta_id, tipo_renta_name, region_id, region_name,
        duration_id, duration_name, benchmark_id, benchmark_name,
        mm_indice, mm_puro, valuacion, flag_ci49, dias_liquidacion, flag_indice,
        horizonte_id, horizonte_name, manager_id, manager_name, manager_cuit,
        depository_id, depository_name, depository_cuit,
        inicio_date, tipo_fondo_id, tipo_fondo_name, tipo_dinero,
        flag_excento_tasa, flag_d569, flag_calificado, fecha_cierre_balances,
        last_sync, full_json_master
    ) VALUES (
        @id, @fund_id, @name, @fund_name, @cnv_code, @isin, @bloomberg, @figi,
        @created_at, @updated_at, @min_investment, @fee_entry, @fee_exit, @fee_transfer,
        @fee_mgmt_gerente, @fee_mgmt_depo, @fee_expenses, @fee_success_flag,
        @currency_id, @currency_name, @class_type_id,
        @flag_rg384, @flag_liquidez, @flag_suscripcion, @flag_reexpresa, @flag_nulo,
        @flag_repatriacion, @flag_L27743, @flag_recibe_suscripcion,
        @fondo_clasificacion_vieja, @fondo_region_vieja, @fondo_horizonte_vieja,
        @escision_status, @objetivo, @resolucion_particular, @fecha_resolucion_particular,
        @fecha_inscripcion_rpc, @estado, @etapa_liquidacion,
        @tipo_renta_id, @tipo_renta_name, @region_id, @region_name,
        @duration_id, @duration_name, @benchmark_id, @benchmark_name,
        @mm_indice, @mm_puro, @valuacion, @flag_ci49, @dias_liquidacion, @flag_indice,
        @horizonte_id, @horizonte_name, @manager_id, @manager_name, @manager_cuit,
        @depository_id, @depository_name, @depository_cuit,
        @inicio_date, @tipo_fondo_id, @tipo_fondo_name, @tipo_dinero,
        @flag_excento_tasa, @flag_d569, @flag_calificado, @fecha_cierre_balances,
        @last_sync, @full_json_master
    )
`);

function toVal(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'object') return JSON.stringify(val);
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
    for (const f of funds) {
        if (!f.clase_fondos) continue;
        for (const cl of f.clase_fondos) {
            const fundData = {
                id: toVal(cl.id),
                fund_id: toVal(f.id),
                name: toVal(cl.nombre),
                fund_name: toVal(f.nombre),
                cnv_code: toVal(cl.codigoCNV || f.codigoCNV),
                isin: toVal(cl.tickerISIN),
                bloomberg: toVal(cl.tickerBloomberg),
                figi: toVal(cl.tickerFIGI),
                created_at: toVal(cl.createdAt),
                updated_at: toVal(cl.updatedAt),
                min_investment: toNum(cl.inversionMinima),
                fee_entry: toNum(cl.honorarioIngreso),
                fee_exit: toNum(cl.honorarioRescate),
                fee_transfer: toNum(cl.honorarioTransferencia),
                fee_mgmt_gerente: toNum(cl.honorarioAdministracionGerente),
                fee_mgmt_depo: toNum(cl.honorarioAdministracionDepositaria),
                fee_expenses: toNum(cl.gastoOrdinarioGestion),
                fee_success_flag: toVal(cl.honorarioExito),
                currency_id: toVal(cl.monedaId || f.monedaId),
                currency_name: toVal(f.moneda ? f.moneda.nombre : null),
                class_type_id: toVal(cl.tipoClaseId),
                flag_rg384: toVal(cl.rg384),
                flag_liquidez: toVal(cl.liquidez),
                flag_suscripcion: toVal(cl.suscripcion),
                flag_reexpresa: toVal(cl.reexpresa),
                flag_nulo: toVal(cl.nulo),
                flag_repatriacion: toVal(cl.repatriacion),
                flag_L27743: toVal(cl.L27743),
                flag_recibe_suscripcion: toVal(cl.recibeSuscripcion),
                fondo_clasificacion_vieja: toVal(f.clasificacionVieja),
                fondo_region_vieja: toVal(f.regionVieja),
                fondo_horizonte_vieja: toVal(f.horizonteViejo),
                escision_status: toVal(f.tipoEscision),
                objetivo: toVal(f.objetivo),
                resolucion_particular: toVal(f.resolucionParticular),
                fecha_resolucion_particular: toVal(f.fechaResolucionParticular),
                fecha_inscripcion_rpc: toVal(f.fechaInscripcionRPC),
                estado: toVal(f.estado),
                etapa_liquidacion: toVal(f.etapaLiquidacion),
                tipo_renta_id: toVal(f.tipoRentaId),
                tipo_renta_name: toVal(f.tipoRenta ? f.tipoRenta.nombre : null),
                region_id: toVal(f.regionId),
                region_name: toVal(f.region ? f.region.nombre : null),
                duration_id: toVal(f.durationId),
                duration_name: toVal(f.duration ? f.duration.nombre : null),
                benchmark_id: toVal(f.benchmarkId),
                benchmark_name: toVal(f.benchmark ? f.benchmark.nombre : null),
                mm_indice: toVal(f.mmIndice),
                mm_puro: toVal(f.mmPuro),
                valuacion: toVal(f.valuacion),
                flag_ci49: toVal(f.ci49),
                dias_liquidacion: toVal(f.diasLiquidacion),
                flag_indice: toVal(f.indice),
                horizonte_id: toVal(f.horizonteId),
                horizonte_name: toVal(f.horizonte ? f.horizonte.nombre : null),
                manager_id: toVal(f.sociedadGerenteId),
                manager_name: toVal(f.gerente ? f.gerente.nombre : null),
                manager_cuit: toVal(f.gerente ? f.gerente.cuit : null),
                depository_id: toVal(f.sociedadDepositariaId),
                depository_name: toVal(f.depositaria ? f.depositaria.nombre : null),
                depository_cuit: toVal(f.depositaria ? f.depositaria.cuit : null),
                inicio_date: toVal(f.inicio),
                tipo_fondo_id: toVal(f.tipoFondoId),
                tipo_fondo_name: toVal(f.tipoFondo ? f.tipoFondo.nombre : null),
                tipo_dinero: toVal(f.tipoDinero),
                flag_excento_tasa: toVal(f.excentoTasa),
                flag_d569: toVal(f.d569),
                flag_calificado: toVal(f.calificado),
                fecha_cierre_balances: toVal(f.fechaCierreBalances),
                last_sync: new Date().toISOString(),
                full_json_master: JSON.stringify(f)
            };
            try {
                insertFund.run(fundData);
                count++;
            } catch (e) {
                console.error(`Failed to insert fund ${cl.id}: ${e.message}`);
                process.exit(1);
            }
        }
    }
    console.log(`Success! Initialized ${count} fund classes with exhaustive metadata.`);
}

main().catch(console.error);
