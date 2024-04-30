#!/bin/bash

set -e

# Run migrations
pnpm run --filter @argos/backend db:migrate:latest
