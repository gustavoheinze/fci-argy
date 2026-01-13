const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static('public'));

// API endpoint to get funds data (flattened clase_fondos)
app.get('/api/funds', (req, res) => {
  const enrichedPath = path.join(__dirname, 'fci_enriched.json');
  const basePath = path.join(__dirname, 'fci.json');

  const targetPath = fs.existsSync(enrichedPath) ? enrichedPath : basePath;

  fs.readFile(targetPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading data' });
    }
    try {
      const jsonData = JSON.parse(data);

      // Flatten clase_fondos with parent fund info
      const fondosFlattened = [];
      jsonData.data.forEach(fondo => {
        if (fondo.clase_fondos && fondo.clase_fondos.length > 0) {
          fondo.clase_fondos.forEach(claseFondo => {
            fondosFlattened.push({
              ...claseFondo,
              // Agregar info del fondo principal
              fondoPrincipal: {
                id: fondo.id,
                nombre: fondo.nombre,
                codigoCNV: fondo.codigoCNV,
                objetivo: fondo.objetivo,
                estado: fondo.estado,
                monedaId: fondo.monedaId,
                diasLiquidacion: fondo.diasLiquidacion,
                regionVieja: fondo.regionVieja,
                horizonteViejo: fondo.horizonteViejo,
                tipoRentaId: fondo.tipoRentaId,
                clasificacionVieja: fondo.clasificacionVieja,
                inicio: fondo.inicio,
                updatedAt: fondo.updatedAt,
                gerente: fondo.gerente,
                depositaria: fondo.depositaria,
                tipoRenta: fondo.tipoRenta
              }
            });
          });
        }
      });

      res.json(fondosFlattened);
    } catch (parseErr) {
      res.status(500).json({ error: 'Error parsing data' });
    }
  });
});

// Management Analytics Endpoint
app.get('/api/analytics', (req, res) => {
  const enrichedPath = path.join(__dirname, 'fci_enriched.json');
  fs.readFile(enrichedPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Error reading enriched data' });
    try {
      const jsonData = JSON.parse(data);
      const funds = [];

      // We need to flatten use the same logic as /api/funds to get the classes
      jsonData.data.forEach(fondo => {
        if (fondo.clase_fondos) {
          fondo.clase_fondos.forEach(clase => {
            funds.push({ ...clase, fondoPrincipal: fondo });
          });
        }
      });

      const assetStats = {};
      const managerStats = {};
      const marketMix = { 'LIQUIDEZ': 0, 'RENTA_FIJA': 0, 'RENTA_VARIABLE': 0, 'OTROS': 0 };
      let validFundsCount = 0;

      funds.forEach(f => {
        if (!f.composicion || f.composicion.length === 0) return;
        validFundsCount++;

        const mgr = f.fondoPrincipal.gerente ? f.fondoPrincipal.gerente.nombre : 'S/D';
        if (!managerStats[mgr]) {
          managerStats[mgr] = { name: mgr, fundsCount: 0, liquiditySum: 0 };
        }
        managerStats[mgr].fundsCount++;

        f.composicion.forEach(c => {
          const name = c.activo.trim();
          const pct = parseFloat(c.porcentaje) || 0;
          const cat = classifyAsset(name);

          if (!assetStats[name]) {
            assetStats[name] = { name, frequency: 0, totalWeight: 0, funds: [] };
          }
          assetStats[name].frequency++;
          assetStats[name].totalWeight += pct;
          assetStats[name].funds.push({ nombre: f.nombre, pct: c.porcentaje });

          marketMix[cat] += pct;
          if (cat === 'LIQUIDEZ') managerStats[mgr].liquiditySum += pct;
        });
      });

      const topFreq = Object.values(assetStats).sort((a, b) => b.frequency - a.frequency).slice(0, 20);
      const topWeight = Object.values(assetStats).sort((a, b) => b.totalWeight - a.totalWeight).slice(0, 20);

      const totalMarketPct = Object.values(marketMix).reduce((a, b) => a + b, 0) || 1;
      const normalizedMix = {};
      Object.keys(marketMix).forEach(k => {
        normalizedMix[k] = (marketMix[k] / totalMarketPct) * 100;
      });

      const managerRanking = Object.values(managerStats).map(m => ({
        name: m.name,
        funds: m.fundsCount,
        avgLiquidity: m.liquiditySum / m.fundsCount
      })).sort((a, b) => b.funds - a.funds).slice(0, 15);

      res.json({
        summary: {
          totalFunds: funds.length,
          analyzedFunds: validFundsCount,
          marketLiquidity: normalizedMix['LIQUIDEZ']
        },
        topAssetsByFrequency: topFreq,
        topAssetsByWeight: topWeight,
        marketMix: normalizedMix,
        managerRanking: managerRanking
      });
    } catch (e) {
      res.status(500).json({ error: 'Error processing analytics' });
    }
  });
});

function classifyAsset(name) {
  const n = name.toUpperCase();
  if (n.includes('PZO FI') || n.includes('CTA CTE') || n.includes('AHO') || n.includes('CAU') || n.includes('EFEC')) return 'LIQUIDEZ';
  if (n.includes('BONO') || n.includes('LETRA') || n.includes('ON ') || n.includes('TIT') || n.includes('TZ')) return 'RENTA_FIJA';
  if (n.includes('ACC') || n.includes('CED') || n.includes('YPF') || n.includes('PAMPA')) return 'RENTA_VARIABLE';
  return 'OTROS';
}


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});