# FCI Argentina - Fondos Comunes de Inversión

Aplicación innovadora estilo **Fintech Terminal** para explorar, filtrar y consultar fondos comunes de inversión argentinos con diseño inmersivo y almacenamiento en Redis.

## Características

- 🌌 **The Terminal Design**: Estética inmersiva con fondo aurora dinámico, hyper-glassmorphism y una interfaz de alto rendimiento.
- 🔍 **Búsqueda y Filtros**: Filtrar por riesgo (Bajo/Medio/Alto), tipo de renta, moneda, horizonte y estado.
- 📊 **3,902 Fondos**: Visualización de clase_fondos completa con grilla interactiva y panel lateral de detalles.
- 🔗 **Fuente de Datos**: Sincronizado con los datos oficiales de la [CAFCI](https://www.cafci.org.ar/consulta-de-fondos.html).
- 💾 **Redis Upstash**: Caché distribuido para alto rendimiento.
- 🚀 **Production Ready**: Optimizado para despliegues rápidos en Vercel.

## Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: HTML5 + CSS3 + JavaScript Vanilla
- **Base de Datos**: Upstash Redis (REST API)
- **Hosting**: Vercel (ready to deploy)

## Instalación Rápida

### 1. Preparar proyecto

```bash
npm install
```

### 2. Configurar variables de entorno

Si usa Vercel:
```bash
vercel env pull
```

Si es local manual, cree `.env.local`:
```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

Obtenga credenciales en: https://console.upstash.com/redis

### 3. Cargar datos (primera vez)

```bash
npm run upload-fondos-clean
```

Salida esperada: `✅ Success: 3902 | Error: 0 | Duration: 42s`

### 4. Ejecutar servidor

```bash
npm start
```

Abre http://localhost:3000

## Scripts disponibles

```bash
npm start                      # Inicia servidor (puerto 3000)
npm run upload-fondos          # Carga datos sin limpiar Redis
npm run upload-fondos-clean    # Limpia Redis y carga datos
npm run examples               # Ejecuta 6 ejemplos de API Redis
```

## Funciones de API

Disponibles en `lib/redis.js`:

- `getRedis()` - Instancia singleton
- `saveFondo(id, data)` - Guardar fondo
- `getFondo(id)` - Obtener un fondo
- `getFondos(ids)` - Obtener múltiples fondos
- `getAllFondos()` - Todos los fondos
- `searchFondosByName(query)` - Buscar por nombre
- `getFondosByEstado(estado)` - Filtrar por estado
- `getFondosByTipoRenta(tipoRentaId)` - Filtrar por tipo renta
- `clearAllFondos()` - Limpiar todo
- `getStats()` - Estadísticas

## Estructura

```
├── server.js              # Express server
├── fci.json              # Datos (978 fondos → 3,902 clase_fondos)
├── lib/redis.js          # Cliente Redis singleton
├── scripts/
│   ├── uploadFondos.js   # Importar datos en batches de 100
│   └── examples.js       # 6 ejemplos de uso
└── public/               # Frontend (HTML, CSS, JS)
```

## Solución de problemas

| Problema | Solución |
|----------|----------|
| "@upstash/redis not found" | `npm install @upstash/redis` |
| "ENV variables undefined" | `vercel env pull` o editar `.env.local` |
| "No data in Redis" | `npm run upload-fondos-clean` |
| "Lentitud en primer acceso" | Normal: caché se calienta (2-3s), rápido después |

## Licencia

ISC
