const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static('public'));

// API endpoint to get funds data (flattened clase_fondos)
app.get('/api/funds', (req, res) => {
  fs.readFile(path.join(__dirname, 'fci.json'), 'utf8', (err, data) => {
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});