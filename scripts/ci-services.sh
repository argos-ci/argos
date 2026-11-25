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
    # Without durability: tests commit for every row a factory creates and
    # every truncation, and each commit waited on the disk.
    docker run --detach --name postgres --network services \
      --publish 5432:5432 --env POSTGRES_HOST_AUTH_METHOD=trust \
      postgres:18-alpine \
      -c fsync=off -c synchronous_commit=off -c full_page_writes=off &
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

# wait_for <container> <command...>
wait_for() {
  until docker exec "$@" > /dev/null 2>&1; do
    if ((SECONDS > 90)); then
      cat "$LOG"
      docker ps --all
      echo "Services did not start within 90 seconds." >&2
      exit 1
    fi
    sleep 0.2
  done
}

wait_ready() {
  # On 127.0.0.1 rather than the socket: the image's init script first starts
  # a temporary server listening on the socket only, then restarts it.
  wait_for postgres pg_isready --quiet --host 127.0.0.1
  wait_for redis redis-cli ping
  # Not `rabbitmq-diagnostics`: run as root before the broker is up, it
  # creates the Erlang cookie owned by root, and the broker exits.
  wait_for rabbitmq nc -z 127.0.0.1 5672
  echo "Services ready after waiting ${SECONDS}s."
}

case "${1:-}" in
  start) start ;;
  wait) wait_ready ;;
  *)
    echo "Usage: $0 start|wait" >&2
    exit 1
    ;;
esac
