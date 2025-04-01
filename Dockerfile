# Build stage
FROM node:21.6.0-alpine AS build

LABEL maintainer="Ram Grover <rgrover13@myseneca.ca>"
LABEL description="Fragments node.js microservice"

# Use /app as our working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies using ci for more reliable builds
# Only install production dependencies to keep the image smaller
RUN npm ci --only=production

# Copy source code and necessary files
COPY ./src ./src
COPY ./tests/.htpasswd ./tests/.htpasswd

# Runtime stage
FROM node:21.6.0-alpine

# Set environment variables
ENV PORT=80
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false

# Set working directory
WORKDIR /app

# Copy only necessary files from build stage
COPY --from=build /app ./

# Expose the application port (80 instead of 8080)
EXPOSE 80

# Add health check to ensure container is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/v1/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
