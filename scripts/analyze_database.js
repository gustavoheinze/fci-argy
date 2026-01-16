const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('🔍 Analizando estructura de la base de datos...\n');

const db = new Database(dbPath);

// Obtener tamaño de cada tabla
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
`).all();

console.log('📊 Tamaño por tabla:\n');

let totalRows = 0;
const tableStats = [];

tables.forEach(({ name }) => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
    const size = db.prepare(`
    SELECT SUM(pgsize) as size 
    FROM dbstat 
    WHERE name = ?
  `).get(name);

    const sizeKB = size?.size ? (size.size / 1024).toFixed(2) : '0';
    totalRows += count.count;

    tableStats.push({
        name,
        rows: count.count,
        sizeKB: parseFloat(sizeKB)
    });
});

// Ordenar por tamaño
tableStats.sort((a, b) => b.sizeKB - a.sizeKB);

tableStats.forEach(stat => {
    const sizeMB = (stat.sizeKB / 1024).toFixed(2);
    console.log(`   ${stat.name.padEnd(30)} ${String(stat.rows).padStart(8)} filas  ${sizeMB.padStart(8)} MB`);
});

console.log(`\n📈 Total de filas: ${totalRows.toLocaleString()}`);

// Verificar índices
const indexes = db.prepare(`
  SELECT name, tbl_name FROM sqlite_master 
  WHERE type='index' AND name NOT LIKE 'sqlite_%'
`).all();

console.log(`\n🔑 Índices encontrados: ${indexes.length}`);
indexes.forEach(idx => {
    console.log(`   - ${idx.name} (tabla: ${idx.tbl_name})`);
});

// Sugerencias
console.log('\n💡 Sugerencias para reducir tamaño:\n');
console.log('   1. Las tablas más grandes son las candidatas para optimización');
console.log('   2. Considera eliminar columnas que no uses (requiere migración)');
console.log('   3. Los índices ocupan espacio - elimina los que no uses');
console.log('   4. Comprime la DB con gzip para almacenamiento (120MB → ~15-20MB)');

db.close();
