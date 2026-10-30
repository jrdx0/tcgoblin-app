# syntax=docker/dockerfile:1

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_API_URL=/api
ARG VITE_PRIMEVUE_LICENSE
ENV VITE_API_URL=$VITE_API_URL \
    VITE_PRIMEVUE_LICENSE=$VITE_PRIMEVUE_LICENSE
RUN bun --bun run build-only

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
