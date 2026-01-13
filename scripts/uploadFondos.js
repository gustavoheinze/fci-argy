/**
 * Script para subir los 3,902 fondos a Upstash Redis
 * Uso: node scripts/uploadFondos.js
 * 
 * Este script:
 * 1. Lee fci.json
 * 2. Flattena los clase_fondos (igual que el servidor)
 * 3. Los sube por batches de 100 para no saturar la API
 * 4. Muestra progreso
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const {
  saveFondo,
  clearAllFondos,
  getStats,
} = require('../lib/redis');

/**
 * Lee y flattena los fondos del JSON
 */
function loadAndFlattenFondos() {
  try {
    const filePath = path.join(__dirname, '../fci.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(rawData);

    const fondosFlattened = [];
    
    jsonData.data.forEach((fondo) => {
      if (fondo.clase_fondos && fondo.clase_fondos.length > 0) {
        fondo.clase_fondos.forEach((claseFondo) => {
          fondosFlattened.push({
            ...claseFondo,
            fondoPrincipal: {
              id: fondo.id,
              nombre: fondo.nombre,
              codigoCNV: fondo.codigoCNV,
              objetivo: fondo.objetivo,
              estado: fondo.estado,
              monedaId: fondo.monedaId,
              diasLiquidacion: fondo.diasLiquidacion,
              regionVieja: fondo.regionVieja,
              horizonteViejo: fondo.horizonteViejo,
              tipoRentaId: fondo.tipoRentaId,
              clasificacionVieja: fondo.clasificacionVieja,
              inicio: fondo.inicio,
              updatedAt: fondo.updatedAt,
              gerente: fondo.gerente,
              depositaria: fondo.depositaria,
              tipoRenta: fondo.tipoRenta,
            },
          });
        });
      }
    });

    return fondosFlattened;
  } catch (error) {
    console.error('Error cargando fondos:', error.message);
    throw error;
  }
}

/**
 * Sube fondos en batches
 */
async function uploadFondosInBatches(fondos, batchSize = 100) {
  console.log(`\n📦 Iniciando carga de ${fondos.length} fondos...`);
  console.log(`⚙️  Tamaño de batch: ${batchSize}`);
  
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < fondos.length; i += batchSize) {
    const batch = fondos.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(fondos.length / batchSize);

    console.log(
      `\n📤 Cargando batch ${batchNumber}/${totalBatches} (${batch.length} fondos)...`
    );

    try {
      // Procesar en paralelo dentro del batch
      const promises = batch.map((fondo) =>
        saveFondo(fondo.id, fondo)
          .then(() => {
            successCount++;
            process.stdout.write('.');
          })
          .catch((error) => {
            errorCount++;
            console.error(`\n❌ Error en fondo ${fondo.id}: ${error.message}`);
          })
      );

      await Promise.all(promises);
      console.log(
        ` ✓ Batch ${batchNumber} completado (${successCount}/${fondos.length})`
      );

      // Pequeña pausa entre batches para no saturar
      if (i + batchSize < fondos.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error procesando batch ${batchNumber}:`, error.message);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Carga completada en ${duration}s`);
  console.log(`📊 Exitosos: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`${'='.repeat(50)}`);

  return { successCount, errorCount };
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Script de carga de fondos a Upstash Redis');
    console.log('URL:', process.env.UPSTASH_REDIS_REST_URL ? '✓ Configurada' : '✗ NO CONFIGURADA');
    console.log('Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✓ Configurado' : '✗ NO CONFIGURADO');

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Faltan variables de entorno. Ejecuta: vercel env pull');
    }

    // Cargar fondos
    console.log('\n📖 Cargando fondos desde fci.json...');
    const fondos = loadAndFlattenFondos();
    console.log(`✓ ${fondos.length} fondos cargados`);

    // Preguntar si limpiar primero (opcional)
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      console.log('\n🗑️  Limpiando fondos anteriores...');
      await clearAllFondos();
      console.log('✓ Limpieza completada');
    }

    // Subir fondos
    await uploadFondosInBatches(fondos, 100);

    // Mostrar estadísticas
    console.log('\n📈 Estadísticas finales:');
    const stats = await getStats();
    console.log(`Total de fondos en Redis: ${stats.totalFondos}`);
    console.log(`Última actualización: ${stats.lastUpdated}`);

    console.log('\n✨ ¡Listo! Los fondos están disponibles en Upstash Redis');
  } catch (error) {
    console.error('\n💥 Error fatal:', error.message);
    process.exit(1);
  }
}

main();
