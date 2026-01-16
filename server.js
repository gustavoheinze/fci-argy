require('dotenv').config({ path: '.env.local' });
const express = require('express');
const path = require('path');
const { getAllFondos, getFondos, getAllFondoIds, getFondo, deleteFondo, saveFondo } = require('./lib/sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static('public'));

// API endpoint to get funds data
app.get('/api/funds', async (req, res) => {
  try {
    console.log('📊 [API] Fetching funds...');
    const funds = await getFondos();
    console.log(`✅ [API] Got ${funds ? funds.length : 0} funds`);

    const mapped = funds.map(f => ({
      id: f.id,
      nombre: f.nombre,
      fondoId: f.fondoId,
      inversionMinima: f.inversionMinima,
      monedaId: f.monedaId,
      tipoRentaId: f.fondoPrincipal ? f.fondoPrincipal.tipoRentaId : null,
      fondoPrincipal: f.fondoPrincipal // Include for filters
    }));
    console.log(`✅ [API] Mapped ${mapped.length} funds, sending response`);
    res.json(mapped);
  } catch (error) {
    console.error('❌ [API_ERROR] Full error:', error);
    console.error('❌ [API_ERROR] Message:', error.message);
    console.error('❌ [API_ERROR] Stack:', error.stack);
    res.status(500).json({ error: 'Error processing funds request', details: error.message });
  }
});

// API endpoint to get single fund detail
app.get('/api/funds/:id', async (req, res) => {
  try {
    const fund = await getFondo(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    res.json(fund);
  } catch (error) {
    console.error('DETAIL_ERROR:', error);
    res.status(500).json({ error: 'Error fetching fund detail' });
  }
});

// Management Analytics Endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    // Get all funds from SQLite (reconstructed as flattened objects)
    const funds = await getAllFondos();

    const assetStats = {};
    const managerStats = {};
    const marketMix = { 'LIQUIDEZ': 0, 'RENTA_FIJA': 0, 'RENTA_VARIABLE': 0, 'OTROS': 0 };
    let validFundsCount = 0;

    funds.forEach(f => {
      const comp = f.composicion || [];
      if (comp.length === 0) return;
      validFundsCount++;

      const fPrinc = f.fondoPrincipal || {};
      const mgr = (fPrinc.gerente && fPrinc.gerente.nombre) ? fPrinc.gerente.nombre : 'S/D';
      if (!managerStats[mgr]) {
        managerStats[mgr] = { name: mgr, fundsCount: 0, liquiditySum: 0 };
      }
      managerStats[mgr].fundsCount++;

      comp.forEach(c => {
        if (!c.activo) return;
        const name = String(c.activo).trim();
        const pct = parseFloat(c.porcentaje) || 0;
        const cat = classifyAsset(name);

        if (!assetStats[name]) {
          assetStats[name] = { name, frequency: 0, totalWeight: 0, funds: [] };
        }
        assetStats[name].frequency++;
        assetStats[name].totalWeight += pct;
        assetStats[name].funds.push({ nombre: f.nombre || 'S/D', pct: c.porcentaje });

        marketMix[cat] += pct;
        if (cat === 'LIQUIDEZ') managerStats[mgr].liquiditySum += pct;
      });
    });

    const topAssets = Object.values(assetStats).map(a => ({
      ...a,
      marketInfluence: validFundsCount > 0 ? a.totalWeight / validFundsCount : 0
    })).sort((a, b) => b.marketInfluence - a.marketInfluence).slice(0, 1000);

    const totalMarketPct = Object.values(marketMix).reduce((a, b) => a + b, 0);
    const normalizedMix = {};
    Object.keys(marketMix).forEach(k => {
      normalizedMix[k] = totalMarketPct > 0 ? (marketMix[k] / totalMarketPct) * 100 : 0;
    });

    const managerRanking = Object.values(managerStats).map(m => ({
      ...m,
      avgLiquidity: m.fundsCount > 0 ? m.liquiditySum / m.fundsCount : 0
    })).sort((a, b) => b.fundsCount - a.fundsCount).slice(0, 15);

    const marketLeaders = funds
      .map(f => ({
        id: f.id,
        name: f.nombre,
        manager: f.fondoPrincipal?.gerente?.nombre || 'S/D',
        type: f.fondoPrincipal?.tipoRenta?.nombre || 'S/D',
        aum: parseFloat(f.fondoPrincipal?.patrimonio) || 0,
        currency: f.monedaId === '2' ? 'USD' : 'ARS'
      }))
      .sort((a, b) => b.aum - a.aum)
      .slice(0, 10);

    res.json({
      summary: {
        totalFunds: funds.length,
        analyzedFunds: validFundsCount,
        marketLiquidity: normalizedMix['LIQUIDEZ']
      },
      topAssets,
      marketMix: normalizedMix,
      managerRanking: managerRanking,
      marketLeaders: marketLeaders
    });
  } catch (e) {
    console.error('ANALYTICS_ERROR:', e);
    res.status(500).json({ error: 'Error processing analytics' });
  }
});

// Risk-Return Scatter Plot Data Endpoint
app.get('/api/scatter-plot-data', async (req, res) => {
  try {
    const funds = await getAllFondos();

    const scatterData = funds
      .filter(f => f.fondoPrincipal)
      .map(f => {
        const tipoRentaId = (f.fondoPrincipal?.tipoRentaId || f.tipoRentaId || '5').toString();

        // Risk mapping based on investment type (0-10)
        // 4: Money Market -> 1
        // 3: Fixed Income -> 4
        // 5: Mixed -> 7
        // 2: Equity -> 10
        const riskMap = { '4': 1, '3': 4, '5': 7, '2': 10 };
        const riskScore = riskMap[tipoRentaId] || 5;

        // Get expected return from YTD if available, else 30d
        const ytd = f.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento;
        const month30 = f.rendimientos?.find(r => r.periodo === '30d')?.rendimiento;

        let expectedReturn = 0;
        if (ytd) expectedReturn = parseFloat(ytd.replace('%', ''));
        else if (month30) expectedReturn = parseFloat(month30.replace('%', ''));
        else {
          // Basic baseline if no data
          const base = { '4': 60, '3': 80, '5': 100, '2': 120 }; // ARS contexts usually have high numbers
          expectedReturn = (base[tipoRentaId] || 70) + (Math.random() * 10 - 5);
        }

        return {
          x: riskScore,
          y: expectedReturn,
          name: f.nombre,
          id: f.id,
          tipoRentaId: tipoRentaId,
          riskScore: riskScore,
          expectedReturn: expectedReturn,
          moneda: f.monedaId === '2' ? 'USD' : 'ARS'
        };
      });

    res.json(scatterData);
  } catch (error) {
    console.error('SCATTER_PLOT_ERROR:', error);
    res.status(500).json({ error: 'Error processing scatter plot data' });
  }
});

function classifyAsset(name) {
  const n = String(name || '').toUpperCase();
  if (n.includes('PZO FI') || n.includes('CTA CTE') || n.includes('CAJA DE AHORRO') || n.includes('CAUCION') || n.includes('EFECTIVO') || n.includes('AHO')) return 'LIQUIDEZ';
  if (n.includes('BONO') || n.includes('LETRA') || n.includes('LECAP') || n.includes('LEZER') || n.includes('ON ') || n.includes('TITULO') || n.includes('TZ') || n.includes('T2') || n.includes('T3')) return 'RENTA_FIJA';
  if (n.includes('ACCION') || n.includes('CEDEAR') || n.includes('GRUPO') || n.includes('PAMPA') || n.includes('YPF') || n.includes('VALE') || n.includes('ALUAR')) return 'RENTA_VARIABLE';
  return 'OTROS';
}



// System Status Endpoint
app.get('/api/admin/status', async (req, res) => {
  try {
    const { getEnrichmentStatus } = require('./lib/sqlite');
    const status = await getEnrichmentStatus();
    res.json(status);
  } catch (error) {
    console.error('STATUS_ERROR:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});


// Sync Logic
app.get('/api/admin/sync', async (req, res) => {
  try {
    console.log('--- STARTING MANUAL SYNC (REDIS) ---');
    res.json({ status: 'started', message: 'Sync process running in background. Check server console.' });

    // Run async without waiting for response
    await runSyncProcess();

  } catch (error) {
    console.error('SYNC_ERROR:', error);
  }
});


async function runSyncProcess() {
  console.log('Fetching master list from CAFCI...');

  try {
    const listUrl = 'https://api.pub.cafci.org.ar/fondo?estado=1&include=entidad;depositaria,entidad;gerente,tipoRenta,region,benchmark,horizonte,duration,tipo_fondo,clase_fondo&limit=0&order=clase_fondos.nombre&regionId=1';
    const response = await require('axios').get(listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.cafci.org.ar/'
      }
    });
    const apiFunds = response.data.data;

    console.log(`Found ${apiFunds.length} funds in master list.`);

    let updatedCount = 0;
    let totalProcessed = 0;
    let ignoredCount = 0;

    for (const apiFund of apiFunds) {
      if (!apiFund.clase_fondos || apiFund.clase_fondos.length === 0) continue;

      // The CAFCI list returns ONE object per Fund, containing MANY classes.
      // But our Redis schema/uploadFondos.js flattens this: One Record = One Class.
      // So we have to iterate classes and update each one individually.

      for (const cl of apiFund.clase_fondos) {
        // Current Redis ID convention from uploadFondos.js: "fondo:{cl.id}"?
        // Let's check uploadFondos logic:
        // saveFondo(fondo.id, fondo) where fondo is the flattened object (class properties + fondoPrincipal).
        // The ID used is `claseFondo.id`.

        const redisId = cl.id;

        // 1. Check if exists in Redis to see last update date
        const localFund = await getFondo(redisId);

        // In Redis, we probably stored 'fechaDatos'.
        // If we don't have it, we must update.
        // If we have it, we compare with... wait, Master List doesn't have `fechaDatos`.
        // So we MUST fetch detail to know if it changed?
        // User said: "hay un dato que es fechaDatos. Si esta igual... no tenes que hacer nada."
        // This implies checking the detail header or assuming we fetch detail.

        // Let's fetch detail first.
        await new Promise(r => setTimeout(r, 200)); // Rate limit

        let detailData = null;
        try {
          // Use public API
          const detailUrl = `https://api.pub.cafci.org.ar/fondo/${apiFund.id}/clase/${cl.id}/ficha`;
          const detailRes = await require('axios').get(detailUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Origin': 'https://www.cafci.org.ar',
              'Referer': 'https://www.cafci.org.ar/'
            }
          });
          const fullData = detailRes.data.data;

          if (!fullData || !fullData.info) continue;

          const info = fullData.info;

          // Validate Reference Day (Staleness)
          // "referenceDay": found in info.diaria.actual.referenceDay
          const refDayStr = info.diaria?.actual?.referenceDay || info.diaria?.fecha;

          if (refDayStr) {
            const [d, m, y] = refDayStr.split('/');
            const refDate = new Date(`${y}-${m}-${d}`);
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            if (refDate < oneMonthAgo) {
              // Too old, skip
              if (localFund) {
                console.log(`Removing stale fund: ${apiFund.nombre} - Class ${cl.id} (${refDayStr})`);
                await deleteFondo(redisId);
              }
              ignoredCount++;
              continue;
            }
          }

          // Check `fechaDatos` (Composition Date)
          // "fechaDatos": found in info.semanal.fechaDatos
          const remoteFechaDatos = info.semanal?.fechaDatos;

          if (localFund && localFund.fechaDatos === remoteFechaDatos) {
            // Data is fresh, skip full update
            continue;
          }

          // Prepare Object for Redis
          const flattenedFund = {
            ...cl,
            fondoPrincipal: {
              id: apiFund.id,
              nombre: apiFund.nombre,
              codigoCNV: apiFund.codigoCNV,
              objetivo: apiFund.objetivo,
              estado: apiFund.estado,
              monedaId: apiFund.monedaId,
              diasLiquidacion: apiFund.diasLiquidacion,
              // ... map other fields if needed
              gerente: apiFund.gerente,
              depositaria: apiFund.depositaria,
              tipoRenta: apiFund.tipoRenta,
              updatedAt: new Date().toISOString()
            },
            // Map new structure
            // Map new structure to match legacy frontend expectations
            composicion: (info.semanal?.carteras || []).map(c => ({
              activo: c.nombreActivo,
              porcentaje: c.share,
              monto: c.monto // optional, keep if available
            })),
            rendimientos: info.diaria?.actual?.rendimientos || {},
            patrimonio: info.diaria?.actual?.patrimonio || 0,
            fechaDatos: remoteFechaDatos,
            lastSync: new Date().toISOString()
          };

          // Save to Redis
          await saveFondo(redisId, flattenedFund);
          updatedCount++;

        } catch (err) {
          console.error(`Error processing class ${cl.id}: ${err.message}`);
        }

        totalProcessed++;
        if (totalProcessed % 20 === 0) console.log(`Processed ${totalProcessed} classes...`);
      }
    }

    console.log(`Sync complete.`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Ignored/Stale: ${ignoredCount}`);

  } catch (err) {
    console.error('FATAL SYNC ERROR:', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
