require('dotenv').config({ path: '.env.local' });
const { getAllFondoIds, getFondos } = require('./lib/redis');

async function testPipeline() {
    try {
        console.log('Retrieving IDs...');
        const ids = await getAllFondoIds();
        console.log(`IDs count: ${ids.length}`);

        console.log('Retrieving first 100 fondos via pipelining...');
        const start = Date.now();
        const fondos = await getFondos(ids.slice(0, 100));
        const end = Date.now();

        console.log(`Retrieved ${fondos.length} fondos in ${end - start}ms`);

        if (fondos.length > 0) {
            console.log('First fondo sample:', {
                id: fondos[0].id,
                nombre: fondos[0].nombre,
                hasComposicion: !!fondos[0].composicion
            });
        }

        console.log('\nRetrieving ALL fondos via pipelining...');
        const startAll = Date.now();
        const all = await getFondos(ids);
        const endAll = Date.now();
        console.log(`Retrieved ALL ${all.length} fondos in ${endAll - startAll}ms`);

    } catch (err) {
        console.error('PIPELINE TEST ERROR:', err.message);
        console.error(err.stack);
    }
}

testPipeline();
