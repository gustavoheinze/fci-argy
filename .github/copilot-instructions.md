# Copilot Instructions for FCI Argentina

Welcome to the FCI Argentina codebase! This document provides essential guidelines for AI coding agents to be productive in this project. Please follow these instructions to understand the architecture, workflows, and conventions.

## Project Overview

FCI Argentina is a **Fintech Terminal** application designed to explore, filter, and query Argentine mutual funds. It features:
- **Backend**: Node.js + Express
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: Upstash Redis (REST API)
- **Hosting**: Vercel

Key functionalities include:
- Filtering funds by risk, type, currency, horizon, and status.
- Synchronization with official CAFCI data.
- High-performance caching with Redis.

## Developer Workflows

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   - For Vercel:
     ```bash
     vercel env pull
     ```
   - For local development, create `.env.local`:
     ```
     UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
     UPSTASH_REDIS_REST_TOKEN=your-token-here
     ```
3. Load data into Redis:
   ```bash
   npm run upload-fondos-clean
   ```
4. Start the server:
   ```bash
   npm start
   ```
   Access the app at [http://localhost:3000](http://localhost:3000).

### Testing
- Run Redis API examples:
  ```bash
  npm run examples
  ```
- Verify data integrity:
  ```bash
  npm run upload-fondos
  ```

### Debugging
- Use `console.log` extensively in `lib/redis.js` and `server.js`.
- Check Redis data with `npm run upload-fondos-clean`.

## Codebase Structure

```
├── server.js              # Express server
├── lib/redis.js          # Redis client and API functions
├── scripts/              # Utility scripts
│   ├── uploadFondos.js   # Batch data importer
│   └── examples.js       # Redis API examples
├── public/               # Frontend assets
│   ├── index.html        # Main HTML file
│   ├── style.css         # Stylesheet
│   └── app.js            # Frontend logic
└── fci.json              # Data source (978 funds → 3,902 classes)
```

## Conventions

- **Redis API**: Use `lib/redis.js` for all Redis interactions. Key functions include:
  - `getRedis()` - Singleton instance
  - `saveFondo(id, data)` - Save a fund
  - `getFondo(id)` - Retrieve a fund
  - `clearAllFondos()` - Clear all data
- **Data Loading**: Always use `npm run upload-fondos-clean` to reset and load data.
- **Error Handling**: Log errors to the console and ensure Redis operations are wrapped in `try-catch` blocks.

## External Dependencies

- **Redis**: Upstash Redis REST API. Ensure credentials are set in `.env.local`.
- **CAFCI**: Data source for mutual funds. Scripts in `scripts/` handle data synchronization.
- **Vercel**: Deployment platform. Use `vercel` CLI for environment management.

## Tips for AI Agents

- **Understand Data Flow**: Data originates from `fci.json`, is processed by `scripts/uploadFondos.js`, and cached in Redis via `lib/redis.js`.
- **Follow Patterns**: Adhere to the modular structure in `lib/` and `scripts/`.
- **Testing**: Use `npm run examples` to validate Redis API functionality.

For any issues, refer to the [README.md](../README.md) or contact the maintainers.