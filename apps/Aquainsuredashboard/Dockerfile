# ─── Stage 1: Build Next.js Standalone Bundle ───────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo workspace files
COPY package.json package-lock.json turbo.json ./
COPY packages/ ./packages/
COPY apps/Aquainsuredashboard/ ./apps/Aquainsuredashboard/

# Install dependencies with retry resilience and build standalone bundle
RUN npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --prefix apps/Aquainsuredashboard run build

# ─── Stage 2: Ultra-lean Standalone Runtime ─────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Only copy standalone server output, public assets, and static files
COPY --from=builder /app/apps/Aquainsuredashboard/.next/standalone ./
COPY --from=builder /app/apps/Aquainsuredashboard/.next/static ./apps/Aquainsuredashboard/.next/static
COPY --from=builder /app/apps/Aquainsuredashboard/public ./apps/Aquainsuredashboard/public

EXPOSE 3000

CMD ["node", "apps/Aquainsuredashboard/server.js"]
