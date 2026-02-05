# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy node_modules from builder (only production deps)
COPY --from=builder /app/node_modules ./node_modules

# Copy .next build output
COPY --from=builder /app/.next ./.next

# Copy public folder
COPY --from=builder /app/public ./public

# Copy package.json for npm start
COPY package*.json ./

# Set environment
ENV NODE_ENV=production
EXPOSE 3000

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1
