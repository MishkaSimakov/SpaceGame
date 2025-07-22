ARG NODE_VERSION=23.11.0

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
#ENV NODE_ENV production

WORKDIR /usr/src/game/client

# Client
COPY ./package.json ./package-lock.json ./

RUN npm ci

# Run the application as a non-root user.
USER node

# Run the application.
CMD ["npm", "run", "watch"]
