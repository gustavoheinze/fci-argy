const fs = require('fs');
const path = require('path');

const DB_FILE = 'fci.json';
const ENRICHED_FILE = 'fci_enriched.json';
const CHECKPOINT_FILE = 'scrapper_checkpoint.json';
const RATE_LIMIT_MS = 2000;

/**
 * CAFCI Fund Scraper - Technical Fetch
 */
async function fetchTechnicalData(fondoId, claseId) {
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

        if (!response.ok) return null;

        const json = await response.json();
        const data = json.data;
        if (!data) return null;

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

        return { rendimientos, composicion, lastUpdated: data.info?.diaria?.fecha };
    } catch (error) {
        console.error(`   ERR: ${error.message}`);
        return null;
    }
}

async function startEnrichment() {
    console.log('--- STARTING DATABASE ENRICHMENT ---');

    // 1. Load Original Data
    if (!fs.existsSync(DB_FILE)) {
        console.error('Error: fci.json not found!');
        return;
    }
    let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

    // 2. Load Progress / Enriched File
    let processedCount = 0;
    if (fs.existsSync(CHECKPOINT_FILE)) {
        const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
        processedCount = checkpoint.processedCount;
        console.log(`📡 Resuming from checkpoint: ${processedCount} elements processed.`);
        if (fs.existsSync(ENRICHED_FILE)) {
            db = JSON.parse(fs.readFileSync(ENRICHED_FILE, 'utf8'));
        }
    }

    // Flatten for iteration
    const flatList = [];
    db.data.forEach((fondo, fIndex) => {
        (fondo.clase_fondos || []).forEach((clase, cIndex) => {
            flatList.push({ fondo, clase, fIndex, cIndex });
        });
    });

    const total = flatList.length;
    console.log(`📊 Total elements to process: ${total}`);

    for (let i = processedCount; i < total; i++) {
        const { fondo, clase, fIndex, cIndex } = flatList[i];

        console.log(`[${i + 1}/${total}] Processing: ${clase.nombre} (f:${fondo.id}, c:${clase.id})`);

        const technicalData = await fetchTechnicalData(fondo.id, clase.id);

        if (technicalData) {
            // Merge data
            db.data[fIndex].clase_fondos[cIndex].rendimientos = technicalData.rendimientos;
            db.data[fIndex].clase_fondos[cIndex].composicion = technicalData.composicion;
            db.data[fIndex].clase_fondos[cIndex].lastTechnicalUpdate = technicalData.lastUpdated;
            console.log(`   ✅ Data injected.`);
        } else {
            console.log(`   ⚠️ Failed to fetch data.`);
        }

        // Save progress every 10 items or at the end
        if ((i + 1) % 10 === 0 || i === total - 1) {
            console.log(`   💾 Saving progress...`);
            fs.writeFileSync(ENRICHED_FILE, JSON.stringify(db, null, 2));
            fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ processedCount: i + 1 }));
        }

        if (i < total - 1) {
            await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
        }
    }

    console.log('--- ENRICHMENT COMPLETED ---');
    console.log(`Final file saved to: ${ENRICHED_FILE}`);
}

startEnrichment();
