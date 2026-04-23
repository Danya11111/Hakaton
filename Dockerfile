FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# postinstall runs `prisma generate` — schema must exist before npm ci
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://tinao:tinao@localhost:5432/tinao?schema=public"
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache postgresql-client openssl libc6-compat

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/bootstrap-if-empty.mjs ./scripts/bootstrap-if-empty.mjs
COPY docker-entrypoint.sh /entrypoint.sh
COPY docker-entrypoint.prod.sh /entrypoint.prod.sh
RUN chmod +x /entrypoint.sh /entrypoint.prod.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PGDATABASE=tinao

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
