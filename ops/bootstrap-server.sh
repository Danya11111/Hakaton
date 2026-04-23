#!/usr/bin/env bash
set -euo pipefail

echo "Первичная настройка сервера описана в ops/BOOTSTRAP.md"
echo "Откройте этот файл на сервере и выполните шаги по порядку."
echo ""
echo "Краткий чеклист:"
echo "  1) Docker + docker compose plugin"
echo "  2) Порты 80/443 (и SSH)"
echo "  3) mkdir -p /opt/arhipovdan/app && git clone …"
echo "  4) .env.production из примера"
echo "  5) docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build"
echo "  6) BASE_URL=https://arhipovdan.ru ./scripts/check-health.sh"
exit 0
