#!/usr/bin/env bash
set -euo pipefail

# Проверка здоровья приложения (локально или на сервере).
# Примеры:
#   BASE_URL=http://localhost:3000 ./scripts/check-health.sh
#   BASE_URL=https://arhipovdan.ru ./scripts/check-health.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
MAX_TRIES="${MAX_TRIES:-30}"
SLEEP_SEC="${SLEEP_SEC:-2}"

usage() {
  echo "Usage: BASE_URL=https://your-domain ./scripts/check-health.sh"
  echo "  BASE_URL   — базовый URL (по умолчанию http://localhost:3000)"
  echo "  MAX_TRIES  — число попыток (по умолчанию 30)"
  echo "  SLEEP_SEC  — пауза между попытками в секундах (по умолчанию 2)"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

echo ">>> Health: ${BASE_URL}/api/health"

for i in $(seq 1 "${MAX_TRIES}"); do
  if curl -fsS "${BASE_URL}/api/health" >/tmp/tinao-health.txt 2>/dev/null; then
    echo "OK (try ${i}/${MAX_TRIES}):"
    head -c 500 /tmp/tinao-health.txt || true
    echo
    exit 0
  fi
  echo "… wait (${i}/${MAX_TRIES})"
  sleep "${SLEEP_SEC}"
done

echo "ERROR: health check failed after ${MAX_TRIES} tries" >&2
exit 1
