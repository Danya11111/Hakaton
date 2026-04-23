#!/usr/bin/env bash
set -euo pipefail

# Резервная копия PostgreSQL из docker-compose.prod (сервис postgres).
# Артефакт: ./backups/tinao-YYYYMMDD-HHMMSS.sql.gz (относительно текущей директории).
#
# Примеры:
#   APP_DIR=/opt/arhipovdan/app ./scripts/backup-db.sh
#   (из каталога с docker-compose.prod.yml и .env.production)

APP_DIR="${APP_DIR:-.}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${PROD_ENV_FILE:-.env.production}"
OUT_DIR="${BACKUP_DIR:-./backups}"

usage() {
  cat <<'EOF'
Создаёт сжатый дамп БД через pg_dump в контейнере postgres.

Переменные окружения:
  APP_DIR       — каталог с compose и env (по умолчанию .)
  COMPOSE_FILE  — файл compose (по умолчанию docker-compose.prod.yml)
  PROD_ENV_FILE — env-файл для compose (по умолчанию .env.production)
  BACKUP_DIR    — каталог для .sql.gz (по умолчанию ./backups)

Требуется: docker compose, запущенный сервис postgres.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
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

mkdir -p "${OUT_DIR}"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT_DIR}/tinao-${TS}.sql.gz"

echo ">>> Writing ${OUT}"

docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres \
  sh -c "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --no-owner" | gzip -9 > "${OUT}"

echo ">>> Done: $(wc -c < "${OUT}") bytes -> ${OUT}"
