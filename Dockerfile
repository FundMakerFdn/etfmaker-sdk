FROM node:20.7.0

WORKDIR /app

COPY package.json  package-lock.json ./

RUN npm install

COPY . .

EXPOSE ${APP_PORT}
