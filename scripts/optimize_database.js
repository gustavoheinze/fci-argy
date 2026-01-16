const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('📊 Analizando database.sqlite...');

// Get original size
const statsBefore = fs.statSync(dbPath);
const sizeBefore = (statsBefore.size / 1024 / 1024).toFixed(2);
console.log(`   Tamaño actual: ${sizeBefore} MB`);

console.log('\n🔧 Ejecutando VACUUM (esto puede tardar un minuto)...');

const db = new Database(dbPath);

try {
    // VACUUM reconstruye la base de datos, eliminando espacio fragmentado
    db.exec('VACUUM;');

    // ANALYZE actualiza las estadísticas de la base de datos
    db.exec('ANALYZE;');

    db.close();

    // Get new size
    const statsAfter = fs.statSync(dbPath);
    const sizeAfter = (statsAfter.size / 1024 / 1024).toFixed(2);
    const saved = (sizeBefore - sizeAfter).toFixed(2);
    const percentage = ((saved / sizeBefore) * 100).toFixed(1);

    console.log('\n✅ Optimización completada!');
    console.log(`   Tamaño anterior: ${sizeBefore} MB`);
    console.log(`   Tamaño nuevo: ${sizeAfter} MB`);
    console.log(`   Espacio liberado: ${saved} MB (${percentage}%)`);

} catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
    process.exit(1);
}
