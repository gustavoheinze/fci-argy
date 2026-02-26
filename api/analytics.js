const { getAllFondos } = require('../lib/sqlite');

function classifyAsset(name) {
    const n = String(name || '').toUpperCase();
    if (n.includes('PZO FI') || n.includes('CTA CTE') || n.includes('CAJA DE AHORRO') || n.includes('CAUCION') || n.includes('EFECTIVO') || n.includes('AHO')) return 'LIQUIDEZ';
    if (n.includes('BONO') || n.includes('LETRA') || n.includes('LECAP') || n.includes('LEZER') || n.includes('ON ') || n.includes('TITULO') || n.includes('TZ') || n.includes('T2') || n.includes('T3')) return 'RENTA_FIJA';
    if (n.includes('ACCION') || n.includes('CEDEAR') || n.includes('GRUPO') || n.includes('PAMPA') || n.includes('YPF') || n.includes('VALE') || n.includes('ALUAR')) return 'RENTA_VARIABLE';
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
        console.log('📡 [API/analytics] Processing analytics from SQLiteCloud...');
        const allFunds = await getAllFondos();
        const funds = allFunds.filter(f => f.patrimonio > 0);

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

                // Safety filter: Ignore assets with absolute weight > 100% in global stats.
                if (Math.abs(pct) > 100) return;

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
            avgLiquidity: m.fundsCount > 0 ? m.liquiditySum / m.fundsCount : 0
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
        console.error('❌ [API/analytics ERROR]:', error);
        res.status(500).json({ error: 'Error processing analytics', details: error.message });
    }
};

