require('dotenv').config();

console.log('🧪 Simple connection test...\n');

const connectionString = process.env.SQLITECLOUD_CONNECTION_STRING;
console.log('Connection string:', connectionString);
console.log('');

try {
    const { Database } = require('@sqlitecloud/drivers');
    console.log('✅ Driver loaded successfully');

    console.log('📡 Attempting connection...');
    const db = new Database(connectionString);

    console.log('✅ Connected!');
    console.log('');

    // Simple test
    console.log('🔍 Running test query...');
    const result = db.prepare('SELECT 1 as test').get();
    console.log('Result:', result);

    db.close();
    console.log('\n✅ Success!');

} catch (error) {
    console.error('\n❌ ERROR:');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    if (error.code) console.error('Code:', error.code);
    console.error('\nFull error:');
    console.error(error);
}
