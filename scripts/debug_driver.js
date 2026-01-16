require('dotenv').config();
const { Database } = require('@sqlitecloud/drivers');

const connectionString = process.env.SQLITECLOUD_CONNECTION_STRING;

(async () => {
    try {
        const db = new Database(connectionString);
        console.log('📡 Connected');

        console.log('🔍 Executing await db.sql(query)...');
        const rows = await db.sql('SELECT id, name FROM funds LIMIT 2');

        console.log('✅ Success!');
        console.log('Is Array:', Array.isArray(rows));
        console.log('Rows count:', rows.length);
        console.log('Sample data:', JSON.stringify(rows));

        db.close();
    } catch (err) {
        console.error('❌ Error:', err);
    }
})();
