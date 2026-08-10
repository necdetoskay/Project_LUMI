# Project LUMI — web frontend container
# Monorepo (pnpm workspaces) + Next.js standalone output.
# Build context must be the repository root.

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/*/package.json packages/
COPY tooling/*/package.json tooling/
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @lumi/web build
RUN node scripts/inject-standalone-deps.mjs

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
# Build-time metadata for reproducible, traceable artifacts (S20-T02).
ARG IMAGE_VERSION=unknown
ARG IMAGE_COMMIT_SHA=unknown
LABEL org.opencontainers.image.version="${IMAGE_VERSION}"
LABEL org.opencontainers.image.revision="${IMAGE_COMMIT_SHA}"
LABEL org.opencontainers.image.source="https://github.com/necdetoskay/Project_LUMI"

# The standalone output runs `node apps/web/server.js` and does not need the
# npm CLI or its bundled dependencies. Removing them clears the base-image
# npm CVEs (tar, picomatch, ip-address, brace-expansion, sigstore).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
  && rm -rf /usr/local/lib/node_modules/corepack

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Development/demo control assets. These are inert unless the web control is
# explicitly enabled and token-protected at runtime. They let the standalone
# web container prepare the internal PostgreSQL schema and canonical demo seed
# without exposing PostgreSQL to the host or requiring pnpm inside the image.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/scripts ./apps/web/scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/demo ./scripts/demo
COPY --from=builder --chown=nextjs:nodejs /app/packages/profiles/scripts ./packages/profiles/scripts
COPY --from=builder --chown=nextjs:nodejs /app/packages/profiles/migrations ./packages/profiles/migrations
COPY --from=builder --chown=nextjs:nodejs /app/packages/world/scripts ./packages/world/scripts
COPY --from=builder --chown=nextjs:nodejs /app/packages/world/migrations ./packages/world/migrations
COPY --from=builder --chown=nextjs:nodejs /app/packages/npc-intelligence/scripts ./packages/npc-intelligence/scripts
COPY --from=builder --chown=nextjs:nodejs /app/packages/npc-intelligence/migrations ./packages/npc-intelligence/migrations
COPY --from=builder --chown=nextjs:nodejs /app/packages/story/scripts ./packages/story/scripts
COPY --from=builder --chown=nextjs:nodejs /app/packages/story/migrations ./packages/story/migrations

USER nextjs
EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
