# ТиНАО · Рейтинг учреждений культуры и спорта

MVP: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion + Prisma + PostgreSQL + Docker Compose.

## Маршруты

- `/` — главная: 5 карточек групп с количеством учреждений.
- `/groups/[groupSlug]` — список компаний группы, поиск и сортировка.
- `/companies/[companySlug]` — карточка учреждения, расчёт эффективности, сохранение оценок, история расчётов.

`groupSlug`: `dk`, `libraries`, `museums`, `ksc`, `sport`.

## Формула расчёта

1. Для каждого показателя (кроме удовлетворённости) нормализованный балл: `min(факт / benchmarkMax, 1) × 10`.
2. Для удовлетворённости: `min(факт / 5, 1) × 10`.
3. Балл блока (Результат / Эффективность / Качество) — сумма `вес × нормализованный балл` по показателям блока (веса в шаблоне суммируются в 1).
4. Автопоказатели из посещаемости и базовых параметров:
   - `attendancePer100m2 = attendance / areaSqM × 100`
   - `attendancePerStaff = attendance / staffCount`
   - `coveragePct = attendance / populationInZone × 100`
5. Интегральный балл:

```
round((result^0.5 × efficiency^0.3 × quality^0.2) × 10, 1)
```

6. Статус по интегральному баллу:
   - \> 85 — «Лидер»
   - 70–84 — «Выше среднего»
   - 50–69 — «Средний уровень»
   - \< 50 — «Требует вмешательства»

Шаблоны показателей: `src/lib/scoring-templates.ts`. Движок: `src/lib/scoring.ts`.

## Локальный запуск

Требования: Node.js 20+, PostgreSQL 16 (или Docker только для БД).

1. Скопируйте переменные окружения:

```bash
cp .env.example .env
```

2. Убедитесь, что `DATABASE_URL` указывает на вашу базу.

3. Установите зависимости и примените миграции:

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

При разработке можно использовать `npx prisma migrate dev` вместо `migrate deploy`.

## Docker Compose

Поднимает `postgres` и `app` (ожидание БД, `prisma migrate deploy`, `prisma db seed`, `next start`).

```bash
docker compose up --build
```

Приложение: `http://localhost:3000`.

## Полезные команды Prisma

```bash
npx prisma migrate dev      # создать/применить миграции в dev
npx prisma migrate deploy   # применить миграции в prod / CI / Docker
npx prisma db seed          # заполнить справочники (идемпотентные upsert)
npx prisma studio           # GUI для данных
```

## Админка и Excel

Публичные маршруты не меняются. Дополнительно:

- `/admin/login` — вход (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, cookie-сессия с подписью `ADMIN_SESSION_SECRET`, минимум 32 символа).
- `/admin` — дашборд, `/admin/companies` — CRUD компаний и локаций, `/admin/import-export` — импорт/экспорт `.xlsx`.
- API (защищены тем же cookie + middleware):
  - `GET /api/admin/export/companies` — выгрузка справочника;
  - `GET /api/admin/export/template` — пустой шаблон;
  - `POST /api/admin/import/companies` — импорт (`multipart/form-data`: поле `file`, поле `mode`: `merge` | `replace_companies`).
- `GET /api/health` — health-check для деплоя (без авторизации).

Локации хранятся в `CompanyLocation`; поля `Company.totalAreaSqM` и `Company.locationCount` **пересчитываются автоматически** после сохранения компании в админке или импорта.

Подробный операционный цикл (коммит, push, деплой) описан в `AGENTS.md`.

## Продакшен (Docker + Caddy)

Файлы: `docker-compose.prod.yml`, `ops/Caddyfile`, `docker-entrypoint.prod.sh` (миграции без seed; seed — `RUN_SEED_ON_DEPLOY=1`).

1. На сервере (по умолчанию `83.220.174.217`, домен `arhipovdan.ru`) один раз клонировать репозиторий, например в `/opt/arhipovdan/app`.
2. Создать `.env.production` по образцу `.env.production.example` (пароли, `ADMIN_*`, `DOMAIN`).
3. Запуск:

```bash
cd /opt/arhipovdan/app
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Caddy слушает `80/443`, проксирует на контейнер `app:3000`, `www` → редирект на apex. PostgreSQL только во внутренней сети compose.

## GitHub Actions → сервер

Workflow: `.github/workflows/deploy.yml` (push в `main` или `workflow_dispatch`).

Необходимые секреты репозитория:

| Секрет | Описание |
|--------|----------|
| `SSH_HOST` | IP или hostname (по умолчанию ожидается `83.220.174.217`) |
| `SSH_USER` | пользователь SSH |
| `SSH_KEY` | приватный ключ (PEM) |
| `SSH_PORT` | порт SSH (часто `22`) |
| `APP_DIR` | опционально, путь к клону (по умолчанию `/opt/arhipovdan/app`) |
| `PROD_ENV_FILE` | опционально, путь к env на сервере (по умолчанию `.env.production` внутри `APP_DIR`) |
| `DOMAIN` | опционально, apex-домен (по умолчанию `arhipovdan.ru`) |
| `COMPOSE_FILE` | опционально (по умолчанию `docker-compose.prod.yml`) |

На сервере должен быть установлен Docker и скрипт `scripts/deploy.sh` из репозитория (выполняет `git pull` и `docker compose ...`).

## Зависимость xlsx

Используется пакет `xlsx` (SheetJS). Для файлов из недоверенных источников включайте антивирусную проверку; импорт предназначен для доверенных администраторов.

## Что дальше

- Роли и аудит действий в админке.
- Версионирование методики и diff шаблонов.
- Автотесты API импорта/экспорта.
