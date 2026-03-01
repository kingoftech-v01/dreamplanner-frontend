# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE
ARG VITE_WS_BASE
ARG VITE_VAPID_PUBLIC_KEY

RUN npm run build

# ── Stage 2: Serve ─────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.docker.conf /etc/nginx/conf.d/dreamplanner.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
