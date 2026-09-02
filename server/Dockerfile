FROM node:20-bookworm-slim AS builder
WORKDIR /app

# build-essential/python3 let npm compile better-sqlite3 from source
# if a prebuilt binary isn't available for the image's platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY public ./public

RUN mkdir -p /app/data /app/uploads

EXPOSE 8080
CMD ["node", "dist/index.js"]
