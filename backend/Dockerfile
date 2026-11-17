FROM node:20-alpine

# Set non-root working environment
WORKDIR /app

# Install dependencies first for Docker layer caching
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy backend application source
COPY . .

# Set non-root user permissions
RUN chown -R node:node /app
USER node

EXPOSE 3001

# Health check verifies the REST API /api/health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
