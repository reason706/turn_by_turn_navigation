# Dockerfile for MapLibre Valhalla Navigation App

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build && npm run type-check

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install Python for simple HTTP server (alternative to Node)
RUN apk add --no-cache python3

# Copy built files from builder
COPY --from=builder /app/dist /app/dist

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080')"

# Start HTTP server
CMD ["python3", "-m", "http.server", "8080", "--directory", "/app/dist"]
