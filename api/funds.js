const { getFondos } = require('../lib/sqlite');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('📡 [API/funds] Fetching funds from SQLiteCloud...');
        const funds = await getFondos();

        // Map to the same format as in server.js/legacy app.js
        const mapped = funds.map(f => ({
            id: f.id,
            nombre: f.nombre,
            fondoId: f.fondoId,
            inversionMinima: f.inversionMinima,
            monedaId: f.monedaId,
            tipoRentaId: f.fondoPrincipal ? f.fondoPrincipal.tipoRentaId : null,
            fondoPrincipal: f.fondoPrincipal,
            rendimientoDia: f.rendimientoDia,
            rendimientoMes: f.rendimientoMes,
            patrimonio: f.patrimonio
        }));

        res.status(200).json(mapped);
    } catch (error) {
        console.error('❌ [API/funds ERROR]:', error);
        res.status(500).json({ error: 'Error processing funds request', details: error.message });
    }
};

