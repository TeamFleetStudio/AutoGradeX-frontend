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

# :exclamation: DO NOT set NODE_ENV=production here
# We need devDependencies for building Next.js + Tailwind

COPY package*.json ./

# Install ALL deps including devDependencies
RUN npm ci --include=dev

COPY . .
RUN npm run build

# ========================
# Production stage
# ========================
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init

# Copy only what's needed
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package*.json ./

# Now set production mode
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1