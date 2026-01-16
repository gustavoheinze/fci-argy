require('dotenv').config({ path: '.env.local' });
const { getAllFondos } = require('./lib/redis');
const fs = require('fs');

async function test() {
    try {
        console.log('Fetching all fondos from Redis...');
        const fondos = await getAllFondos();

        const result = {
            type: typeof fondos,
            isArray: Array.isArray(fondos),
            length: Array.isArray(fondos) ? fondos.length : 'N/A',
            keys: Array.isArray(fondos) ? 'N/A' : Object.keys(fondos || {}).slice(0, 20),
            firstItem: fondos && fondos.length > 0 ? fondos[0] : (fondos ? Object.values(fondos)[0] : null)
        };

        fs.writeFileSync('redis_test_result.json', JSON.stringify(result, null, 2));
        console.log('\n=== RESULT WRITTEN TO redis_test_result.json ===');
        console.log('Type:', result.type);
        console.log('Is Array:', result.isArray);
        console.log('Length:', result.length);
    } catch (e) {
        const error = {
            message: e.message,
            stack: e.stack
        };
        fs.writeFileSync('redis_test_result.json', JSON.stringify(error, null, 2));
        console.error('ERROR:', e.message);
    }
}

test();
