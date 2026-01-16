// Load environment variables. .env.local for local dev, system env for Vercel.
const fs = require('fs');
const path = require('path'); // Keep this path for both dotenv and DB_PATH
if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
    console.log('📝 [ENV] Loaded .env.local');
} else if (fs.existsSync('.env')) {
    require('dotenv').config();
    console.log('📝 [ENV] Loaded .env');
} else {
    console.log('📝 [ENV] No .env files found, using system environment variables');
}

// Log available env keys for debugging (masked for security)
const envKeys = Object.keys(process.env).filter(k =>
    k.includes('SQL') || k.includes('DB') || k.includes('VERCEL') || k.includes('CONFIG')
);
console.log('🔍 [ENV] Available relevant keys:', envKeys.join(', '));
const { Database } = require('@sqlitecloud/drivers');

// Use SQLite Cloud if connection string is provided, otherwise fallback to local
const connectionString = process.env.SQLITECLOUD_CONNECTION_STRING;
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database.sqlite');
const IS_VERCEL = process.env.VERCEL === '1' || !!process.env.NOW_REGION;

let db;
if (connectionString) {
    const maskedConn = connectionString.substring(0, 30) + '...';
    console.log(`🌐 [DB] Initializing SQLite Cloud connection... (${maskedConn})`);
    try {
        db = new Database(connectionString);
        console.log('✅ [DB] SQLite Cloud initialized (object created)');
    } catch (err) {
        console.error('❌ [DB_INIT_ERROR] Failed to create Database object:', err.message);
    }
} else if (IS_VERCEL) {
    console.error('❌ [DB_FATAL_ERROR] Running on VERCEL but SQLITECLOUD_CONNECTION_STRING is missing!');
    console.error('   Please add SQLITECLOUD_CONNECTION_STRING to Vercel Environment Variables.');
} else {
    console.log('💾 [DB] No connection string, using local fallback...');
    try {
        const BetterSqlite3 = require('better-sqlite3');
        db = new BetterSqlite3(DB_PATH);
        if (db.pragma) db.pragma('journal_mode = WAL');
        console.log('✅ [DB] Local SQLite initialized');
    } catch (err) {
        console.warn('⚠️ [DB_LOCAL_WARNING] better-sqlite3 not loadable. This is normal on Vercel.');
    }
}

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

// Helper function to handle both sync (better-sqlite3) and async (SQLite Cloud) APIs
async function executeQuery(sql, params = [], method = 'all') {
    if (connectionString) {
        if (!db) {
            const errMsg = '❌ [DB_FATAL_ERROR] Database object is not initialized!';
            console.error(errMsg);
            throw new Error(errMsg);
        }
        // SQLite Cloud: Use db.sql directly which returns a Promise resolving to rows array
        try {
            const rows = await db.sql(sql, ...params);
            if (method === 'get') return rows && rows.length > 0 ? rows[0] : null;
            return rows || [];
        } catch (err) {
            console.error(`❌ [DB_CLOUD_ERROR] SQL: ${sql}`, err.message);
            throw err;
        }
    } else {
        // Local: use better-sqlite3 (synchronous)
        if (!db) {
            const errMsg = '❌ [DB_FATAL_ERROR] Local database (better-sqlite3) is not initialized!';
            console.error(errMsg);
            throw new Error(errMsg);
        }
        try {
            const stmt = db.prepare(sql);
            const result = stmt[method](...params);
            return result;
        } catch (err) {
            console.error(`❌ [DB_LOCAL_ERROR] SQL: ${sql}`, err.message);
            throw err;
        }
    }
}

async function getAllFondoIds() {
    const rows = await executeQuery('SELECT id FROM funds');
    return rows.map(r => r.id);
}

async function getFondo(id) {
    const fund = await executeQuery('SELECT * FROM funds WHERE id = ?', [id], 'get');
    if (!fund) return null;

    const comps = await executeQuery('SELECT * FROM composition WHERE fund_id = ?', [id], 'all');
    return mapLegacyFondo(fund, comps);
}

/**
 * Optimized fetching for list views/analytics
 */
async function getFondos(ids, paths = null) {
    // If no ids provided, return all funds (useful for basic list)
    if (!ids || ids.length === 0) {
        const funds = await executeQuery('SELECT id, name, fund_id, min_investment, currency_id, tipo_renta_id, fondo_horizonte_vieja, estado FROM funds');
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
    const funds = await executeQuery('SELECT * FROM funds');
    // For cloud, we fetch compositions in a single query to be efficient
    const allComps = await executeQuery('SELECT * FROM composition');
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
    await executeQuery('DELETE FROM composition WHERE fund_id = ?', [id], 'run');
    await executeQuery('DELETE FROM funds WHERE id = ?', [id], 'run');
    return { success: true, id };
}

async function getEnrichmentStatus() {
    const totalRow = await executeQuery('SELECT COUNT(*) as c FROM funds', [], 'get');
    const enrichedRow = await executeQuery('SELECT COUNT(DISTINCT fund_id) as c FROM composition', [], 'get');
    const total = totalRow ? totalRow.c : 0;
    const enriched = enrichedRow ? enrichedRow.c : 0;

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
