# syntax=docker/dockerfile:1.7
ARG TURBO_TEAM
ARG ASSETS_BASE_URL

FROM node:26-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest --force && corepack enable

FROM base AS build
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
# Origin the built frontend points at for its hashed assets. Baked in here
# because Vite resolves `base` at build time; the running container reads the
# same value from its own `ASSETS_BASE_URL` so the CSP can authorise it.
ARG ASSETS_BASE_URL
ENV ASSETS_BASE_URL=$ASSETS_BASE_URL
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app
# `pnpm fetch` fails on a `patchedDependencies` entry whose file is missing.
COPY patches /app/patches
RUN pnpm fetch

COPY . /app
RUN pnpm install --offline --frozen-lockfile --config.confirmModulesPurge=false
# The frontend build uploads its source maps to Sentry and then deletes them, so
# they never reach the image or the asset CDN. Without the token they are still
# deleted, and production stack traces go unsymbolicated.
RUN --mount=type=secret,id=TURBO_TOKEN \
  --mount=type=secret,id=SENTRY_AUTH_TOKEN \
  TURBO_TOKEN="$(cat /run/secrets/TURBO_TOKEN)" \
  SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN)" \
  BUILD_MODE=production pnpm run build
RUN pnpm run clean-deps
# The backend's closure only: `infra` depends on aws-cdk-lib (150 MB), which
# nothing in the image runs.
RUN pnpm install --prod --filter "@argos/backend..."

# Frontend build output on its own, so CI can lift it out of the same cached
# build and upload it to the asset CDN:
#
#   docker buildx build --target dist --output type=local,dest=<dir> .
FROM scratch AS dist
COPY --from=build /app/apps/frontend/dist /

# The production image, and the default target. It copies from `build` only
# what the web and worker processes (apps/backend/bin/start.sh) and the
# migration task (scripts/release.sh) read. `build` cannot be shipped itself:
# its pnpm store and full install stay in its lower layers however much a later
# layer deletes.
FROM base AS runtime
ARG ASSETS_BASE_URL
ENV ASSETS_BASE_URL=$ASSETS_BASE_URL
WORKDIR /app
# The marker the backend finds the repository root by, and through it the
# frontend it serves.
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/scripts/release.sh scripts/
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/util/package.json packages/util/
COPY --from=build /app/packages/util/dist packages/util/dist
COPY --from=build /app/packages/util/node_modules packages/util/node_modules
COPY --from=build /app/packages/schemas/package.json packages/schemas/
COPY --from=build /app/packages/schemas/dist packages/schemas/dist
COPY --from=build /app/packages/schemas/node_modules packages/schemas/node_modules
COPY --from=build /app/apps/backend/package.json /app/apps/backend/knexfile.js apps/backend/
COPY --from=build /app/apps/backend/bin apps/backend/bin
COPY --from=build /app/apps/backend/config apps/backend/config
COPY --from=build /app/apps/backend/db/migrations apps/backend/db/migrations
COPY --from=build /app/apps/backend/node_modules apps/backend/node_modules
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/frontend/dist apps/frontend/dist
