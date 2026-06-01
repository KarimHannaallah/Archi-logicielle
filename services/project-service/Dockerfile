FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/project-service/package.json services/project-service/

RUN npm ci --omit=dev

COPY services/project-service/src/ services/project-service/src/
COPY services/project-service/tsconfig.json services/project-service/

WORKDIR /app/services/project-service

EXPOSE 3002

CMD ["npx", "ts-node", "src/index.ts"]
