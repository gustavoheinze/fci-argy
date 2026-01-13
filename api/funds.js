const fs = require('fs');
const path = require('path');

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
        const basePath = path.join(process.cwd(), 'fci.json');

        const targetPath = fs.existsSync(enrichedPath) ? enrichedPath : basePath;

        const data = fs.readFileSync(targetPath, 'utf8');
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

        res.status(200).json(fondosFlattened);
    } catch (error) {
        console.error('Error in /api/funds:', error);
        res.status(500).json({ error: 'Error reading data', details: error.message });
    }
};
