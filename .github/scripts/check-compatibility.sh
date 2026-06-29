#!/usr/bin/env bash
set -euo pipefail

# Verify Docker image compatibility labels before deployment.
# Usage: ./scripts/check-compatibility.sh [image1 image2 ...]
# If no images given, inspects locally built images from docker compose.

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0

check_image() {
    local image="$1"
    local labels
    labels=$(docker inspect --format '{{json .Config.Labels}}' "$image" 2>/dev/null || echo "{}")

    local service
    service=$(echo "$labels" | grep -o '"provides\.service":"[^"]*"' | cut -d'"' -f4)
    local api_version
    api_version=$(echo "$labels" | grep -o '"provides\.api-version":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$service" ]; then
        echo -e "${RED}WARN${NC}: $image has no provides.service label"
        return
    fi

    echo -e "${GREEN}OK${NC}: $image — service=$service api=$api_version"

    local requires
    requires=$(echo "$labels" | grep -o '"requires\.[^"]*":"[^"]*"' || true)
    if [ -n "$requires" ]; then
        echo "  dependencies: $requires"
    fi
}

if [ $# -gt 0 ]; then
    for img in "$@"; do
        check_image "$img"
    done
else
    SERVICES=("auth-service" "task-service" "project-service" "notification-service")
    COMPOSE_PROJECT=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

    for svc in "${SERVICES[@]}"; do
        IMAGE="${COMPOSE_PROJECT}-${svc}:latest"
        if docker image inspect "$IMAGE" >/dev/null 2>&1; then
            check_image "$IMAGE"
        else
            echo -e "${RED}SKIP${NC}: $IMAGE not found locally"
        fi
    done
fi

if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}Compatibility check failed with $ERRORS error(s)${NC}"
    exit 1
fi

echo -e "\n${GREEN}All compatibility checks passed${NC}"