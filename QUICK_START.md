# Guía Rápida - FCI Argentina con Redis

## En 3 pasos

### 1️⃣ Instalar y configurar

```bash
# Instalar dependencias
npm install

# Configurar variables (si no tiene vercel cli)
# Editar .env.local y agregar:
# UPSTASH_REDIS_REST_URL=https://...upstash.io
# UPSTASH_REDIS_REST_TOKEN=...
```

### 2️⃣ Cargar los 3,902 fondos en Redis

```bash
npm run upload-fondos-clean
```

Espera a ver: `✅ Success: 3902`

### 3️⃣ Iniciar servidor

```bash
npm start
```

Abre http://localhost:3000

---

## Verificar que funciona

```bash
# En otra terminal, ejecuta:
npm run examples
```

Deberías ver 6 ejemplos ejecutándose sin errores.

---

## Primeros pasos en la web

1. **Busca**: Escribe en la búsqueda (ej: "ahorro")
2. **Filtra**: Selecciona Estado, Horizonte, Tipo Renta
3. **Ordena**: Por Nombre, Estado, o lo predeterminado
4. **Pagina**: Navega con Previous/Next (10 fondos por página)
5. **Detalles**: Click en un fondo para ver todo (modal)

---

## Comandos disponibles

```bash
npm start                      # Iniciar servidor
npm run upload-fondos          # Cargar datos sin limpiar
npm run upload-fondos-clean    # Limpiar y cargar fondos
npm run examples               # Ver 6 ejemplos de API
```

---

## Variables de entorno requeridas

```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token
```

📍 Obtenerlas: https://console.upstash.com/redis

---

## Archivos importantes

| Archivo | Qué hace |
|---------|----------|
| `server.js` | Express server + API REST |
| `lib/redis.js` | Cliente Redis singleton |
| `scripts/uploadFondos.js` | Importar 3,902 fondos |
| `scripts/examples.js` | Ver cómo usar la API |
| `public/app.js` | Lógica del navegador |
| `public/index.html` | HTML + estructura |
| `public/style.css` | Diseño neon |

---

## Si hay problemas

**Error: "@upstash/redis not found"**
```bash
npm install @upstash/redis
```

**Error: "ENV variables undefined"**
```bash
# Verificar .env.local existe y tiene contenido
cat .env.local

# Si está vacío, agregar manualmente:
echo "UPSTASH_REDIS_REST_URL=https://..." >> .env.local
echo "UPSTASH_REDIS_REST_TOKEN=..." >> .env.local
```

**No aparecen datos**
```bash
# Verificar Redis tiene datos
npm run examples

# Si muestra 0, cargar:
npm run upload-fondos-clean

# Reiniciar servidor
npm start
```

---

## Desplegar a Vercel

```bash
# Preparar Git
git add .
git commit -m "Redis integration ready"
git push

# Vercel tomará variables de entorno automáticamente
```

---

## Documentación completa

Ver [SETUP.md](SETUP.md) para instrucciones detalladas.

---

¿Listo? Ejecuta: `npm install && npm run upload-fondos-clean && npm start`
