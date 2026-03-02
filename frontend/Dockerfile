# =============================================================
# Stage 1: Build Vite/React app
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Build args baked into the static bundle at compile time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

# =============================================================
# Stage 2: Serve with nginx
# =============================================================
FROM nginx:alpine

# SPA nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
