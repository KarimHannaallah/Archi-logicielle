FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/auth-service/package.json services/auth-service/
RUN npm ci --omit=dev
COPY services/auth-service/src/ services/auth-service/src/
COPY services/auth-service/tsconfig.json services/auth-service/
WORKDIR /app/services/auth-service
EXPOSE 3001
CMD ["npx", "ts-node", "src/index.ts"]