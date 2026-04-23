#!/usr/bin/env bash
set -euo pipefail

# Восстановление БД из .sql.gz в контейнер postgres (docker-compose.prod).
# ВНИМАНИЕ: перезапишет данные в целевой базе. Используйте на тестовом окружении
# или после остановки приложения, если требуется полная замена.
#
# Пример:
#   APP_DIR=/opt/arhipovdan/app ./scripts/restore-db.sh ./backups/tinao-20260423-120000.sql.gz

APP_DIR="${APP_DIR:-.}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${PROD_ENV_FILE:-.env.production}"

usage() {
  cat <<'EOF'
Usage: ./scripts/restore-db.sh <backup.sql.gz>

Переменные:
  APP_DIR, COMPOSE_FILE, PROD_ENV_FILE — как в backup-db.sh

Перед восстановлением рекомендуется сделать свежий backup и остановить app:
  docker compose -f docker-compose.prod.yml --env-file .env.production stop app
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

FILE="${1:-}"
if [[ -z "${FILE}" || ! -f "${FILE}" ]]; then
  echo "ERROR: укажите существующий файл .sql.gz" >&2
  usage
  exit 1
fi

cd "${APP_DIR}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "ERROR: compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: env file not found: ${ENV_FILE}" >&2
  exit 1
fi

echo ">>> Restoring from ${FILE} (postgres container)"

if [[ "${FORCE:-}" != "1" ]]; then
  read -r -p "Это уничтожит текущие данные в БД контейнера. Продолжить? [y/N] " ans
  if [[ "${ans:-}" != "y" && "${ans:-}" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

gunzip -c "${FILE}" | docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres \
  sh -c "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1"

echo ">>> Restore finished. Запустите app и проверьте /api/health."
