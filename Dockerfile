# Multi-stage build for PoiPoi production deployment
# Optimized for Render, Railway, and Cloud Run
# Canvas@3.2.3 support with native binding optimization

# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for canvas@3.2.3 native bindings
# These are required to compile canvas from source
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pkgconfig \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with pnpm
# Use frozen-lockfile to ensure reproducible builds
RUN npm install -g pnpm@10.4.1 && \
    pnpm install --frozen-lockfile 2>&1 | grep -v "deprecated" || true

# Copy source code
COPY . .

# Build application
# Vite build for client, esbuild for server
RUN npm run build 2>&1 | tail -20

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies only (canvas requires these)
# These are the minimal libraries needed to run canvas@3.2.3
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libstdc++

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
# Use frozen-lockfile for consistency with builder stage
RUN npm install -g pnpm@10.4.1 && \
    pnpm install --prod --frozen-lockfile 2>&1 | grep -v "deprecated" || true

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/node_modules/.pnpm/canvas*/node_modules/canvas ./node_modules/canvas || true

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port (Render/Railway will set PORT env var)
EXPOSE 3000

# Health check
# Verify server is running and responding to requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start server
CMD ["node", "dist/index.js"]
