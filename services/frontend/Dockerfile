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

# Copy only the built files from the previous stage
COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm install

# Expose Next.js default port
EXPOSE 3000