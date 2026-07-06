# ─────────────────────────────────────────────
# Stage 1: Install Node dependencies
# ─────────────────────────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────
# Stage 2: Serve frontend via Nginx
# ─────────────────────────────────────────────
FROM nginx:alpine AS frontend

# Copy all static frontend files
COPY index.html /usr/share/nginx/html/
COPY products.html /usr/share/nginx/html/
COPY product_details.html /usr/share/nginx/html/
COPY cart.html /usr/share/nginx/html/
COPY checkout.html /usr/share/nginx/html/
COPY order-confirmation.html /usr/share/nginx/html/
COPY account.html /usr/share/nginx/html/
COPY profile.html /usr/share/nginx/html/
COPY admin.html /usr/share/nginx/html/
COPY 404.html /usr/share/nginx/html/
COPY images/ /usr/share/nginx/html/images/
COPY src/ /usr/share/nginx/html/src/

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
