# ========================
# Build stage
# ========================
FROM node:20-alpine AS builder
WORKDIR /app

# Build args for Next.js public env
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_GOOGLE_CALLBACK_URL

# Set envs for Next.js build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_GOOGLE_CALLBACK_URL=${NEXT_PUBLIC_GOOGLE_CALLBACK_URL}

COPY package*.json ./
RUN npm ci --include=dev

# Set NODE_ENV after installing dependencies to ensure devDependencies are available for build
ENV NODE_ENV=production

COPY . .
RUN npm run build

# ========================
# Production stage
# ========================
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init curl

# Copy only what's needed
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Set production env
ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1