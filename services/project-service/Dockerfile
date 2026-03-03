FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY tsconfig.json ./

EXPOSE 3002

CMD ["npx", "ts-node", "src/index.ts"]
