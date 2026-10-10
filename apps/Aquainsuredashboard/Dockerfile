FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo configuration and packages
COPY package.json package-lock.json turbo.json ./
COPY packages/ ./packages/
COPY apps/Aquainsuredashboard/ ./apps/Aquainsuredashboard/

# Install dependencies and build standalone bundle
RUN npm install
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --prefix apps/Aquainsuredashboard run build

# Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/Aquainsuredashboard/.next/standalone ./
COPY --from=builder /app/apps/Aquainsuredashboard/.next/static ./apps/Aquainsuredashboard/.next/static
COPY --from=builder /app/apps/Aquainsuredashboard/public ./apps/Aquainsuredashboard/public

EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/Aquainsuredashboard/server.js"]
