FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json yarn.lock ./

# Install all dependencies including dev (needed for build)
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN yarn build

# Remove dev dependencies after build
RUN yarn install --frozen-lockfile --production=true

EXPOSE 8080

CMD ["node", "dist/src/index.js"]