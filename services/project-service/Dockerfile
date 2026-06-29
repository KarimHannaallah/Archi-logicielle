FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-auth/package.json packages/shared-auth/
COPY packages/shared-db/package.json packages/shared-db/
COPY services/project-service/package.json services/project-service/
RUN npm ci --omit=dev
COPY packages/shared-auth/src/ packages/shared-auth/src/
COPY packages/shared-db/src/ packages/shared-db/src/
COPY services/project-service/src/ services/project-service/src/
COPY services/project-service/migrations/ services/project-service/migrations/
COPY services/project-service/tsconfig.json services/project-service/
WORKDIR /app/services/project-service
LABEL provides.api-version="v1" \
      provides.service="project-service" \
      requires.auth-service=">=1.0.0"
EXPOSE 3002
CMD ["npx", "ts-node", "src/index.ts"]