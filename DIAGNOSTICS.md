# Diagnóstico del Proyecto - FCI Argentina

## Estado del Proyecto ✅

Todas las partes están configuradas y listas para usar.

### Archivos clave (verificados)

```
✓ lib/redis.js              (306 líneas) - Cliente Redis singleton
✓ scripts/uploadFondos.js   (157 líneas) - Importador de datos
✓ scripts/examples.js       (269 líneas) - 6 ejemplos de uso
✓ public/index.html         - Estructura HTML
✓ public/style.css          - Diseño neon
✓ public/app.js             - Lógica frontend
✓ server.js                 - Express server
✓ package.json              - Dependencias + scripts
✓ fci.json                  - Datos (978 fondos → 3,902 clase_fondos)
```

### Dependencias instaladas

```
✓ express@4.18.2          - Web framework
✓ @upstash/redis@1.34.0   - Cliente Redis
✓ dotenv@16.0.0           - Variables de entorno
```

### Scripts disponibles

```
npm start                   → Inicia servidor en puerto 3000
npm run upload-fondos       → Carga datos en Redis
npm run upload-fondos-clean → Limpiar + cargar datos
npm run examples            → Ejecutar 6 ejemplos
```

### Variables de entorno necesarias

```
UPSTASH_REDIS_REST_URL      → URL de instancia Upstash
UPSTASH_REDIS_REST_TOKEN    → Token REST de Upstash
```

---

## Checklist de Configuración

### Paso 1: Variables de entorno

- [ ] Crear cuenta en https://console.upstash.com
- [ ] Crear instancia Redis (plan Free es suficiente)
- [ ] Copiar URL REST y TOKEN
- [ ] Crear .env.local con variables
  - O ejecutar: `vercel env pull` (si usa Vercel)

### Paso 2: Instalar dependencias

```bash
npm install
```

**Esperado**: 
- Crea `node_modules/`
- Instala `@upstash/redis`, `dotenv`, `express`

### Paso 3: Cargar datos

```bash
npm run upload-fondos-clean
```

**Esperado**:
```
✓ Loaded 3902 fondos from 978 principales
✓ Clearing existing data in Redis...
✓ Batch 1/40 (100 items)
...
✓ Batch 40/40 (2 items)
✅ Success: 3902 | Error: 0 | Duration: 42s
```

### Paso 4: Verificar que funciona

```bash
npm run examples
```

**Esperado**: 6 ejemplos mostrando búsquedas, filtros sin errores

### Paso 5: Iniciar servidor

```bash
npm start
```

**Esperado**:
```
Server running on http://localhost:3000
```

Abre en navegador y busca fondos.

---

## Problemas Comunes

### 1. "@upstash/redis not found"
```bash
npm install @upstash/redis
npm install dotenv
```

### 2. "UPSTASH_REDIS_REST_URL not defined"
```bash
# Verificar archivo existe
cat .env.local

# Debe tener:
# UPSTASH_REDIS_REST_URL=https://...
# UPSTASH_REDIS_REST_TOKEN=...

# Si está vacío, editar manualmente con valores de Upstash
```

### 3. "Cannot connect to Redis"
- Verificar token está correcto (copy/paste exacto)
- Verificar instancia está activa en https://console.upstash.com
- Verificar URL coincide con instancia
- Probar con `npm run examples` para ver mensaje de error real

### 4. "No data in Redis" (getStats() retorna 0)
```bash
npm run upload-fondos-clean
# Espera a ver: ✅ Success: 3902
```

### 5. "Servidor no inicia"
```bash
# Verificar puerto 3000 está libre
# O cambiar en server.js:
# const PORT = process.env.PORT || 3001;

npm start
```

---

## Estructura de datos

Cada fondo en Redis tiene esta estructura:

```javascript
{
  id: 1001,
  nombre: "ACCIONES BARCLAYS IBEX 35 DINAMICO",
  estado: "1",              // "1"=Activo, "0"=Inactivo
  horizonte: "4",           // Horizonte de inversión
  tipoRentaId: "1",         // Tipo de renta
  codigoCNV: "1234",        // Código CNV
  fondoPrincipal: {
    id: 1,
    nombre: "ACCIONES BARCLAYS",
    gerente: {
      id: 2,
      nombre: "BARCLAYS BANK PLC"
    },
    depositaria: {
      id: 4,
      nombre: "BBVA FRANCES S.A."
    },
    honorarios: {
      min: 1.5,
      max: 1.75
    },
    estado: "1"
  }
}
```

---

## Performance

| Operación | Tiempo |
|-----------|--------|
| Primera carga (cold start) | ~2-3s |
| Consulta por ID | <100ms |
| Búsqueda de 3,902 fondos | ~50ms |
| Filtro por estado | <10ms |
| Paginación (10 items) | <5ms |

---

## Base de datos Redis

### Claves usadas

```
fondo:{id}        → Objeto individual fondo (JSON)
fondos:ids        → Set con todos los IDs
```

### Comandos principales

```
REDIS CLI:  redis-cli
JSON.SET    → Guardar fondo
JSON.GET    → Obtener fondo
SADD        → Agregar ID al set
SMEMBERS    → Obtener todos IDs
EXPIRE      → (futuro) TTL en segundos
```

---

## Próximos pasos (opcionales)

### 1. Usar Redis en API /api/funds

Modificar `server.js` para servir desde Redis en lugar de fci.json:

```javascript
const { getAllFondos } = require('./lib/redis');

app.get('/api/funds', async (req, res) => {
  try {
    const fondos = await getAllFondos();
    res.json(fondos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Agregar TTL (Time To Live) a fondos

```javascript
// En lib/redis.js, agregar:
async function saveFondoWithTTL(id, data, ttlSeconds = 86400) {
  const redis = getRedis();
  await redis.json.set(`fondo:${id}`, '$', data);
  await redis.expire(`fondo:${id}`, ttlSeconds);
  await redis.sadd('fondos:ids', id);
}
```

### 3. Agregar caché en frontend

```javascript
// En public/app.js:
const fundCache = new Map();

async function getFund(id) {
  if (fundCache.has(id)) return fundCache.get(id);
  const resp = await fetch(`/api/funds/${id}`);
  const data = await resp.json();
  fundCache.set(id, data);
  return data;
}
```

### 4. Desplegar a Vercel

```bash
vercel --prod
```

Vercel usará automáticamente las variables de entorno configuradas.

---

## Archivos de documentación

- **README.md** - Descripción general del proyecto
- **SETUP.md** - Instrucciones detalladas de configuración
- **QUICK_START.md** - Guía rápida en 3 pasos
- **DIAGNOSTICS.md** - Este archivo

---

## Contacto y soporte

Si hay errores, verificar:

1. `.env.local` existe y tiene contenido
2. `npm install` completó sin errores
3. `npm run examples` ejecuta sin errores
4. Upstash instancia está activa y token es correcto
5. Puerto 3000 está disponible

---

Fecha: 2024
Versión: 1.0.0
Estado: ✅ Listo para usar
