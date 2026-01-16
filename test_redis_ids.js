require('dotenv').config({ path: '.env.local' });
const { getAllFondoIds, getFondo } = require('./lib/redis');

async function test() {
    try {
        console.log('Getting all fondo IDs...');
        const ids = await getAllFondoIds();
        console.log(`Total IDs: ${ids.length}`);

        console.log('\nTesting first 10 IDs...');
        for (let i = 0; i < Math.min(10, ids.length); i++) {
            const id = ids[i];
            try {
                const fondo = await getFondo(id);
                console.log(`✓ ID ${id}: ${fondo ? 'OK' : 'NULL'}`);
            } catch (e) {
                console.log(`✗ ID ${id}: ERROR - ${e.message}`);
            }
        }

        console.log('\nTesting all IDs (this may take a while)...');
        let errorCount = 0;
        let nullCount = 0;
        let successCount = 0;

        for (const id of ids) {
            try {
                const fondo = await getFondo(id);
                if (fondo === null) {
                    nullCount++;
                    console.log(`NULL: ID ${id}`);
                } else {
                    successCount++;
                }
            } catch (e) {
                errorCount++;
                console.log(`ERROR: ID ${id} - ${e.message}`);
            }
        }

        console.log('\n=== SUMMARY ===');
        console.log(`Success: ${successCount}`);
        console.log(`Null: ${nullCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (e) {
        console.error('FATAL ERROR:', e.message);
        console.error(e.stack);
    }
}

test();
