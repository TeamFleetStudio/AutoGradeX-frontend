# ========================
# Build stage
# ========================
FROM node:20-alpine AS builder
WORKDIR /app

# Build args for Next.js public env (baked into client-side code)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_GOOGLE_CALLBACK_URL

# Set envs for Next.js build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_GOOGLE_CALLBACK_URL=${NEXT_PUBLIC_GOOGLE_CALLBACK_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# ========================
# Production stage
# ========================
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init curl

# Copy only what's needed for production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Set production env
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]

# Use npm start which respects PORT environment variable
CMD ["npm", "start"]