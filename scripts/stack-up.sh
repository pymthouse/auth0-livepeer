#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=stack-compose.sh
source "$(dirname "$0")/stack-compose.sh"

services=("$@")
if [[ ${#services[@]} -eq 0 ]]; then
  services=(kafka remote-signer openmeter-collector)
fi

echo "+ $(stack_compose_cmd) up -d --build ${services[*]}"
stack_compose up -d --build "${services[@]}"
