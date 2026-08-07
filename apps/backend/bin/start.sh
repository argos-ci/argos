#!/bin/sh
#
# Single definition of how a backend process starts.
#
# Usage: bin/start.sh <web|worker> [extra node flags]
#
# `--import ./dist/instrument.js` has to be here and nowhere else: it is what
# runs Sentry's instrumentation before the modules it patches are imported, and
# forgetting it in one call site fails silently.
#
# `exec` matters twice over. It replaces this shell with node rather than leaving
# a parent in the way, so the process ECS signals for graceful shutdown *is*
# node. And it costs nothing: routing through `pnpm run` instead measured 451ms
# of extra cold start, which is more than bundling the app saves in the first
# place.
set -e

process="$1"
if [ -z "$process" ]; then
  echo "usage: bin/start.sh <web|worker> [node flags]" >&2
  exit 1
fi
shift

cd "$(dirname "$0")/.."

exec node "$@" --import ./dist/instrument.js "./dist/processes/proc/$process.js"
