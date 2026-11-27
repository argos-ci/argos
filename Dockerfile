# syntax=docker/dockerfile:1.22
ARG TURBO_TEAM
ARG ASSETS_BASE_URL

FROM node:26-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest --force && corepack enable

FROM base AS fetch
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app
# `pnpm fetch` fails on a `patchedDependencies` entry whose file is missing.
COPY patches /app/patches
RUN pnpm fetch

# The backend's production dependencies, from the manifests alone, so the layer
# is rebuilt only when they change. `infra` is left out: it depends on
# aws-cdk-lib (150 MB), which nothing in the image runs. `pnpm fetch` fills
# node_modules with every package in the lockfile, which an install keeps.
FROM fetch AS prod-deps
COPY --parents apps/*/package.json packages/*/package.json infra/package.json /app/
RUN rm -rf node_modules && \
  pnpm install --offline --frozen-lockfile --prod --filter "@argos/backend..."

FROM fetch AS build
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
# Origin the built frontend points at for its hashed assets. Baked in here
# because Vite resolves `base` at build time; the running container reads the
# same value from its own `ASSETS_BASE_URL` so the CSP can authorise it.
ARG ASSETS_BASE_URL
ENV ASSETS_BASE_URL=$ASSETS_BASE_URL
COPY . /app
RUN pnpm install --offline --frozen-lockfile --config.confirmModulesPurge=false
# The frontend build uploads its source maps to Sentry and then deletes them, so
# they never reach the image or the asset CDN. Without the token they are still
# deleted, and production stack traces go unsymbolicated.
#
# The remote cache is signed (turbo.json) with a key only the release workflow
# holds, so an artifact uploaded with the TURBO_TOKEN alone is a miss here. The
# key is exported only when present: CI builds this image without it, and an
# empty key is fatal. Without a key, turbo neither trusts nor writes the remote
# cache.
RUN --mount=type=secret,id=TURBO_TOKEN \
  --mount=type=secret,id=TURBO_REMOTE_CACHE_SIGNATURE_KEY \
  --mount=type=secret,id=SENTRY_AUTH_TOKEN \
  if [ -s /run/secrets/TURBO_REMOTE_CACHE_SIGNATURE_KEY ]; then \
    export TURBO_REMOTE_CACHE_SIGNATURE_KEY="$(cat /run/secrets/TURBO_REMOTE_CACHE_SIGNATURE_KEY)"; \
  fi; \
  TURBO_TOKEN="$(cat /run/secrets/TURBO_TOKEN)" \
  SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN)" \
  BUILD_MODE=production pnpm run build

# Frontend build output on its own, so CI can lift it out of the same cached
# build and upload it to the asset CDN:
#
#   docker buildx build --target dist --output type=local,dest=<dir> .
FROM scratch AS dist
COPY --from=build /app/apps/frontend/dist /

# The production image, and the default target. It copies only what the web
# and worker processes (apps/backend/bin/start.sh) and the migration task
# (scripts/release.sh) read: the dependencies from `prod-deps`, the rest from
# `build`. `build` cannot be shipped itself: its pnpm store and full install
# stay in its lower layers.
FROM base AS runtime
ARG ASSETS_BASE_URL
ENV ASSETS_BASE_URL=$ASSETS_BASE_URL
WORKDIR /app
# The marker the backend finds the repository root by, and through it the
# frontend it serves.
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/scripts/release.sh scripts/
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/packages/util/package.json packages/util/
COPY --from=build /app/packages/util/dist packages/util/dist
COPY --from=prod-deps /app/packages/util/node_modules packages/util/node_modules
COPY --from=build /app/packages/schemas/package.json packages/schemas/
COPY --from=build /app/packages/schemas/dist packages/schemas/dist
COPY --from=prod-deps /app/packages/schemas/node_modules packages/schemas/node_modules
COPY --from=build /app/apps/backend/package.json /app/apps/backend/knexfile.js apps/backend/
COPY --from=build /app/apps/backend/bin apps/backend/bin
COPY --from=build /app/apps/backend/config apps/backend/config
COPY --from=build /app/apps/backend/db/migrations apps/backend/db/migrations
COPY --from=prod-deps /app/apps/backend/node_modules apps/backend/node_modules
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/frontend/dist apps/frontend/dist
