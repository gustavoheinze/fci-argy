require('dotenv').config({ path: '.env.local' });
const { getAllFondoIds, getFondos } = require('./lib/redis');

async function testOptimized() {
    try {
        const ids = await getAllFondoIds();
        console.log(`Total IDs: ${ids.length}`);

        const fields = [
            '$.id',
            '$.nombre',
            '$.fondoId',
            '$.inversionMinima',
            '$.monedaId',
            '$.fondoPrincipal'
        ];

        console.log('Retrieving ALL fondos with SELECTIVE FIELDS...');
        const start = Date.now();
        const fondos = await getFondos(ids, fields);
        const end = Date.now();

        console.log(`\n=== RESULTS ===`);
        console.log(`Retrieved: ${fondos.length} items`);
        console.log(`Time: ${end - start}ms`);

        if (fondos.length > 0) {
            console.log('Item structure sample:', JSON.stringify(fondos[0], null, 2));
            console.log('Has composition field?', !!fondos[0].composicion);
        }

    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

testOptimized();
