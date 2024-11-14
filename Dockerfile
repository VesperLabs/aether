# ---- Build Stage ----
FROM node:21.7.3 AS build

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

# Install global dependencies
RUN npm install -g vite@4.3.9

# Copy package files and install dependencies
COPY ./package*.json ./
COPY ./client/package*.json ./client/
COPY ./server/package*.json ./server/
COPY ./ui/package*.json ./ui/
COPY ./shared/package*.json ./shared/
RUN npm install

# Copy all other project files
COPY . .

# Build the client and server
RUN npm run client:build
RUN npm run server:build

# ---- Production Stage ----
FROM node:21.7.3 AS production

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
