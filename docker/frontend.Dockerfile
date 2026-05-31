FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig*.json karma.conf.js proxy.conf.json ./
COPY src ./src

EXPOSE 4200

CMD ["npm", "run", "start:docker"]
