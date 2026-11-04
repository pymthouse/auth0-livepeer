#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=stack-compose.sh
source "$(dirname "$0")/stack-compose.sh"

stack_compose logs -f "$@"
