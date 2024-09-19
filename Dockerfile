# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
FROM node:lts as base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y build-essential pkg-config python-is-python3

# Install node modules
COPY --link package-lock.json package.json ./

RUN npm install

COPY --link . .

ENV NODE_ENV="production"

# Copy application code
COPY --link . .


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "node", "index.js" ]