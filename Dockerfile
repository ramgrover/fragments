# Stage 1: Build Stage
FROM node:22-alpine AS builder

LABEL maintainer="Ram Grover <rgrover13@myseneca.ca>" \
      description="Fragments node.js microservice"

# We default to use port 8080 in our service
# Reduce npm spam when installing within Docker
# Disable color when run inside Docker
ENV PORT=8080 \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false \
    NODE_ENV=production

# Use /app as our working directory
WORKDIR /app

#Copy all files starting with package name and .json type
COPY package*.json ./

# Install dependencies and clean cache
RUN npm ci --only=production && npm cache clean --force

# Copy src to /app/src/
COPY ./src ./src

# Copy our HTPASSWD file
COPY ./tests/.htpasswd ./tests/.htpasswd



#--------------------------------------------------------------



# Stage 2: Production Stage
FROM node:22-alpine

# Use /app as our working directory
WORKDIR /app

# Install curl and tini as the init process
RUN apk add --no-cache curl=8.12.1-r1 tini=0.19.0-r3

# Copy built files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/tests/.htpasswd ./tests/.htpasswd

ENTRYPOINT ["/sbin/tini", "--"]

# Start the container by running our server
CMD ["npm", "start"]

# We run our service on port 8080
EXPOSE ${PORT}

# Define an automated health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl --fail http://localhost:${PORT} || exit 1