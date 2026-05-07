# ---- Stage 1: Build (includes devDependencies) ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build


# ---- Stage 2: Production (lean runtime) ----
FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --production

# Copy built output
COPY --from=builder /app/dist ./dist

# Copy migrations + config (needed for reference, not execution)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.prod.ts ./drizzle.config.prod.ts

# Copy data for migration
COPY --from=builder /app/data ./data

EXPOSE 8080

CMD ["node", "dist/src/index.js"]