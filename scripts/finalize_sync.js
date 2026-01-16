const { db } = require('../lib/sqlite');
const fs = require('fs');
const path = require('path');

// Mark any remaining NULLs as empty
db.prepare("UPDATE funds SET full_json_ficha = '{}', last_sync = ? WHERE full_json_ficha IS NULL").run(new Date().toISOString());

// Calculate final stats
const stats = db.prepare(`
    SELECT 
        (SELECT COUNT(*) FROM funds) as total,
        (SELECT COUNT(DISTINCT fund_id) FROM composition) as enriched
`).get();

const status = {
    totalFunds: stats.total,
    enrichedFunds: stats.enriched,
    progressPct: (stats.enriched / stats.total) * 100,
    lastUpdate: new Date().toISOString()
};

const filePath = path.join(__dirname, '..', 'public', 'sync_status.json');
fs.writeFileSync(filePath, JSON.stringify(status, null, 2));
console.log('Final status saved:', status);
