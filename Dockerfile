FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml /app
RUN pnpm fetch

COPY . /app
RUN pnpm install --frozen-lockfile
RUN BUILD_MODE=production pnpm run build
RUN pnpm run clean-deps
RUN pnpm install --prod