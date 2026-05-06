
# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build


# ---- Stage 2: Production ----
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy what's needed to run
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Copy drizzle migrations and config
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.prod.ts ./drizzle.config.prod.ts

EXPOSE 8080

CMD ["node", "dist/index.js"]