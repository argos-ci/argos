#!/bin/bash

set -e

# Run migrations. Not through `pnpm run`: the production image has no pnpm, and
# corepack would download it in the middle of a deploy.
cd "$(dirname "$0")/../apps/backend"
exec node_modules/.bin/knex migrate:latest
