FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./

COPY services/task-service/package.json services/task-service/

RUN npm ci --omit=dev

COPY services/task-service/src/ services/task-service/src/
COPY services/task-service/tsconfig.json services/task-service/

WORKDIR /app/services/task-service

EXPOSE 3000

CMD ["npx", "ts-node", "src/index.ts"]
