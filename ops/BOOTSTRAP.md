# Первичная подготовка сервера (Docker + деплой)

Домен: **arhipovdan.ru** (apex), **www.arhipovdan.ru** → редирект на apex (см. `ops/Caddyfile`).  
Сервер по умолчанию: **83.220.174.217** (не храните секреты в этом файле).

## 1. Docker и Compose plugin

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
docker compose version
```

## 2. Firewall

Откройте **80/tcp** и **443/tcp** для Caddy. SSH (22) оставьте только для администраторов.

```bash
# пример ufw (Ubuntu)
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3. Каталог приложения

```bash
sudo mkdir -p /opt/arhipovdan/app
sudo chown -R "$USER":"$USER" /opt/arhipovdan
cd /opt/arhipovdan/app
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> .
```

## 4. Переменные окружения

```bash
cp .env.production.example .env.production
nano .env.production   # пароли БД, ADMIN_*, DOMAIN, ADMIN_SESSION_TTL_HOURS при необходимости
```

Обязательно: `ADMIN_SESSION_SECRET` (≥ 32 символов), надёжные `POSTGRES_PASSWORD` и `ADMIN_PASSWORD`.

## 5. Первый запуск продакшена

```bash
cd /opt/arhipovdan/app
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Миграции Prisma выполняются при старте контейнера `app` (`docker-entrypoint.prod.sh`). Дополнительно `scripts/deploy.sh` вызывает `prisma migrate deploy` в уже запущенном контейнере.

**Данные (seed, не на каждый boot):** в `.env.production` по умолчанию `RUN_SEED_ON_DEPLOY=0` и `RUN_BOOTSTRAP_IF_EMPTY=0`. Для первичного наполнения либо один раз выполните `docker compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma db seed`, либо временно `RUN_BOOTSTRAP_IF_EMPTY=1`, поднимите стек, затем снова `0`. Подробнее — раздел «Продакшен» в корневом `README.md`.

## 6. Проверка

```bash
BASE_URL="https://arhipovdan.ru" ./scripts/check-health.sh
curl -fsS https://arhipovdan.ru/api/health
```

## 7. DNS

- **A** (или AAAA): `arhipovdan.ru` → IP сервера.  
- **CNAME** или **A**: `www` → тот же хост или apex. Caddy выполнит редирект `www` → apex согласно `Caddyfile`.

## 8. Дальнейшие деплои

- GitHub Actions: `.github/workflows/deploy.yml` (секреты SSH).  
- Вручную на сервере: `APP_DIR=/opt/arhipovdan/app ./scripts/deploy.sh`.

## 9. Резервные копии

См. раздел **«Резервное копирование»** в корневом `README.md`. Рекомендуемый каталог артефактов на сервере: **`/opt/arhipovdan/backups`** (вне git).

Скрипты: `scripts/backup-db.sh`, `scripts/restore-db.sh`.
