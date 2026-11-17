# Stage 1: Build static assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: Serve production bundle with least-privilege non-root user
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve --no-audit --no-fund
COPY --from=builder /app/dist ./dist

# Run as non-root user
USER node

EXPOSE 5173

# Health check verifies the frontend serves index.html
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:5173/ || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]
