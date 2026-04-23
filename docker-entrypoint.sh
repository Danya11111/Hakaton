#!/bin/sh
set -e

echo "Waiting for PostgreSQL at ${PGHOST:-postgres}:${PGPORT:-5432}..."
until pg_isready -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-tinao}" -d "${PGDATABASE:-tinao}" >/dev/null 2>&1; do
  sleep 1
done

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database (idempotent upserts)..."
npx prisma db seed

echo "Starting Next.js..."
exec npx next start -H 0.0.0.0 -p 3000
