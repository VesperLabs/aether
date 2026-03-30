# ---- Build Stage ----
FROM node:22-bookworm AS build

# Update package lists
RUN apt-get update

# Install required packages
RUN apt-get install -y python3 python3-pip pkg-config libcairo2-dev libpango1.0-dev \
    libpng-dev libjpeg-dev libgif-dev librsvg2-dev

# Clean up APT cache to reduce image size
RUN rm -rf /var/lib/apt/lists/*

# Check Python and Pip version
RUN python3 --version
RUN pip3 --version

# Set working directory
WORKDIR /app

# Define build-time variables
ARG DEBUG
ARG MONGO_URL
ARG SERVER_FPS
ARG SERVER_URL
ARG PORT
ARG ASSETS_URL
ARG PUBLIC_DIR
ARG PEER_SERVER_PORT
ARG PEER_CLIENT_PORT
ARG PEER_CLIENT_PATH
# Metered TURN (baked into client bundle by Vite) — set via fly.toml [build.args] and/or `fly deploy --build-arg`
ARG METERED_APP_NAME
ARG METERED_API_KEY
ARG METERED_REGION

# Set environment variables
ENV DEBUG=$DEBUG
ENV MONGO_URL=$MONGO_URL
ENV SERVER_FPS=$SERVER_FPS
ENV SERVER_URL=$SERVER_URL
ENV PORT=$PORT
ENV ASSETS_URL=$ASSETS_URL
ENV PUBLIC_DIR=$PUBLIC_DIR
ENV PEER_SERVER_PORT=$PEER_SERVER_PORT
ENV PEER_CLIENT_PORT=$PEER_CLIENT_PORT
ENV PEER_CLIENT_PATH=$PEER_CLIENT_PATH
ENV METERED_APP_NAME=$METERED_APP_NAME
ENV METERED_API_KEY=$METERED_API_KEY
ENV METERED_REGION=$METERED_REGION

# Copy workspace manifests first (layer cache)
COPY ./package*.json ./
COPY ./client/package*.json ./client/
COPY ./web/package*.json ./web/
COPY ./ui/package*.json ./ui/
COPY ./shared/package*.json ./shared/
RUN npm install

# Copy all other project files
COPY . .

# Game client + server (uses workspace Vite; marketing `web` is built separately e.g. Render)
RUN npm run client:build
RUN npm run server:build

# ---- Production Stage ----
FROM node:22-bookworm AS production

WORKDIR /app

# Copy necessary files from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/public ./public  
COPY --from=build /app/dist ./dist 

# Install canvas module
RUN npm install canvas --build-from-source

# Expose necessary ports
EXPOSE 8080

# Start the server
CMD ["npm", "run", "server:run"]
