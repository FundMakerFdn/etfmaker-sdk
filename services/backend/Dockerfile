# Use a Node.js base image
FROM node:18-alpine
# Install curl
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Expose the backend port
EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=2s --start-period=15s \  
    CMD node /healthcheck.js