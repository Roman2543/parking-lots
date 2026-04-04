## Install dependencies once and reuse in later stages for faster builds.
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./

RUN corepack enable && yarn install --frozen-lockfile

## Build TypeScript source into dist/ using preinstalled dependencies.
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable && yarn build

## Create a minimal runtime image with production dependencies only.
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json yarn.lock ./

RUN corepack enable && yarn install --frozen-lockfile --production

## Copy compiled output from builder stage and start the app.
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["yarn", "start:app"]