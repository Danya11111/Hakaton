#!/bin/sh
set -e

echo "Waiting for PostgreSQL at ${PGHOST:-postgres}:${PGPORT:-5432}..."
until pg_isready -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-postgres}" >/dev/null 2>&1; do
  sleep 1
done

echo "Applying Prisma migrations..."
npx prisma migrate deploy

if [ "${RUN_SEED_ON_DEPLOY:-}" = "1" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

echo "Starting Next.js..."
exec npx next start -H 0.0.0.0 -p 3000
