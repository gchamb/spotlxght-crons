FROM node:20

ENV DATABASE_URL ""
ENV APP_ORIGIN "https://dev.spotlxght.com"

WORKDIR /app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

RUN pnpm build

CMD [ "pnpm", "start" ]