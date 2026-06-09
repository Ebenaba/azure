# ─── Stage 1: Install production dependencies ────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

# ─── Stage 2: Copy source ─────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ─── Stage 3: Minimal runtime image ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Use non-root user
USER node

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/src ./src
COPY --chown=node:node --from=build /app/package.json ./package.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
