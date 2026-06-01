# Build stage
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/

RUN npm ci

COPY frontend/ frontend/

RUN npm run build -w frontend

# Production stage
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
