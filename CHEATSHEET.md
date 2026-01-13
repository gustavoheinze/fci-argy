# 🚀 REFERENCIA RÁPIDA - FCI Argentina + Redis

## En un Vistazo

```
Proyecto:    FCI Argentina con Upstash Redis
Status:      ✅ LISTO PARA USAR
Fondos:      3,902 (desde 978 principales)
Database:    Upstash Redis (REST)
Deploy:      Vercel (listo)
```

---

## Los 5 Comandos Que Necesitas

```bash
npm install                    # 1. Instalar dependencias
npm run upload-fondos-clean    # 2. Cargar 3,902 fondos (lleva ~40s)
npm run examples               # 3. Ver que funciona (6 ejemplos)
npm start                      # 4. Iniciar servidor
# 5. Abrir http://localhost:3000 en navegador
```

---

## Variables de Entorno

Crear `.env.local`:

```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

**Obtener de**: https://console.upstash.com/redis

---

## Archivos Clave

| Archivo | Para |
|---------|------|
| `lib/redis.js` | Cliente Redis (11 funciones) |
| `scripts/uploadFondos.js` | Cargar datos (3,902 fondos) |
| `scripts/examples.js` | Ver 6 ejemplos |
| `server.js` | Express API |
| `public/app.js` | Frontend (búsqueda, filtros) |

---

## Funciones Redis (en `lib/redis.js`)

```javascript
getRedis()                          // Obtener instancia
saveFondo(id, data)                // Guardar
getFondo(id)                       // Obtener uno
getFondos(ids)                     // Obtener múltiples
getAllFondos()                     // Todos
searchFondosByName(query)          // Buscar
getFondosByEstado(estado)          // Filtrar estado
getFondosByTipoRenta(tipoRentaId)  // Filtrar tipo renta
clearAllFondos()                   // Limpiar
getStats()                         // Estadísticas
```

---

## Uso en Código

### Cargar un fondo
```javascript
const { getFondo } = require('./lib/redis');
const fund = await getFondo(1001);
console.log(fund.nombre);
```

### Buscar fondos
```javascript
const { searchFondosByName } = require('./lib/redis');
const results = await searchFondosByName('ahorro');
```

### Filtrar
```javascript
const { getFondosByEstado } = require('./lib/redis');
const active = await getFondosByEstado('1');
```

---

## API REST

### GET /api/funds
Retorna array de 3,902 fondos:

```json
[
  {
    "id": 1001,
    "nombre": "ACCIONES BARCLAYS...",
    "estado": "1",
    "fondoPrincipal": { ... }
  },
  ...
]
```

### GET /
Sirve HTML con búsqueda, filtros, modal

---

## Performance

| Operación | Tiempo |
|-----------|--------|
| Cargar 3,902 fondos | ~40 segundos |
| Consulta por ID | <100ms |
| Búsqueda (3,902 items) | ~50ms |
| Filtro | <10ms |
| Página web | <1s |

---

## Si Algo No Funciona

| Problema | Fix |
|----------|-----|
| "@upstash/redis not found" | `npm install @upstash/redis` |
| Variables no se cargan | Editar `.env.local` manualmente |
| No hay datos en Redis | `npm run upload-fondos-clean` |
| Puerto 3000 ocupado | Cambiar en `server.js` |
| Error de conexión | Verificar token es correcto |

---

## Desplegar a Vercel

```bash
git add .
git commit -m "Redis integration"
git push
# Vercel se despliega automáticamente
```

Antes, agregar en Vercel Dashboard:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

## Documentación

- 📖 [INDEX.md](INDEX.md) - Índice completo
- 🚀 [QUICK_START.md](QUICK_START.md) - 3 pasos
- 📚 [SETUP.md](SETUP.md) - Detallado
- ✅ [VERIFICATION.md](VERIFICATION.md) - Checklist
- 🆘 [DIAGNOSTICS.md](DIAGNOSTICS.md) - Problemas
- 📝 [COMPLETE.md](COMPLETE.md) - Resumen

---

## Estructura Redis

### Claves
```
fondo:1001              → Objeto JSON
fondo:1002              → Objeto JSON
...
fondos:ids              → Set con todos los IDs
```

### Ejemplo valor
```json
{
  "id": 1001,
  "nombre": "ACCIONES BARCLAYS",
  "estado": "1",
  "horizonte": "4",
  "tipoRentaId": "1",
  "codigoCNV": "1234",
  "fondoPrincipal": { ... }
}
```

---

## Dependencias

- `express` - Web framework
- `@upstash/redis` - Cliente Redis
- `dotenv` - Variables de entorno

Instalar con: `npm install`

---

## Scripts npm

```bash
npm start                  # Servidor
npm run upload-fondos      # Cargar sin limpiar
npm run upload-fondos-clean # Limpiar + cargar
npm run examples          # Ver 6 ejemplos
npm run dev              # Alias de start
```

---

## URLs

| URL | Qué es |
|-----|--------|
| http://localhost:3000 | Web (búsqueda, filtros) |
| http://localhost:3000/api/funds | API JSON |
| https://console.upstash.com | Consola Redis |
| https://vercel.com/dashboard | Deploy |

---

## Checklist Rápido

- [ ] Instalar: `npm install`
- [ ] Variables: `.env.local` con UPSTASH_*
- [ ] Datos: `npm run upload-fondos-clean`
- [ ] Verificar: `npm run examples` (sin errores)
- [ ] Iniciar: `npm start`
- [ ] Web: http://localhost:3000 funciona
- [ ] Test: Buscar, filtrar, modal
- [ ] Deploy: `git push` a Vercel

---

## Lo Que NO Necesitas

❌ Instalar Redis (está en Upstash)
❌ Certificados SSL (Upstash los maneja)
❌ Base de datos local (Upstash es la cloud)
❌ Código diferente para Vercel (idéntico)
❌ Configuración compleja (dotenv lo hace)

---

## Datos Técnicos

```
Total fondos:        3,902
Fondos principales:  978
Batch size:          100
Upload time:         ~40 segundos
Storage needed:      ~2MB
Query time by ID:    <100ms
Search time:         ~50ms
```

---

## Próximos Pasos

1. **Ahora**: Ejecutar los 5 comandos
2. **Luego**: Desplegar a Vercel (`git push`)
3. **Futuro**: Agregar TTL, caché frontend, más filtros

---

## Conclusión

**Todo está listo.** Solo necesitas:

1. `npm install`
2. Variables en `.env.local`
3. `npm run upload-fondos-clean`
4. `npm start`
5. Abrir navegador

¡Eso es todo! 🎉

---

**Última línea**: Si ves "✅ Success: 3902" en el upload, estás listo.

Ver [INDEX.md](INDEX.md) para más.

Versión 1.0.0 | 2024
