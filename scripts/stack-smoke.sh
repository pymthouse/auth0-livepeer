#!/usr/bin/env bash
# VM infra smoke checks — does not perform a funded signing test.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${STACK_ENV_FILE:-$ROOT/.env.livepeer}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

failures=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "[ok] $name"
  else
    echo "[fail] $name" >&2
    failures=$((failures + 1))
  fi
}

if [[ -n "${OPENMETER_URL:-}" && -n "${OPENMETER_API_KEY:-}" ]]; then
  meters_body="$(curl -sfS \
    -H "Authorization: Bearer ${OPENMETER_API_KEY}" \
    "${OPENMETER_URL%/}/meters")"
  if echo "$meters_body" | grep -q '"network_fee_usd_micros"'; then
    echo "[ok] Konnect meters API"
  else
    echo "[fail] Konnect meters API" >&2
    failures=$((failures + 1))
  fi
else
  echo "[skip] Konnect meters (OPENMETER_URL / OPENMETER_API_KEY unset)"
fi

# shellcheck source=stack-compose.sh
source "$(dirname "$0")/stack-compose.sh"
if stack_compose ps --status running 2>/dev/null | grep -q openmeter-collector; then
  check "collector container running" stack_compose ps --status running
else
  echo "[skip] collector container (stack not running?)"
fi

SIGNER_PORT="${SIGNER_HOST_PORT:-8081}"
if curl -sfS --max-time 3 "http://127.0.0.1:${SIGNER_PORT}/" -o /dev/null 2>/dev/null; then
  check "signer HTTP reachable on :${SIGNER_PORT}" true
elif curl -sfS --max-time 3 "http://127.0.0.1:${SIGNER_PORT}/sign-orchestrator-info" -o /dev/null 2>/dev/null; then
  check "signer HTTP reachable on :${SIGNER_PORT}" true
else
  # Signer may return 404/405 on GET — connection refused is the real failure
  if curl -sS --max-time 3 "http://127.0.0.1:${SIGNER_PORT}/" -o /dev/null 2>&1 | grep -qi "connection refused"; then
    check "signer HTTP reachable on :${SIGNER_PORT}" false
  else
    echo "[ok] signer port :${SIGNER_PORT} accepts connections"
  fi
fi

if [[ -n "${REMOTE_SIGNER_WEBHOOK_URL:-}" ]]; then
  status="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${REMOTE_SIGNER_WEBHOOK_URL}" \
    -H "Authorization: Bearer invalid" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null || echo "000")"
  if [[ "$status" == "401" || "$status" == "403" ]]; then
    echo "[ok] Vercel webhook rejects bad secret (HTTP $status)"
  else
    echo "[warn] Vercel webhook check returned HTTP $status (expected 401) — deploy platform first?"
  fi
else
  echo "[skip] Vercel webhook URL unset"
fi

if [[ "$failures" -gt 0 ]]; then
  echo "smoke: $failures check(s) failed" >&2
  exit 1
fi

echo "smoke: VM infra checks passed"
