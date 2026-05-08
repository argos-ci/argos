# syntax=docker/dockerfile:1.7
ARG TURBO_TEAM

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app
RUN pnpm fetch

COPY . /app
RUN pnpm install --offline --frozen-lockfile --config.confirmModulesPurge=false
RUN --mount=type=secret,id=TURBO_TOKEN \
  TURBO_TOKEN="$(cat /run/secrets/TURBO_TOKEN)" BUILD_MODE=production pnpm run build
RUN pnpm run clean-deps
RUN pnpm install --prod
