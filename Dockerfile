# syntax=docker/dockerfile:1.7

# ---- Build Stage ----
# Has dev headers + tooling so `npm ci` can compile `canvas` once.
FROM node:22-bookworm AS build

# Cache apt layers between builds; use -dev packages for canvas's native build.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      python3 pkg-config \
      libcairo2-dev libpango1.0-dev libpng-dev libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /app

# Build-time args consumed by Vite / shared config (keep in sync with fly.toml [build.args]).
ARG DEBUG
ARG MONGO_URL
ARG SERVER_FPS
ARG SERVER_URL
ARG PORT
ARG ASSETS_URL
ARG PUBLIC_DIR
ARG PEER_SERVER_PORT
ARG PEER_CLIENT_PORT
ARG PEER_CLIENT_PATH
ARG METERED_APP_NAME
ARG METERED_API_KEY
ARG METERED_REGION

ENV DEBUG=$DEBUG \
    MONGO_URL=$MONGO_URL \
    SERVER_FPS=$SERVER_FPS \
    SERVER_URL=$SERVER_URL \
    PORT=$PORT \
    ASSETS_URL=$ASSETS_URL \
    PUBLIC_DIR=$PUBLIC_DIR \
    PEER_SERVER_PORT=$PEER_SERVER_PORT \
    PEER_CLIENT_PORT=$PEER_CLIENT_PORT \
    PEER_CLIENT_PATH=$PEER_CLIENT_PATH \
    METERED_APP_NAME=$METERED_APP_NAME \
    METERED_API_KEY=$METERED_API_KEY \
    METERED_REGION=$METERED_REGION

# Copy workspace manifests first so the install layer caches on unchanged deps.
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY web/package.json ./web/
COPY ui/package.json ./ui/
COPY shared/package.json ./shared/

# `npm ci` is faster + deterministic; cache mount avoids redownloading tarballs across builds.
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

# Game client + server (marketing `web` is built separately e.g. Render).
RUN npm run client:build && npm run server:build

# Drop build-only deps so the node_modules we copy into production is slim.
RUN --mount=type=cache,target=/root/.npm \
    npm prune --omit=dev


# ---- Production Stage ----
# Only the runtime shared libs that `canvas`'s compiled binding links against.
FROM node:22-bookworm-slim AS production

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
      libjpeg62-turbo libgif7 librsvg2-2 libpng16-16

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "run", "server:run"]
