# ── Stage 1: Build the frontend ────────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json postcss.config.js tailwind.config.js index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# ── Stage 2: Production runtime ────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Server deps only (tsx for running TypeScript directly)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install -D tsx@^4.23.13

COPY server ./server
COPY src/data ./src/data
COPY src/utils ./src/utils
COPY src/types ./src/types

# Pre-built frontend assets served by Express
COPY --from=frontend-build /app/dist ./dist

# Run as non-root (container hardening)
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
