# Guía de Configuración - FCI Argentina Redis

## Paso 1: Crear cuenta en Upstash (si no la tiene)

1. Ir a https://console.upstash.com
2. Crear cuenta (email/GitHub)
3. Crear nueva base de datos Redis
   - Nombre: `fci-argentina` (o el que prefiera)
   - Región: Latinoamérica (ar1) o la más cercana
   - Plan: Free (suficiente para desarrollo)
4. Una vez creada, aparecerá un botón "REST API"
5. Copiar y guardar:
   - `UPSTASH_REDIS_REST_URL`: URL de la instancia
   - `UPSTASH_REDIS_REST_TOKEN`: Token REST

## Paso 2: Configurar variables en local

### Opción A: Con Vercel CLI (recomendado)

```bash
# 1. Instalar Vercel CLI si no lo tiene
npm install -g vercel

# 2. Conectar proyecto a Vercel (si no lo está)
vercel link

# 3. Agregar variables de entorno en Vercel Dashboard
# - Ir a https://vercel.com/dashboard
# - Seleccionar proyecto
# - Settings → Environment Variables
# - Agregar:
#   UPSTASH_REDIS_REST_URL = [tu-url]
#   UPSTASH_REDIS_REST_TOKEN = [tu-token]

# 4. Descargar variables a .env.local
vercel env pull
```

### Opción B: Manual (sin Vercel)

```bash
# 1. Crear archivo .env.local
echo "UPSTASH_REDIS_REST_URL=https://..." > .env.local
echo "UPSTASH_REDIS_REST_TOKEN=..." >> .env.local

# 2. Editar .env.local con sus valores reales
```

## Paso 3: Instalar dependencias

```bash
npm install
```

Espere a que instale `@upstash/redis` y `dotenv`.

## Paso 4: Cargar datos en Redis (IMPORTANTE)

Primera ejecución - limpia Redis y carga los 3,902 fondos:

```bash
npm run upload-fondos-clean
```

Salida esperada:
```
Loading fondos from fci.json...
✓ Loaded 3902 fondos from 978 principales
Clearing existing data in Redis...
✓ Cleared 0 records
Uploading in batches of 100...
✓ Batch 1/40 (100 items)
✓ Batch 2/40 (100 items)
...
✓ Batch 40/40 (2 items)
✅ Success: 3902 | Error: 0 | Duration: 42s
Stats: 3902 fondos en Redis
```

Si ya tiene datos y no quiere limpiar:
```bash
npm run upload-fondos
```

## Paso 5: Verificar que está funcionando

### Opción A: Ejecutar ejemplos

```bash
npm run examples
```

Salida esperada: 6 ejemplos mostrando búsquedas, filtros, etc.

### Opción B: Iniciar servidor

```bash
npm start
```

- Abre http://localhost:3000
- Busca fondos, usa filtros
- Si ves datos, ¡está funcionando!

## Paso 6: Desplegar a Vercel (opcional)

```bash
# Si está usando Git
git add .
git commit -m "Add Redis integration"
git push

# O deployar directamente
vercel --prod
```

Vercel usará automáticamente las variables de entorno que configuró antes.

## Solución de problemas comunes

### Error: "Cannot find module '@upstash/redis'"

```bash
npm install @upstash/redis
npm install dotenv
```

### Error: "UPSTASH_REDIS_REST_URL not found"

El archivo `.env.local` no existe o está vacío.

```bash
# Verificar contenido
cat .env.local

# Si está vacío o no existe:
vercel env pull

# O crear manualmente:
echo "UPSTASH_REDIS_REST_URL=https://..." > .env.local
echo "UPSTASH_REDIS_REST_TOKEN=..." >> .env.local
```

### Error al conectar a Redis: "401 Unauthorized"

El token está mal copiado o expiró.

1. Ir a https://console.upstash.com
2. Seleccionar tu instancia Redis
3. Copiar nuevamente el REST URL y TOKEN
4. Actualizar `.env.local`
5. Intentar de nuevo: `npm run upload-fondos-clean`

### Datos no aparecen en navegador

```bash
# 1. Verificar que hay datos en Redis
npm run examples

# Debe mostrar: "6 items" en cada búsqueda

# 2. Si muestra 0:
npm run upload-fondos-clean

# 3. Reiniciar servidor
npm start
```

### "Error: ENOENT: no such file or directory, open 'fci.json'"

El archivo `fci.json` no existe o está en carpeta equivocada.

```bash
# Verificar estructura:
ls -la

# Debe haber:
# - fci.json
# - server.js
# - package.json
# - lib/
# - scripts/
# - public/
```

### Servidor no inicia en Vercel

Las variables de entorno no se sincronizaron correctamente.

1. Ir a Vercel Dashboard → Proyecto → Settings
2. Environment Variables
3. Verificar que UPSTASH_REDIS_REST_URL y TOKEN están presentes
4. Hacer re-deploy: `git push` o botón "Redeploy" en Vercel

## Estructura esperada después de setup

```
fci-argy/
├── .env.local                 # Variables (NO commitear a Git)
├── .env.example              # Template de variables
├── .gitignore                # Ignora .env.local
├── package.json
├── package-lock.json
├── fci.json                  # Datos (978 fondos)
├── server.js                 # Express
├── README.md
├── SETUP.md (este archivo)
├── lib/
│   └── redis.js              # Cliente Redis
├── scripts/
│   ├── uploadFondos.js       # Importer de datos
│   └── examples.js           # Ejemplos de uso
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Archivos a NO commitear a Git

Crear/actualizar `.gitignore`:

```
node_modules/
.env.local
.env
*.log
.vercel
dist/
build/
```

## Verificación final

Si llegó aquí, debería poder:

```bash
✓ npm install              # Instalar dependencias
✓ npm run upload-fondos-clean   # Cargar datos
✓ npm run examples         # Ver ejemplos funcionando
✓ npm start               # Ver web en http://localhost:3000
✓ Buscar fondos           # Filtrar y paginar
✓ Hacer click en fondo    # Ver detalles en modal
```

¡Si todo funciona, está listo para usar Redis en producción!

## Siguiente paso

Modificar `server.js` para servir datos desde Redis en lugar de fci.json:

```javascript
// En lugar de:
// const jsonData = require('./fci.json');

// Usar:
// const { getAllFondos } = require('./lib/redis');
// app.get('/api/funds', async (req, res) => {
//   const fondos = await getAllFondos();
//   res.json(fondos);
// });
```

Ver documentación en `lib/redis.js` para más detalles.
