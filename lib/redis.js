/**
 * Upstash Redis Singleton
 * Funciona igual en local (con .env.local) y en Vercel
 * Variables de entorno requeridas:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

const { Redis } = require('@upstash/redis');

let redisInstance = null;

/**
 * Obtiene o crea la instancia singleton de Redis
 */
function getRedis() {
  if (redisInstance) {
    return redisInstance;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Variables de entorno faltantes: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN'
    );
  }

  redisInstance = new Redis({
    url,
    token,
  });

  return redisInstance;
}

/**
 * Guarda un fondo completo (clase_fondo) en Redis
 * Clave: "fondo:{id}"
 * Usa JSON para almacenar la estructura completa
 */
async function saveFondo(fondoId, fondoData) {
  try {
    const redis = getRedis();
    const key = `fondo:${fondoId}`;
    
    // Guardar con JSON.SET para mantener estructura
    await redis.json.set(key, '$', fondoData);
    
    // Opcionalmente, agregar a un índice de IDs
    await redis.sadd('fondos:ids', fondoId);
    
    return { success: true, id: fondoId };
  } catch (error) {
    console.error(`Error guardando fondo ${fondoId}:`, error.message);
    throw error;
  }
}

/**
 * Obtiene un fondo por su ID
 */
async function getFondo(fondoId) {
  try {
    const redis = getRedis();
    const key = `fondo:${fondoId}`;
    
    // JSON.GET retorna el objeto completo
    const fondo = await redis.json.get(key);
    
    if (!fondo) {
      return null;
    }
    
    return fondo;
  } catch (error) {
    console.error(`Error obteniendo fondo ${fondoId}:`, error.message);
    throw error;
  }
}

/**
 * Obtiene múltiples fondos por sus IDs
 */
async function getFondos(fondoIds) {
  try {
    const redis = getRedis();
    const promises = fondoIds.map((id) => getFondo(id));
    const fondos = await Promise.all(promises);
    
    // Filtrar nulls (fondos que no existen)
    return fondos.filter((f) => f !== null);
  } catch (error) {
    console.error('Error obteniendo múltiples fondos:', error.message);
    throw error;
  }
}

/**
 * Obtiene todos los IDs de fondos guardados
 */
async function getAllFondoIds() {
  try {
    const redis = getRedis();
    const ids = await redis.smembers('fondos:ids');
    return ids || [];
  } catch (error) {
    console.error('Error obteniendo todos los IDs:', error.message);
    throw error;
  }
}

/**
 * Obtiene todos los fondos (puede ser lento si hay muchos)
 */
async function getAllFondos() {
  try {
    const ids = await getAllFondoIds();
    return await getFondos(ids);
  } catch (error) {
    console.error('Error obteniendo todos los fondos:', error.message);
    throw error;
  }
}

/**
 * Filtra fondos por atributo (búsqueda simple en memoria)
 * Usa una estructura específica: guardamos índices invertidos opcionales
 */
async function searchFondosByName(searchTerm) {
  try {
    const fondos = await getAllFondos();
    const lowerSearch = searchTerm.toLowerCase();
    
    return fondos.filter(
      (f) =>
        (f.nombre && f.nombre.toLowerCase().includes(lowerSearch)) ||
        (f.fondoPrincipal &&
          f.fondoPrincipal.nombre &&
          f.fondoPrincipal.nombre.toLowerCase().includes(lowerSearch))
    );
  } catch (error) {
    console.error('Error buscando fondos:', error.message);
    throw error;
  }
}

/**
 * Filtra por estado (Activo/Inactivo)
 */
async function getFondosByEstado(estado) {
  try {
    const fondos = await getAllFondos();
    return fondos.filter((f) => f.fondoPrincipal.estado === estado);
  } catch (error) {
    console.error('Error filtrando por estado:', error.message);
    throw error;
  }
}

/**
 * Filtra por tipo de renta
 */
async function getFondosByTipoRenta(tipoRentaId) {
  try {
    const fondos = await getAllFondos();
    return fondos.filter((f) => f.fondoPrincipal.tipoRentaId === tipoRentaId);
  } catch (error) {
    console.error('Error filtrando por tipo de renta:', error.message);
    throw error;
  }
}

/**
 * Elimina un fondo
 */
async function deleteFondo(fondoId) {
  try {
    const redis = getRedis();
    const key = `fondo:${fondoId}`;
    
    await redis.del(key);
    await redis.srem('fondos:ids', fondoId);
    
    return { success: true, id: fondoId };
  } catch (error) {
    console.error(`Error eliminando fondo ${fondoId}:`, error.message);
    throw error;
  }
}

/**
 * Limpia toda la base de datos de fondos
 * ¡CUIDADO! Operación irreversible
 */
async function clearAllFondos() {
  try {
    const redis = getRedis();
    const ids = await getAllFondoIds();
    
    // Eliminar cada fondo
    for (const id of ids) {
      await deleteFondo(id);
    }
    
    return { success: true, deleted: ids.length };
  } catch (error) {
    console.error('Error limpiando fondos:', error.message);
    throw error;
  }
}

/**
 * Obtiene estadísticas
 */
async function getStats() {
  try {
    const ids = await getAllFondoIds();
    return {
      totalFondos: ids.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error.message);
    throw error;
  }
}

module.exports = {
  getRedis,
  saveFondo,
  getFondo,
  getFondos,
  getAllFondoIds,
  getAllFondos,
  searchFondosByName,
  getFondosByEstado,
  getFondosByTipoRenta,
  deleteFondo,
  clearAllFondos,
  getStats,
};
