#!/usr/bin/env bash
#
# Runs the services the CI tests need on a Docker network named `services`,
# where each one is reachable by its name, and on the host at the ports
# docker-compose.yml uses.
#
#   scripts/ci-services.sh start   Pull and start them in the background.
#   scripts/ci-services.sh wait    Block until they all accept connections.
#
# Job-level `services:` containers start before the first step, and the job
# waits for them: 8 to 17 seconds before checkout. Started here, they boot
# while dependencies install.

set -euo pipefail

LOG="${RUNNER_TEMP:-/tmp}/ci-services.log"

start() {
  docker network create services > /dev/null
  {
    docker run --detach --name postgres --network services \
      --publish 5432:5432 --env POSTGRES_HOST_AUTH_METHOD=trust \
      postgres:18-alpine &
    docker run --detach --name redis --network services \
      --publish 6380:6379 \
      redis:6-alpine &
    # Keep in sync with docker-compose.yml and production (Amazon MQ 4.2).
    docker run --detach --name rabbitmq --network services \
      --publish 5672:5672 \
      rabbitmq:4.2-alpine &
    wait
  } > "$LOG" 2>&1 &
}

ready() {
  # On 127.0.0.1 rather than the socket: the image's init script first starts
  # a temporary server listening on the socket only, then restarts it.
  docker exec postgres pg_isready --quiet --host 127.0.0.1 &&
    docker exec redis redis-cli ping &&
    docker exec rabbitmq rabbitmq-diagnostics --quiet check_port_listener 5672
}

wait_ready() {
  local deadline=$((SECONDS + 90))
  until ready > /dev/null 2>&1; do
    if ((SECONDS > deadline)); then
      cat "$LOG"
      docker ps --all
      echo "Services did not start within 90 seconds." >&2
      exit 1
    fi
    sleep 1
  done
}

case "${1:-}" in
  start) start ;;
  wait) wait_ready ;;
  *)
    echo "Usage: $0 start|wait" >&2
    exit 1
    ;;
esac
