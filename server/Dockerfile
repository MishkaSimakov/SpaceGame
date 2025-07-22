ARG NODE_VERSION=23.11.0

FROM node:${NODE_VERSION}-alpine

# Install Python (for bcrypt library)
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 py3-pip

RUN apk add --update --no-cache make gcc build-base

# Use production node environment by default.
#ENV NODE_ENV production

WORKDIR /usr/src/game/server

# Install nodemon
RUN npm i -g nodemon
RUN npm i -g typescript ts-node

# Server
COPY ./package.json ./package-lock.json ./

RUN npm ci

# Run the application as a non-root user.
USER node

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD ["nodemon", "-r", "tsconfig-paths/register", "--legacy-watch", "src/index.ts"]
