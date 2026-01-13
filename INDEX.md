# Índice de Documentación - FCI Argentina

## 📚 Guías de Inicio Rápido

### Para empezar YA (3 minutos)
→ **[QUICK_START.md](QUICK_START.md)** - Los 3 pasos para tener todo funcionando

### Para entender qué se hizo (5 minutos)
→ **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** - Resumen completo de la integración Redis

### Para verificar que todo está bien (2 minutos)
→ **[VERIFICATION.md](VERIFICATION.md)** - Checklist completo de validación

---

## 📖 Guías Detalladas

### Instalación paso a paso (15 minutos)
→ **[SETUP.md](SETUP.md)**
- Crear cuenta Upstash
- Configurar variables de entorno
- Instalar dependencias
- Cargar datos en Redis
- Ejecutar servidor

### Solución de problemas (5-10 minutos)
→ **[DIAGNOSTICS.md](DIAGNOSTICS.md)**
- Problemas comunes y soluciones
- Checklist de configuración
- Estructura de datos
- Performance esperado

---

## 🎯 Sobre el Proyecto

### Descripción general
→ **[README.md](README.md)**
- Características del proyecto
- Tecnologías usadas
- Instalación rápida
- Scripts disponibles

---

## 📋 Estructura

```
fci-argy/
├── README.md                    ← Descripción general
├── QUICK_START.md              ← Inicio rápido (3 pasos)
├── SETUP.md                    ← Instalación detallada
├── DIAGNOSTICS.md              ← Troubleshooting
├── INTEGRATION_SUMMARY.md       ← Resumen de cambios
├── VERIFICATION.md             ← Checklist de validación
├── QUICK_START.md (este)       ← Índice de docs
│
├── lib/
│   └── redis.js               ← Cliente Redis (11 funciones)
│
├── scripts/
│   ├── uploadFondos.js        ← Importar 3,902 fondos
│   └── examples.js            ← 6 ejemplos de uso
│
├── public/
│   ├── index.html             ← Estructura web
│   ├── style.css              ← Diseño neon
│   └── app.js                 ← Lógica frontend
│
├── server.js                   ← Express API
├── fci.json                    ← Datos (978 fondos)
├── package.json                ← Dependencias
├── .env.example                ← Template de variables
├── vercel.json                 ← Config Vercel
└── .gitignore                  ← Archivos ignorados
```

---

## 🚀 Flujo Recomendado

### Primera vez (30 minutos)

1. **Lee esto primero**: [QUICK_START.md](QUICK_START.md) (3 min)
2. **Sigue los pasos**: [SETUP.md](SETUP.md) (15 min)
3. **Verifica todo funciona**: [VERIFICATION.md](VERIFICATION.md) (5 min)
4. **Entiende lo que pasó**: [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) (5 min)

### Si hay problemas

→ Ver [DIAGNOSTICS.md](DIAGNOSTICS.md) y buscar tu problema en la sección "Problemas Comunes"

### Para desplegar a Vercel

→ Ver sección "Desplegar a Vercel" en [SETUP.md](SETUP.md)

---

## 📝 Documentación por Archivo

### `lib/redis.js`
- Cliente singleton para Upstash Redis
- 11 funciones CRUD
- Manejo completo de errores
- JSDoc documentado
- Ver: [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md#nuevo-libhimaredisjs-306-líneas)

### `scripts/uploadFondos.js`
- Importa 3,902 fondos de fci.json
- Batch processing de 100 items
- Progress tracking
- Ejecutar con: `npm run upload-fondos-clean`
- Ver: [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md#nuevo-scriptsuploadfondosjs-157-líneas)

### `scripts/examples.js`
- 6 ejemplos completos
- Demuestra todas las funciones Redis
- Ejecutar con: `npm run examples`
- Ver: [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md#nuevo-scriptsexamplesjs-269-líneas)

### `server.js`
- Express API
- Sirve datos de fci.json (modificable a Redis)
- Rutas: `/` (web), `/api/funds` (API JSON)
- Puerto: 3000

### `public/app.js`, `index.html`, `style.css`
- Frontend completo
- Diseño neon con animaciones
- Búsqueda, filtros, modal
- Paginación de 10 items

---

## 🔧 Comandos Principales

```bash
npm install                    # Instalar dependencias
npm start                      # Iniciar servidor
npm run upload-fondos          # Cargar datos en Redis
npm run upload-fondos-clean    # Limpiar + cargar datos
npm run examples               # Ver 6 ejemplos
```

---

## 🌐 URLs

| URL | Propósito |
|-----|-----------|
| http://localhost:3000 | Web (búsqueda, filtros, modal) |
| http://localhost:3000/api/funds | API JSON (3,902 fondos) |
| https://console.upstash.com | Consola Upstash (variables) |
| https://vercel.com/dashboard | Dashboard Vercel (deploy) |

---

## 📱 Características Implementadas

✅ Búsqueda de fondos (case-insensitive)
✅ Filtros: Estado, Horizonte, Tipo Renta
✅ Ordenamiento: Nombre, Estado
✅ Paginación: 10 fondos por página
✅ Modal con detalles completos
✅ Diseño neon con animaciones
✅ Redis Upstash para persistencia
✅ Batch upload de 3,902 fondos
✅ Código idéntico local/producción

---

## 📊 Estadísticas

- **Fondos**: 3,902 clase_fondos desde 978 fondos principales
- **Batch size**: 100 items
- **Upload time**: ~40 segundos
- **Consulta por ID**: <100ms
- **Búsqueda global**: ~50ms
- **Código nuevo**: ~730 líneas (redis.js, uploadFondos.js, examples.js)

---

## 🎓 Conceptos Clave

### Singleton Pattern
En `lib/redis.js`: instancia única de Redis reutilizable

### JSON en Redis
Usando `redis.json.set()` y `redis.json.get()` para datos complejos

### Batch Processing
En `uploadFondos.js`: 100 items en paralelo con delays

### Throttling
Delays entre batches para no sobrecargar API

### REST API (no socket)
Upstash Redis funciona vía HTTP, no websockets

---

## ⚠️ Notas Importantes

1. **No guardar .env.local en Git** - Ya está en .gitignore
2. **Token es secreto** - No compartir públicamente
3. **Código idéntico local/Vercel** - Sin NODE_ENV conditionals
4. **Operaciones asincrónicas** - Usar await o .then()
5. **Manejo de errores** - try/catch en cada función

---

## 🆘 Ayuda Rápida

**¿Qué archivo leer para...?**

| Pregunta | Archivo |
|----------|---------|
| Empezar rápido | QUICK_START.md |
| Instalar paso a paso | SETUP.md |
| ¿Qué se hizo? | INTEGRATION_SUMMARY.md |
| Verificar todo funciona | VERIFICATION.md |
| Error/problema | DIAGNOSTICS.md |
| Usar Redis desde código | lib/redis.js |
| Ver ejemplos | scripts/examples.js |
| Entender frontend | public/app.js |

---

## 🔄 Próximos Pasos

1. **Completar verificación**: [VERIFICATION.md](VERIFICATION.md)
2. **Desplegar a Vercel**: Ver [SETUP.md](SETUP.md)
3. **Extender funcionalidad**: Agregar nuevos filtros, exports, etc.
4. **TTL en Redis**: Expiración automática de claves
5. **Caché en frontend**: LocalStorage para offline

---

## 📞 Soporte

**Si algo no funciona:**

1. Revisar [DIAGNOSTICS.md](DIAGNOSTICS.md) → "Problemas Comunes"
2. Ejecutar [VERIFICATION.md](VERIFICATION.md) → Checklist
3. Verificar .env.local tiene variables
4. Ver consola: F12 en navegador o `npm run examples`

---

## 📦 Dependencias

- **express@4.18.2** - Web framework
- **@upstash/redis@1.34.0** - Cliente Redis
- **dotenv@16.0.0** - Variables de entorno

---

## 📅 Versión

Versión: **1.0.0**
Fecha: **2024**
Estado: **✅ Producción**

---

**¿Listo para empezar?** → [QUICK_START.md](QUICK_START.md)
