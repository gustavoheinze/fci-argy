const fs = require('fs');

/**
 * CAFCI Fund Scraper - Batch Version
 */
async function scrapeFundData(fondoId, claseId) {
    const url = `https://api.pub.cafci.org.ar/fondo/${fondoId}/clase/${claseId}/ficha`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Origin': 'https://www.cafci.org.ar',
                'Referer': 'https://www.cafci.org.ar/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        if (!response.ok) return { error: `HTTP ${response.status}`, fondoId, claseId };

        const json = await response.json();
        const data = json.data;
        if (!data) return { error: 'Empty data', fondoId, claseId };

        // Extract Rendimientos
        const rendimientosRaw = data.info?.diaria?.rendimientos || {};
        const rendimientos = Object.entries(rendimientosRaw).map(([key, r]) => ({
            periodo: key,
            rendimiento: r.rendimiento ? `${parseFloat(r.rendimiento).toFixed(2)}%` : '0.00%',
            fecha: r.fecha
        }));

        // Extract Composition
        const carteras = data.info?.semanal?.carteras || [];
        const composicion = carteras.map(c => ({
            activo: c.nombreActivo,
            porcentaje: c.share ? `${parseFloat(c.share).toFixed(2)}%` : '0.00%',
            tipo: c.tipoActivoPadre
        }));

        return {
            id: fondoId,
            claseId: claseId,
            nombre: data.nombre,
            clase: data.clase,
            fechaActualizacion: data.info?.diaria?.fecha,
            rendimientos,
            composicion
        };
    } catch (error) {
        return { error: error.message, fondoId, claseId };
    }
}

async function runBatch(limit = 10) {
    console.log(`📂 Loading fci.json...`);
    const rawData = JSON.parse(fs.readFileSync('fci.json', 'utf8'));
    const allFunds = [];

    // Flatten first N funds
    for (const fondo of rawData.data) {
        if (allFunds.length >= limit) break;
        for (const clase of (fondo.clase_fondos || [])) {
            if (allFunds.length >= limit) break;
            allFunds.push({ fondoId: fondo.id, claseId: clase.id, nombre: clase.nombre });
        }
    }

    console.log(`🚀 Starting batch scrape for ${allFunds.length} funds...`);
    const results = [];

    for (let i = 0; i < allFunds.length; i++) {
        const { fondoId, claseId, nombre } = allFunds[i];
        console.log(`[${i + 1}/${allFunds.length}] Processing: ${nombre} (${fondoId};${claseId})`);

        const data = await scrapeFundData(fondoId, claseId);
        results.push(data);

        if (i < allFunds.length - 1) {
            console.log(`   ⏱ Waiting 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    fs.writeFileSync('batch_funds_data.json', JSON.stringify(results, null, 2));
    console.log(`\n✨ Done! Consolidated data saved to batch_funds_data.json`);
}

runBatch(10);
