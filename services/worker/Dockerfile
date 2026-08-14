FROM node:24-alpine

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

WORKDIR /app

RUN corepack enable
RUN pnpm add --global tsx@4.23.12

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/worker/package.json services/worker/package.json
COPY packages/context/package.json packages/context/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/npc-intelligence/package.json packages/npc-intelligence/package.json
COPY packages/profiles/package.json packages/profiles/package.json
COPY packages/simulation/package.json packages/simulation/package.json
COPY packages/story/package.json packages/story/package.json
COPY packages/world/package.json packages/world/package.json

RUN pnpm install --frozen-lockfile --prod

COPY services/worker services/worker
COPY packages/context packages/context
COPY packages/logger packages/logger
COPY packages/npc-intelligence packages/npc-intelligence
COPY packages/profiles packages/profiles
COPY packages/simulation packages/simulation
COPY packages/story packages/story
COPY packages/world packages/world

CMD ["tsx", "services/worker/src/index.ts"]
