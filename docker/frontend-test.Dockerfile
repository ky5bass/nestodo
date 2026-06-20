FROM node:22-alpine

RUN apk add --no-cache chromium

ENV CHROME_BIN=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig*.json karma.conf.js ./
COPY src ./src

CMD ["npm", "run", "verify:docker"]
