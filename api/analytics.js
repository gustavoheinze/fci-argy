const fs = require('fs');
const path = require('path');

function classifyAsset(name) {
    const n = name.toUpperCase();
    if (n.includes('PZO FI') || n.includes('CTA CTE') || n.includes('AHO') || n.includes('CAU') || n.includes('EFEC')) return 'LIQUIDEZ';
    if (n.includes('BONO') || n.includes('LETRA') || n.includes('ON ') || n.includes('TIT') || n.includes('TZ')) return 'RENTA_FIJA';
    if (n.includes('ACC') || n.includes('CED') || n.includes('YPF') || n.includes('PAMPA')) return 'RENTA_VARIABLE';
    return 'OTROS';
}

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const enrichedPath = path.join(process.cwd(), 'fci_enriched.json');

        if (!fs.existsSync(enrichedPath)) {
            return res.status(404).json({ error: 'Enriched data not found' });
        }

        const data = fs.readFileSync(enrichedPath, 'utf8');
        const jsonData = JSON.parse(data);
        const funds = [];

        // Flatten use the same logic as /api/funds to get the classes
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

        res.status(200).json({
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
    } catch (error) {
        console.error('Error in /api/analytics:', error);
        res.status(500).json({ error: 'Error processing analytics', details: error.message });
    }
};
