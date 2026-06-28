FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-auth/package.json packages/shared-auth/
COPY packages/shared-db/package.json packages/shared-db/
COPY services/auth-service/package.json services/auth-service/
RUN npm ci --omit=dev
COPY packages/shared-auth/src/ packages/shared-auth/src/
COPY packages/shared-db/src/ packages/shared-db/src/
COPY services/auth-service/src/ services/auth-service/src/
COPY services/auth-service/migrations/ services/auth-service/migrations/
COPY services/auth-service/tsconfig.json services/auth-service/
WORKDIR /app/services/auth-service
EXPOSE 3001
CMD ["npx", "ts-node", "src/index.ts"]