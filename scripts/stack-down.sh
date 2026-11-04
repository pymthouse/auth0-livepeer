#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=stack-compose.sh
source "$(dirname "$0")/stack-compose.sh"

echo "+ $(stack_compose_cmd) down $*"
stack_compose down "$@"
