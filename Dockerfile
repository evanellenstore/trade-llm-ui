# ============================================================
# Stage 1: Build React / Vite Application
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package*.json ./

# Install exact dependencies from package-lock.json
RUN npm ci

# Copy application source
COPY . .

# Build production application
# Vite output will be created in /app/dist
RUN npm run build


# ============================================================
# Stage 2: Nginx Runtime
# ============================================================
FROM nginx:alpine

# Remove default Nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite production build
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx HTTP port
EXPOSE 80

# Keep Nginx running in foreground
CMD ["nginx", "-g", "daemon off;"]