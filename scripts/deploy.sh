#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arhipovdan/app}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${PROD_ENV_FILE:-.env.production}"
DOMAIN="${DOMAIN:-arhipovdan.ru}"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file not found: $ENV_FILE"
  exit 1
fi

echo ">>> Pull latest main"
git fetch origin
git checkout main
git pull origin main

echo ">>> Build & up ($COMPOSE_FILE)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ">>> Health check"
for i in $(seq 1 30); do
  if curl -fsS "https://${DOMAIN}/api/health" >/dev/null 2>&1; then
    echo "OK: https://${DOMAIN}/api/health"
    curl -fsS "https://${DOMAIN}/api/health" | head -c 400 || true
    echo
    exit 0
  fi
  sleep 2
done

echo "WARN: health check failed after wait (TLS/DNS may still be propagating)"
exit 0
