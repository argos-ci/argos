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
RUN pnpm fetch

COPY . /app
RUN pnpm install --offline --frozen-lockfile --config.confirmModulesPurge=false
RUN --mount=type=secret,id=TURBO_TOKEN \
  TURBO_TOKEN="$(cat /run/secrets/TURBO_TOKEN)" BUILD_MODE=production pnpm run build
RUN pnpm run clean-deps
RUN pnpm install --prod

# Frontend build output on its own, so CI can lift it out of the same cached
# build and upload it to the asset CDN:
#
#   docker buildx build --target dist --output type=local,dest=<dir> .
#
# CAUTION: this is the last stage, which makes it the *default* build target.
# The image build has to pass `--target build` explicitly or it will produce
# this empty scratch image instead of the app. See `target: build` in
# .github/workflows/release.yml.
FROM scratch AS dist
COPY --from=build /app/apps/frontend/dist /
