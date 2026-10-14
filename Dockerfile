# e-Tekisi frontend — multi-stage build of the Next.js standalone server.
#
# NEXT_PUBLIC_* values are baked into the browser bundle at build time, so
# pass them as build args (the browser calls the backend directly, so this is
# the backend URL as seen from the user's browser, not from inside Docker).

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_MAP_TILE_URL
ARG NEXT_PUBLIC_MAP_ATTRIBUTION
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_MAP_TILE_URL=$NEXT_PUBLIC_MAP_TILE_URL \
    NEXT_PUBLIC_MAP_ATTRIBUTION=$NEXT_PUBLIC_MAP_ATTRIBUTION \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Non-root user — least privilege.
RUN addgroup -S tekisi && adduser -S -G tekisi tekisi
COPY --from=build --chown=tekisi:tekisi /app/.next/standalone ./
COPY --from=build --chown=tekisi:tekisi /app/.next/static ./.next/static
COPY --from=build --chown=tekisi:tekisi /app/public ./public
USER tekisi
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
CMD ["node", "server.js"]
