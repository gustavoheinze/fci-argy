# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Production stage
FROM node:18-slim

WORKDIR /app

COPY --from=builder /app /app

# Ensure we have the database directory if needed
RUN mkdir -p /data

EXPOSE 3000

CMD ["npm", "start"]
