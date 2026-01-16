const Database = require('better-sqlite3');
const db = new Database('database.sqlite', { verbose: console.log });

try {
    const fundCount = db.prepare('SELECT COUNT(*) as c FROM funds').get().c;
    const compCount = db.prepare('SELECT COUNT(*) as c FROM composition').get().get ? db.prepare('SELECT COUNT(*) as c FROM composition').get().c : db.prepare('SELECT COUNT(*) as c FROM composition').get().c;

    console.log('--- VERIFICATION REPORT ---');
    console.log(`TOTAL_FUNDS: ${fundCount}`);
    console.log(`TOTAL_COMPOSITIONS: ${compCount}`);

    const sample = db.prepare('SELECT name, currency, renta_type FROM funds ORDER BY last_sync DESC LIMIT 1').get();
    if (sample) {
        console.log(`LATEST_FUND_NAME: ${sample.name}`);
        console.log(`LATEST_FUND_INFO: ${sample.currency} | ${sample.renta_type}`);
    } else {
        console.log('NO_FUNDS_FOUND');
    }
    console.log('--- END REPORT ---');

} catch (err) {
    console.error('VERIFICATION_ERROR:', err.message);
}
