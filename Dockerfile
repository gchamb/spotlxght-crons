FROM node:20

ENV DATABASE_URL ""
ENV APP_ORIGIN "https://theunderground-dev.vercel.app"

WORKDIR /app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

RUN pnpm build

CMD [ "pnpm", "start" ]