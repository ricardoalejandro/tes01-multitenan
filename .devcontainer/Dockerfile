FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends postgresql-client redis-tools

# Install global npm packages
RUN npm install -g concurrently tsx drizzle-kit
