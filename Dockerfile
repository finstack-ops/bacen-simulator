ARG NODE_VERSION=21.7.0
FROM node:${NODE_VERSION}-alpine as alpine
WORKDIR /usr/src/app

# Enable corepack so the pnpm version pinned in package.json's
# `packageManager` field is the one used for install/run.
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile

ENV PORT=8080

EXPOSE 8080
CMD pnpm run start
