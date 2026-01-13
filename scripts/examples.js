/**
 * Ejemplos de uso de Redis para fondos
 * Uso: node scripts/examples.js
 */

require('dotenv').config({ path: '.env.local' });

const {
  getFondo,
  getFondos,
  getAllFondoIds,
  getAllFondos,
  searchFondosByName,
  getFondosByEstado,
  getFondosByTipoRenta,
  getStats,
} = require('../lib/redis');

/**
 * Ejemplo 1: Obtener un fondo por ID
 */
async function example1_getFondoById() {
  console.log('\n' + '='.repeat(60));
  console.log('📘 EJEMPLO 1: Obtener un fondo por su ID');
  console.log('='.repeat(60));

  try {
    // Primero obtener los IDs disponibles
    const ids = await getAllFondoIds();
    
    if (ids.length === 0) {
      console.log('⚠️  No hay fondos cargados. Ejecuta: node scripts/uploadFondos.js');
      return;
    }

    // Obtener el primer fondo
    const primerFondoId = ids[0];
    console.log(`\n🔍 Buscando fondo con ID: ${primerFondoId}`);

    const fondo = await getFondo(primerFondoId);

    if (fondo) {
      console.log('\n✅ Fondo encontrado:');
      console.log(`   Nombre: ${fondo.nombre}`);
      console.log(`   Fondo Principal: ${fondo.fondoPrincipal.nombre}`);
      console.log(`   Código CNV: ${fondo.fondoPrincipal.codigoCNV}`);
      console.log(`   Estado: ${fondo.fondoPrincipal.estado === '1' ? 'Activo' : 'Inactivo'}`);
      console.log(`   Inversión Mínima: $${fondo.inversionMinima}`);
      console.log(`   ID de Clase: ${fondo.id}`);
    } else {
      console.log('❌ Fondo no encontrado');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 2: Obtener múltiples fondos
 */
async function example2_getMultipleFondos() {
  console.log('\n' + '='.repeat(60));
  console.log('📗 EJEMPLO 2: Obtener varios fondos por IDs');
  console.log('='.repeat(60));

  try {
    const ids = await getAllFondoIds();
    
    if (ids.length < 3) {
      console.log('⚠️  Se necesitan al menos 3 fondos. Ejecuta: node scripts/uploadFondos.js');
      return;
    }

    // Obtener los primeros 3 fondos
    const tres = ids.slice(0, 3);
    console.log(`\n🔍 Buscando ${tres.length} fondos...`);

    const fondos = await getFondos(tres);

    console.log(`\n✅ Se obtuvieron ${fondos.length} fondos:`);
    fondos.forEach((f, i) => {
      console.log(`\n  ${i + 1}. ${f.nombre}`);
      console.log(`     └─ ${f.fondoPrincipal.nombre} (${f.fondoPrincipal.codigoCNV})`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 3: Búsqueda por nombre
 */
async function example3_searchByName() {
  console.log('\n' + '='.repeat(60));
  console.log('📕 EJEMPLO 3: Buscar fondos por nombre');
  console.log('='.repeat(60));

  try {
    const searchTerm = 'ahorro'; // Búsqueda case-insensitive
    console.log(`\n🔍 Buscando fondos con "${searchTerm}" en el nombre...`);

    const resultados = await searchFondosByName(searchTerm);

    console.log(`\n✅ Se encontraron ${resultados.length} fondos:`);
    resultados.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.nombre} (ID: ${f.id})`);
    });

    if (resultados.length > 5) {
      console.log(`  ... y ${resultados.length - 5} más`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 4: Filtrar por estado (Activo/Inactivo)
 */
async function example4_filterByEstado() {
  console.log('\n' + '='.repeat(60));
  console.log('📙 EJEMPLO 4: Filtrar fondos por Estado');
  console.log('='.repeat(60));

  try {
    console.log('\n🔍 Buscando fondos ACTIVOS (estado = 1)...');

    const activos = await getFondosByEstado('1');

    console.log(`\n✅ Encontrados ${activos.length} fondos activos`);
    console.log('\nPrimeros 5:');
    activos.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.nombre}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 5: Filtrar por tipo de renta
 */
async function example5_filterByTipoRenta() {
  console.log('\n' + '='.repeat(60));
  console.log('📚 EJEMPLO 5: Filtrar fondos por Tipo de Renta');
  console.log('='.repeat(60));

  try {
    // Tipo 4 = Renta Fija
    console.log('\n🔍 Buscando fondos con Renta Fija (tipoRentaId = 4)...');

    const rentaFija = await getFondosByTipoRenta('4');

    console.log(`\n✅ Encontrados ${rentaFija.length} fondos de renta fija`);
    console.log('\nPrimeros 5:');
    rentaFija.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.nombre}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 6: Estadísticas
 */
async function example6_stats() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EJEMPLO 6: Estadísticas');
  console.log('='.repeat(60));

  try {
    const stats = await getStats();
    const ids = await getAllFondoIds();

    console.log('\n✅ Estadísticas de Redis:');
    console.log(`   Total de fondos: ${stats.totalFondos}`);
    console.log(`   Última actualización: ${stats.lastUpdated}`);
    console.log(`   Primeros 5 IDs: ${ids.slice(0, 5).join(', ')}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejecutar todos los ejemplos
 */
async function runAllExamples() {
  console.log('\n🚀 EJEMPLOS DE USO - Redis para Fondos\n');

  // Mostrar configuración
  console.log('⚙️  Configuración:');
  console.log(`   UPSTASH_REDIS_REST_URL: ${process.env.UPSTASH_REDIS_REST_URL ? '✓ Configurada' : '✗ NO CONFIGURADA'}`);
  console.log(`   UPSTASH_REDIS_REST_TOKEN: ${process.env.UPSTASH_REDIS_REST_TOKEN ? '✓ Configurado' : '✗ NO CONFIGURADO'}`);

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('\n❌ Faltan variables de entorno.');
    console.log('   Ejecuta: vercel env pull');
    console.log('   O configura .env.local manualmente\n');
    return;
  }

  // Ejecutar ejemplos
  await example1_getFondoById();
  await example2_getMultipleFondos();
  await example3_searchByName();
  await example4_filterByEstado();
  await example5_filterByTipoRenta();
  await example6_stats();

  console.log('\n' + '='.repeat(60));
  console.log('✨ Ejemplos completados\n');
}

// Ejecutar
runAllExamples().catch((error) => {
  console.error('Error fatal:', error.message);
  process.exit(1);
});
