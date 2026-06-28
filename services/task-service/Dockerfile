FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-auth/package.json packages/shared-auth/
COPY packages/shared-db/package.json packages/shared-db/
COPY services/task-service/package.json services/task-service/
RUN npm ci --omit=dev
COPY packages/shared-auth/src/ packages/shared-auth/src/
COPY packages/shared-db/src/ packages/shared-db/src/
COPY services/task-service/src/ services/task-service/src/
COPY services/task-service/migrations/ services/task-service/migrations/
COPY services/task-service/tsconfig.json services/task-service/
WORKDIR /app/services/task-service
EXPOSE 3000
CMD ["npx", "ts-node", "src/index.ts"]