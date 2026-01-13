# Verificación Final - FCI Argentina + Redis

## Pre-ejecución

### ✓ Verificar archivos existen

```bash
# En terminal PowerShell:
cd c:\proyectos\fci-argy

# Verificar estructura
Test-Path lib/redis.js                      # Debe ser True
Test-Path scripts/uploadFondos.js          # Debe ser True
Test-Path scripts/examples.js              # Debe ser True
Test-Path public/index.html                # Debe ser True
Test-Path public/app.js                    # Debe ser True
Test-Path public/style.css                 # Debe ser True
Test-Path fci.json                         # Debe ser True
Test-Path package.json                     # Debe ser True
```

### ✓ Verificar fci.json contiene datos

```bash
# Contar objetos en fci.json
node -e "const d=require('./fci.json'); console.log('Fondos:', d.data.length); console.log('Clase fondos:', d.data.reduce((a,f)=>a+f.clase_fondos.length, 0));"

# Esperado:
# Fondos: 978
# Clase fondos: 3902
```

### ✓ Verificar package.json tiene dependencias

```bash
# Checar contenido
cat package.json | findstr "@upstash/redis"    # Debe encontrar

# Esperado: "@upstash/redis": "^1.34.0"
```

---

## Instalación

### ✓ Paso 1: npm install

```bash
npm install

# Esperado:
# - Crea node_modules/
# - Instala express, @upstash/redis, dotenv
# - Sin errores
```

Verificar:
```bash
Test-Path node_modules/express/           # True
Test-Path node_modules/@upstash/redis/    # True
Test-Path node_modules/dotenv/            # True
```

### ✓ Paso 2: Crear .env.local

```bash
# Crear archivo con variables
echo "UPSTASH_REDIS_REST_URL=https://..." > .env.local
echo "UPSTASH_REDIS_REST_TOKEN=..." >> .env.local

# Verificar
cat .env.local   # Debe mostrar 2 líneas con valores
```

**Obtener valores de**: https://console.upstash.com/redis
1. Seleccionar instancia
2. Botón "REST API"
3. Copiar URL y TOKEN exactamente

---

## Cargar Datos

### ✓ Paso 3: Subir 3,902 fondos

```bash
npm run upload-fondos-clean

# Esperado:
# ✓ Loaded 3902 fondos from 978 principales
# ✓ Clearing existing data in Redis...
# ✓ Batch 1/40 (100 items)
# ✓ Batch 2/40 (100 items)
# ...
# ✓ Batch 40/40 (2 items)
# ✅ Success: 3902 | Error: 0 | Duration: 42s
```

**Si falla**:
- Verificar .env.local tiene valores
- Verificar URL y TOKEN son exactos
- Verificar instancia Redis está activa
- Ver más detalles: `npm run upload-fondos-clean 2>&1 | more`

---

## Verificación Funcional

### ✓ Paso 4: Ejecutar ejemplos

```bash
npm run examples

# Esperado (sin errores):
# ✓ Config: Redis connected
# 🔍 Example 1: Get single fondo (ID: 1001)
#   Nombre: ACCIONES BARCLAYS IBEX 35 DINAMICO
#   Estado: Activo
# ✅ Result: Found
# ...
# 🔍 Example 6: Get stats
#   Total: 3902
#   Timestamp: 2024-...
# ✅ Result: Success
```

**Checklist de salida**:
- [ ] Muestra "Config: Redis connected"
- [ ] 6 ejemplos executados
- [ ] Todos terminan con ✅ Result: Success
- [ ] No hay mensaje de error rojo
- [ ] Muestra "Total: 3902" en stats

### ✓ Paso 5: Iniciar servidor web

```bash
npm start

# Esperado:
# Server running on http://localhost:3000
# (Espera sin errores)
```

En navegador: Abrir **http://localhost:3000**

**Checklist visual**:
- [ ] Página carga (no es blanca vacía)
- [ ] Se ve la búsqueda
- [ ] Se ven 10 fondos en la lista
- [ ] Los fondos tienen nombre y estado
- [ ] Paginación muestra "Page 1 of 391"
- [ ] No hay errores en consola (F12)

### ✓ Paso 6: Test interactivo

En la web (http://localhost:3000):

**Test 1: Búsqueda**
- [ ] Escribe "ahorro" en búsqueda
- [ ] Presiona Enter
- [ ] Aparecen fondos con "ahorro" en nombre

**Test 2: Filtros**
- [ ] Selecciona "Activo" en Estado
- [ ] Cambia cantidad de resultados
- [ ] Click en un fondo
- [ ] Abre modal con detalles

**Test 3: Paginación**
- [ ] Click en "Next"
- [ ] Cambia a página 2
- [ ] Muestra otros 10 fondos
- [ ] Click en "Previous"
- [ ] Vuelve a página 1

**Test 4: Modal**
- [ ] Click en un fondo
- [ ] Abre popup con detalles
- [ ] Muestra Nombre, Estado, Horizonte
- [ ] Muestra Gerente y Depositaria
- [ ] Click en X cierra modal

---

## Post-verificación

### Limpiar (después de tests)

```bash
# En terminal donde corre servidor
Ctrl+C    # Para el servidor

# Opcional: limpiar Redis
npm run upload-fondos-clean    # Recarga datos frescos
```

### Logs útiles

```bash
# Ver lo que hace upload-fondos
npm run upload-fondos-clean 2>&1 | Out-File upload.log
cat upload.log

# Ver lo que hace examples
npm run examples 2>&1 | Out-File examples.log
cat examples.log
```

### Verificar Redis directamente

En https://console.upstash.com/redis:
1. Seleccionar instancia
2. Ir a "CLI"
3. Ejecutar:
```
DBSIZE
SMEMBERS fondos:ids | head 10
JSON.GET fondo:1001
```

Esperado:
- `DBSIZE` muestra ~3900 (multiple de 100 + 1 para el set)
- `SMEMBERS` muestra lista de IDs
- `JSON.GET` muestra el objeto fondo

---

## Despliegue a Vercel

### ✓ Antes de desplegar

```bash
# 1. Verificar todo funciona localmente
npm run examples        # Sin errores ✅
npm start             # Servidor funciona ✅
# (Test manual en navegador)

# 2. Guardar cambios en Git
git add .
git commit -m "Redis integration complete"
git push origin main

# 3. Vercel despliega automáticamente
```

### ✓ Después del despliegue

1. Ir a https://vercel.com/dashboard
2. Seleccionar proyecto
3. Esperar deployment (azul → verde)
4. Click en "Visit"
5. Verificar funciona en producción

**En Vercel, verificar**:
- [ ] Página carga sin errores
- [ ] Búsqueda funciona
- [ ] Filtros funcionan
- [ ] Modal abre
- [ ] Console (F12) sin errores rojos

---

## Resultados Esperados Finales

### ✓ En local

```
✓ npm install                    → Sin errores
✓ npm run upload-fondos-clean   → "✅ Success: 3902"
✓ npm run examples              → 6 ejemplos ejecutados
✓ npm start                     → Servidor funciona
✓ http://localhost:3000         → Página funciona
✓ Búsqueda/filtros/modal        → Todos funcionan
```

### ✓ En Vercel

```
✓ Deployment successful
✓ Variables de entorno configuradas
✓ https://[proyecto].vercel.app funciona
✓ Redis data persiste
✓ Mismo comportamiento que local
```

---

## Matriz de Éxito

| Componente | Local | Vercel | Status |
|-----------|-------|--------|--------|
| Node.js/Express | ✓ | ✓ | OK |
| Redis (Upstash) | ✓ | ✓ | OK |
| Frontend (HTML/CSS/JS) | ✓ | ✓ | OK |
| API /api/funds | ✓ | ✓ | OK |
| Búsqueda/filtros | ✓ | ✓ | OK |
| Modal detalles | ✓ | ✓ | OK |
| Paginación | ✓ | ✓ | OK |

---

## Comandos Rápidos para Copy-Paste

```bash
# Instalación completa
npm install

# Crear .env.local (editar valores primero!)
echo "UPSTASH_REDIS_REST_URL=https://..." > .env.local
echo "UPSTASH_REDIS_REST_TOKEN=..." >> .env.local

# Cargar datos
npm run upload-fondos-clean

# Verificar
npm run examples

# Iniciar
npm start

# Test en navegador
# http://localhost:3000
```

---

## Checklist Final (marca cuando completes)

```
Pre-ejecución:
  [ ] Todos los archivos existen (7 verificaciones)
  [ ] fci.json tiene 978 fondos + 3902 clase_fondos
  [ ] package.json menciona @upstash/redis

Instalación:
  [ ] npm install completó sin errores
  [ ] node_modules existe con 3 deps principales
  [ ] .env.local existe con 2 líneas de variables

Datos:
  [ ] npm run upload-fondos-clean → "✅ Success: 3902"
  [ ] Duración fue ~30-60 segundos
  [ ] No hubo errores durante carga

Verificación:
  [ ] npm run examples → "Config: Redis connected"
  [ ] 6 ejemplos ejecutados sin errores
  [ ] Muestra "Total: 3902"

Servidor:
  [ ] npm start → "Server running on http://localhost:3000"
  [ ] Navegador abre sin errores 404

Web:
  [ ] Página muestra 10 fondos
  [ ] Búsqueda funciona (escribe, presiona Enter)
  [ ] Filtro Estado funciona
  [ ] Click en fondo abre modal
  [ ] Modal muestra detalles completos
  [ ] Paginación funciona (Next/Previous)

Producción:
  [ ] git add . y git commit
  [ ] git push a main
  [ ] Vercel deployed (green status)
  [ ] https://[proyecto].vercel.app funciona
  [ ] Mismos tests pasan en Vercel

Final:
  [ ] Todo funcionando
  [ ] Sin errores en consola
  [ ] 3,902 fondos disponibles
  [ ] Listo para usar en producción
```

---

## Si algo no funciona

1. **Revisar logs**:
```bash
npm run upload-fondos-clean 2>&1 | Out-File debug.log
cat debug.log
```

2. **Verificar variables**:
```bash
cat .env.local
```

3. **Test Redis**:
```bash
npm run examples
```

4. **Ver errores del navegador**:
   - Abrir http://localhost:3000
   - Presionar F12
   - Ver pestaña "Console"
   - Buscar mensajes rojos

5. **Reintentar todo**:
```bash
npm run upload-fondos-clean
npm start
# Test en navegador
```

---

**Última línea**: Si ves "✅ Success: 3902" en upload y "Server running..." en start, ¡estás listo!

Fecha: 2024 | Versión: 1.0.0
