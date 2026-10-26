#!/bin/bash
#
# Runs the production image the way ECS does — migrations, then the web and
# worker processes — and fails on anything the image is missing.
#
# Usage: scripts/check-image.sh <image>
#
# Postgres, Redis and RabbitMQ are throwaway containers on a private network, so
# this runs the same in CI and next to a local dev stack, which it never
# touches.
set -euo pipefail

image="${1:?usage: scripts/check-image.sh <image>}"
prefix="argos-check-image-$$"

cleanup() {
  docker rm -f "$prefix-postgres" "$prefix-redis" "$prefix-rabbitmq" \
    "$prefix-web" "$prefix-worker" >/dev/null 2>&1 || true
  docker network rm "$prefix" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# fail <message> [container]
fail() {
  echo "check-image: $1" >&2
  if [ -n "${2:-}" ]; then
    docker logs "$prefix-$2" 2>&1 | tail -50 >&2
  fi
  exit 1
}

# wait_for <seconds> <command...>
wait_for() {
  local seconds=$1
  shift
  for ((i = 0; i < seconds; i++)); do
    if "$@" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

running() {
  [ "$(docker inspect -f '{{.State.Running}}' "$prefix-$1")" = true ]
}

# Same versions as docker-compose.yml.
docker network create "$prefix" >/dev/null
docker run -d --name "$prefix-postgres" --network "$prefix" \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:18-alpine >/dev/null
docker run -d --name "$prefix-redis" --network "$prefix" \
  redis:6-alpine >/dev/null
docker run -d --name "$prefix-rabbitmq" --network "$prefix" \
  rabbitmq:4.2-alpine >/dev/null

# Placeholders for the secrets production injects that a process refuses to
# start without.
app=(
  --network "$prefix"
  -e NODE_ENV=production
  -e DATABASE_URL="postgresql://postgres@$prefix-postgres/postgres"
  -e REDIS_URL="redis://$prefix-redis:6379"
  -e AMQP_URL="amqp://$prefix-rabbitmq"
  -e ENCRYPTION_KEY=1111111111111111111111111111111111111111111111111111111111111111
  -e RESEND_API_KEY=re_placeholder
)

# Over TCP: during initdb the server only listens on its socket, then restarts.
wait_for 60 docker exec "$prefix-postgres" pg_isready -h 127.0.0.1 ||
  fail "Postgres did not start" postgres

echo "Migrations"
docker run --rm "${app[@]}" "$image" scripts/release.sh ||
  fail "scripts/release.sh failed"

echo "Web process"
docker run -d --name "$prefix-web" "${app[@]}" -p 127.0.0.1::4001 \
  "$image" ./apps/backend/bin/start.sh web >/dev/null
web="http://$(docker port "$prefix-web" 4001 | head -1)"
wait_for 60 curl -fsS "$web/health" || fail "web did not answer /health" web
for path in / /robots.txt; do
  curl -fsS -o /dev/null -H "Host: app.argos-ci.com" \
    -H "X-Forwarded-Proto: https" "$web$path" ||
    fail "web did not serve $path" web
done
curl -fsS -H "Host: app.argos-ci.com" -H "X-Forwarded-Proto: https" \
  -H "Content-Type: application/json" -H "apollo-require-preflight: true" \
  --data '{"query":"{ me { id } }"}' "$web/graphql" | grep -q '"data"' ||
  fail "web did not answer a GraphQL query" web

echo "Worker process"
wait_for 60 docker exec "$prefix-rabbitmq" \
  rabbitmq-diagnostics -q check_port_connectivity ||
  fail "RabbitMQ did not start" rabbitmq
docker run -d --name "$prefix-worker" "${app[@]}" \
  "$image" ./apps/backend/bin/start.sh worker >/dev/null
# Every job logs "Initialize consuming" at startup and "Consuming queue" once
# its consumer is attached, so equal counts mean every queue is served.
consuming() {
  local logs initialized consuming
  logs=$(docker logs "$prefix-worker" 2>&1)
  initialized=$(grep -c '"msg":"Initialize consuming"' <<<"$logs" || true)
  consuming=$(grep -c '"msg":"Consuming queue"' <<<"$logs" || true)
  [ "$initialized" -gt 0 ] && [ "$consuming" -eq "$initialized" ]
}
wait_for 60 consuming || fail "worker did not consume every queue" worker
running web || fail "web exited" web
running worker || fail "worker exited" worker

# Diffing only loads its native binaries when a job runs, so nothing above
# reaches them.
echo "Diff binaries"
docker run --rm -w /app/apps/backend "$image" node --input-type=module -e '
  import { fingerprintDiff } from "@argos-ci/mask-fingerprint";
  import { compare } from "odiff-bin";
  import sharp from "sharp";

  const image = (background) =>
    sharp({ create: { width: 8, height: 8, channels: 3, background } }).png();
  await image("#f00").toFile("/tmp/base.png");
  await image("#00f").toFile("/tmp/head.png");
  const result = await compare("/tmp/base.png", "/tmp/head.png", "/tmp/diff.png");
  if (result.match || result.diffCount !== 64) {
    throw new Error(`unexpected odiff result: ${JSON.stringify(result)}`);
  }
  await fingerprintDiff("/tmp/diff.png");
' || fail "diff binaries failed"

echo "check-image: $image OK"
