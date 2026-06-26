FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-auth/package.json packages/shared-auth/
COPY services/notification-service/package.json services/notification-service/
RUN npm ci --omit=dev
COPY packages/shared-auth/src/ packages/shared-auth/src/
COPY services/notification-service/src/ services/notification-service/src/
COPY services/notification-service/tsconfig.json services/notification-service/
WORKDIR /app/services/notification-service
EXPOSE 3003
CMD ["npx", "ts-node", "src/index.ts"]