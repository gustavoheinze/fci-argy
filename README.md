# FCI Argentina - Fintech Terminal & Analytics

Aplicación avanzada estilo **Fintech Terminal** para la exploración, análisis y gestión de Fondos Comunes de Inversión (FCI) en Argentina. Diseñada con una estética inmersiva, datos enriquecidos y una arquitectura híbrida de alto rendimiento.

## 🚀 Características Principales

- 💹 **Fintech Terminal UI**: Estética profesional "dark-mode" con efectos aurora, hyper-glassmorphism e interfaz ultra-responsiva.
- 📊 **Advanced Analytics**: Gráfico interactivo de Riesgo vs. Retorno (Scatter Plot) con Chart.js para visualizar el perfil de los fondos.
- 📈 **Panel de Gerencia**: 
  - **Ranking Global de Activos**: Identificación de los activos más pesados en la industria (ponderado por peso).
  - **Mapa de Liquidez**: Visualización del sentimiento del mercado basado en el efectivo disponible.
  - **Benchmarking de Gestoras**: Comparativa de rendimiento y estilos de inversión entre administradoras.
- 🔍 **Enriquecimiento de Datos**: Información detallada extraída de CAFCI, incluyendo composición de cartera (Assets), honorarios y perfiles de riesgo.
- 📱 **100% Mobile Friendly**: Experiencia optimizada para cualquier dispositivo.

## 🏗️ Arquitectura de Datos

El proyecto utiliza una estrategia de base de datos híbrida para maximizar la velocidad y la capacidad de análisis:

1. **SQLite (Local)**: Utilizada para el proceso de **Enriquecimiento (Scraping)** y gestión de datos complejos. 
   - *Nota*: El archivo `database.sqlite` está excluido del repositorio de GitHub debido a su tamaño (>100MB).
2. **Upstash Redis (Cloud/Producción)**: Base de datos de alta velocidad utilizada para servir la API en producción (Vercel), garantizando tiempos de respuesta mínimos.

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: HTML5 vanilla, CSS moderno (Glassmorphism), JavaScript interactivo.
- **Gráficos**: Chart.js
- **Bases de Datos**: SQLite (better-sqlite3) & Upstash Redis.
- **Despliegue**: Vercel Ready.

## ⚙️ Instalación y Configuración

### 1. Requisitos Previos
```bash
npm install
```

### 2. Variables de Entorno
Crea un archivo `.env.local` o usa `vercel env pull`:
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 3. Workflow de Datos
Si deseas recrear la base de datos o actualizar los fondos:

- **Enriquecer desde CAFCI**:
  ```bash
  node scripts/enrich_sqlite_cafci_v3.js
  ```
- **Sincronizar a Redis**:
  ```bash
  npm run upload-fondos-clean
  ```

## 📜 Scripts Disponibles

- `npm start`: Inicia el servidor de producción/desarrollo.
- `npm run dev`: Alias de start para entorno local.
- `npm run upload-fondos-clean`: Limpia la caché de Redis y carga los datos desde el archivo enriquecido.
- `npm run examples`: Ejecuta ejemplos de interacción con la API de Redis.

## 📂 Estructura del Proyecto

- `/public`: Interfaz de usuario, estilos y lógica del cliente (`app.js`, `AnalyticsTab.jsx`).
- `/scripts`: Scripts de scraping, enriquecimiento y sincronización.
- `/lib`: Clientes de base de datos (Redis/SQLite).
- `/api`: Endpoints de la API optimizados para serverless.

---
**Desarrollado para el mercado financiero argentino.**
