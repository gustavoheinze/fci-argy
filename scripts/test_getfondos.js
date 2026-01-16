require('dotenv').config();
const { getFondos } = require('../lib/sqlite');

console.log('🧪 Testing getFondos function...\n');

(async () => {
    try {
        console.log('📡 Calling getFondos()...');
        const funds = await getFondos();

        console.log(`✅ Success! Got ${funds.length} funds`);
        console.log('\nFirst fund:');
        console.log(JSON.stringify(funds[0], null, 2));

    } catch (error) {
        console.error('\n❌ Error:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    }
})();
