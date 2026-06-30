#!/usr/bin/env bash
# Deploy script — int or prod. VERSION defaults to "latest" (int only; prod requires an explicit version).

set -euo pipefail

ENV="${1:-}"
VERSION="${2:-latest}"

if [[ -z "$ENV" ]]; then
  echo "Usage: $0 <int|prod> [VERSION]" >&2
  exit 1
fi

case "$ENV" in
  int)
    COMPOSE_FILE="docker-compose.integration.yml"
    COMPOSE_URL="https://raw.githubusercontent.com/KarimHannaallah/Archi-logicielle/main/docker-compose.integration.yml"
    HOST="${VM_HOST_INT:?VM_HOST_INT not set}"
    USER="${VM_USER_INT:?VM_USER_INT not set}"
    KEY="${SSH_PRIVATE_KEY_INT:?SSH_PRIVATE_KEY_INT not set}"
    SEQUENTIAL=false
    ;;
  prod)
    COMPOSE_FILE="docker-compose.production.yml"
    COMPOSE_URL="https://raw.githubusercontent.com/KarimHannaallah/Archi-logicielle/main/docker-compose.production.yml"
    HOST="${VM_HOST_PROD:?VM_HOST_PROD not set}"
    USER="${VM_USER_PROD:?VM_USER_PROD not set}"
    KEY="${SSH_PRIVATE_KEY_PROD:?SSH_PRIVATE_KEY_PROD not set}"
    SEQUENTIAL=true
    if [[ "$VERSION" == "latest" ]]; then
      echo "ERROR: VERSION is required for prod deploy" >&2
      exit 1
    fi
    ;;
  *)
    echo "Unknown environment: $ENV (use int or prod)" >&2
    exit 1
    ;;
esac

KEY_FILE=$(mktemp)
chmod 600 "$KEY_FILE"
echo "$KEY" > "$KEY_FILE"
trap 'rm -f "$KEY_FILE"' EXIT

ssh_cmd() {
  ssh -i "$KEY_FILE" \
      -o StrictHostKeyChecking=no \
      -o ConnectTimeout=10 \
      "${USER}@${HOST}" "$@"
}

echo "=== Deploying to $ENV (version: $VERSION) ==="

ssh_cmd bash -s -- "$COMPOSE_FILE" "$COMPOSE_URL" "$VERSION" "$SEQUENTIAL" << 'REMOTE'
set -euo pipefail
COMPOSE_FILE="$1"
COMPOSE_URL="$2"
VERSION="$3"
SEQUENTIAL="$4"

cd /opt/app

curl -sf "$COMPOSE_URL" -o "$COMPOSE_FILE"
echo "✅ $COMPOSE_FILE downloaded"

docker compose -f "$COMPOSE_FILE" ps -q \
  | xargs -r docker inspect --format='{{.Image}} {{.Name}}' \
  > /tmp/previous-images.txt 2>/dev/null || true

echo "Pulling images (version: $VERSION)..."
VERSION="$VERSION" docker compose -f "$COMPOSE_FILE" pull

if [[ "$SEQUENTIAL" == "true" ]]; then
  SERVICES="auth-service task-service project-service notification-service frontend"
  for SVC in $SERVICES; do
    echo "--- Deploying $SVC ---"
    VERSION="$VERSION" docker compose -f "$COMPOSE_FILE" up -d --no-deps "$SVC"
    for i in $(seq 1 20); do
      STATUS=$(docker compose -f "$COMPOSE_FILE" ps "$SVC" --format json \
        | grep -o '"healthy"\|"running"' | head -1 || echo "unknown")
      echo "  $SVC: $STATUS (attempt $i/20)"
      [[ "$STATUS" == '"healthy"' || "$STATUS" == '"running"' ]] && break
      [[ "$i" -eq 20 ]] && { echo "ERROR: $SVC not healthy"; exit 1; }
      sleep 10
    done
    echo "  $SVC ✅"
  done
else
  VERSION="$VERSION" docker compose -f "$COMPOSE_FILE" up -d
  for i in $(seq 1 30); do
    HEALTHY=$(docker compose -f "$COMPOSE_FILE" ps --format json | grep -c '"healthy"' || true)
    echo "  healthy: $HEALTHY/4 (attempt $i/30)"
    [[ "$HEALTHY" -ge 4 ]] && break
    [[ "$i" -eq 30 ]] && { echo "ERROR: Services not healthy"; exit 1; }
    sleep 10
  done
fi

echo "=== Deploy complete ✅ ==="
docker compose -f "$COMPOSE_FILE" ps
REMOTE

echo "=== Healthchecks ==="
ssh_cmd bash << 'HEALTH'
check() {
  local url=$1 name=$2
  for i in $(seq 1 12); do
    curl -sf "$url" > /dev/null 2>&1 && echo "  $name ✅" && return 0
    sleep 5
  done
  echo "  $name FAILED" && return 1
}
check http://localhost:3001/health auth-service
check http://localhost:3000/health task-service
check http://localhost:3002/health project-service
check http://localhost:3003/health notification-service
for i in $(seq 1 12); do
  CODE=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
  echo "$CODE" | grep -q "200\|301\|302" && echo "  frontend ✅" && break
  sleep 5
  [[ "$i" -eq 12 ]] && echo "  frontend FAILED" && exit 1
done
echo "All healthchecks passed ✅"
HEALTH