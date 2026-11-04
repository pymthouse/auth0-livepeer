#!/usr/bin/env bash
# Shared docker compose paths for stack:* scripts.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export STACK_ENV_FILE="${STACK_ENV_FILE:-$ROOT/.env.livepeer}"
export STACK_COMPOSE_FILE="${STACK_COMPOSE_FILE:-$ROOT/deploy/docker-compose.yml}"

stack_compose() {
  if [[ ! -f "$STACK_ENV_FILE" ]]; then
    echo "Missing $STACK_ENV_FILE — run npm run bootstrap first" >&2
    return 1
  fi
  (
    cd "$ROOT"
    docker compose -f "$STACK_COMPOSE_FILE" --env-file "$STACK_ENV_FILE" "$@"
  )
}

stack_compose_cmd() {
  printf 'docker compose -f %q --env-file %q' "$STACK_COMPOSE_FILE" "$STACK_ENV_FILE"
}
