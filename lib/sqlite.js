const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

/**
 * Reconstructs the legacy "flattened" object from SQLite rows
 */
function mapLegacyFondo(fundRow, compositionRows = []) {
    if (!fundRow) return null;

    // Performance mapping as an array to match legacy app.js expectation
    const rendimientos = [];
    if (fundRow.return_day !== null) rendimientos.push({ periodo: '1d', rendimiento: fundRow.return_day + '%', tna: fundRow.tna_day });
    if (fundRow.return_month !== null) rendimientos.push({ periodo: '30d', rendimiento: fundRow.return_month + '%', tna: fundRow.tna_month });
    if (fundRow.return_ytd !== null) rendimientos.push({ periodo: 'anio', rendimiento: fundRow.return_ytd + '%', tna: fundRow.tna_ytd });
    if (fundRow.return_1y !== null) rendimientos.push({ periodo: '1a', rendimiento: fundRow.return_1y + '%' });
    if (fundRow.return_3y !== null) rendimientos.push({ periodo: '3a', rendimiento: fundRow.return_3y + '%' });
    if (fundRow.return_5y !== null) rendimientos.push({ periodo: '5a', rendimiento: fundRow.return_5y + '%' });

    return {
        id: fundRow.id,
        nombre: fundRow.name,
        fondoId: fundRow.fund_id,
        inversionMinima: fundRow.min_investment,
        monedaId: fundRow.currency_id,
        fechaDatos: fundRow.date_data,
        lastSync: fundRow.last_sync,

        // Exhaustive fields
        isin: fundRow.isin,
        bloomberg: fundRow.bloomberg,
        figi: fundRow.figi,
        cnv_code: fundRow.cnv_code,

        // Flags
        flags: {
            rg384: fundRow.flag_rg384,
            liquidez: fundRow.flag_liquidez,
            suscripcion: fundRow.flag_suscripcion,
            repatriacion: fundRow.flag_repatriacion,
            excento_tasa: fundRow.flag_excento_tasa,
            calificado: fundRow.flag_calificado
        },

        // Expenses
        fees: {
            mgmt_gerente: fundRow.fee_mgmt_gerente,
            mgmt_depo: fundRow.fee_mgmt_depo,
            expenses: fundRow.fee_expenses,
            entry: fundRow.fee_entry,
            exit: fundRow.fee_exit,
            success: fundRow.fee_success_flag
        },

        // Nest metadata in fondoPrincipal to match legacy server.js expectations
        fondoPrincipal: {
            id: fundRow.fund_id,
            nombre: fundRow.fund_name,
            codigoCNV: fundRow.cnv_code,
            objetivo: fundRow.objetivo,
            estado: fundRow.estado,
            monedaId: fundRow.currency_id,
            diasLiquidacion: fundRow.dias_liquidacion,
            inicio: fundRow.inicio_date,
            gerente: {
                id: fundRow.manager_id,
                nombre: fundRow.manager_name,
                cuit: fundRow.manager_cuit
            },
            depositaria: {
                id: fundRow.depository_id,
                nombre: fundRow.depository_name,
                cuit: fundRow.depository_cuit
            },
            tipoRenta: {
                id: fundRow.tipo_renta_id,
                nombre: fundRow.tipo_renta_name
            },
            tipoRentaId: fundRow.tipo_renta_id,
            horizonteViejo: fundRow.fondo_horizonte_vieja
        },

        // Map composition to legacy structure
        composicion: compositionRows.map(c => ({
            activo: c.asset_name,
            porcentaje: c.percentage,
            monto: c.monto,
            cantidad: c.cantidad,
            vcp_unitario: c.vcp_unitario,
            tipo: c.type,
            region: c.region,
            especie_id: c.especie_id,
            moneda_id: c.moneda_id
        })),

        // Performance metrics
        patrimonio: fundRow.aum,
        vcp: fundRow.vcp,
        rendimientos: rendimientos
    };
}

async function getAllFondoIds() {
    return db.prepare('SELECT id FROM funds').all().map(r => r.id);
}

async function getFondo(id) {
    const fund = db.prepare('SELECT * FROM funds WHERE id = ?').get(id);
    if (!fund) return null;
    const comps = db.prepare('SELECT * FROM composition WHERE fund_id = ?').all(id);
    return mapLegacyFondo(fund, comps);
}

/**
 * Optimized fetching for list views/analytics
 */
async function getFondos(ids, paths = null) {
    // If no ids provided, return all funds (useful for basic list)
    if (!ids || ids.length === 0) {
        const funds = db.prepare('SELECT id, name, fund_id, min_investment, currency_id, tipo_renta_id, fondo_horizonte_vieja, estado FROM funds').all();
        // Minimal mapping for the list view
        return funds.map(f => ({
            id: f.id,
            nombre: f.name,
            fondoId: f.fund_id,
            inversionMinima: f.min_investment,
            monedaId: f.currency_id,
            tipoRentaId: f.tipo_renta_id,
            fondoPrincipal: {
                tipoRentaId: f.tipo_renta_id,
                horizonteViejo: f.fondo_horizonte_vieja,
                estado: f.estado,
                nombre: f.name // Compatibility
            }
        }));
    }

    const results = [];
    for (const id of ids) {
        const f = await getFondo(id);
        if (f) results.push(f);
    }
    return results;
}

async function getAllFondos() {
    const funds = db.prepare('SELECT * FROM funds').all();

    const allComps = db.prepare('SELECT * FROM composition').all();
    const compMap = {};
    allComps.forEach(c => {
        if (!compMap[c.fund_id]) compMap[c.fund_id] = [];
        compMap[c.fund_id].push(c);
    });

    return funds.map(f => mapLegacyFondo(f, compMap[f.id] || []));
}

async function saveFondo(id, data) {
    console.warn('saveFondo called on SQLite. Use enrichment scripts.');
    return { success: false };
}

async function deleteFondo(id) {
    db.prepare('DELETE FROM composition WHERE fund_id = ?').run(id);
    db.prepare('DELETE FROM funds WHERE id = ?').run(id);
    return { success: true, id };
}

async function getEnrichmentStatus() {
    const total = db.prepare('SELECT COUNT(*) as c FROM funds').get().c;
    const enriched = db.prepare('SELECT COUNT(DISTINCT fund_id) as c FROM composition').get().c;
    return {
        totalFunds: total,
        enrichedFunds: enriched,
        progressPct: total > 0 ? (enriched / total) * 100 : 0
    };
}

module.exports = {
    getAllFondoIds,
    getFondo,
    getFondos,
    getAllFondos,
    saveFondo,
    deleteFondo,
    getEnrichmentStatus,
    db
};
