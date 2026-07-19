# Multi-stage build for PoiPoi production deployment
# Optimized for Render and Railway

# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with pnpm
RUN npm install -g pnpm@10.4.1 && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache cairo jpeg pango giflib pixman

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN npm install -g pnpm@10.4.1 && \
    pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port (Render/Railway will set PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "dist/index.js"]
