# 1️⃣ Build Stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the app and build it
COPY . .
RUN npm run build

# 2️⃣ Production Stage (runs optimized Next.js server)
FROM node:18-alpine AS runner

WORKDIR /app

# Copy only the necessary files from builder stage
COPY --from=builder /app/.next .next
COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Expose Next.js default port
EXPOSE 3000