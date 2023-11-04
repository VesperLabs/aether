# ---- Build Stage ----
FROM node:lts AS build

# Update package lists
RUN apt-get update

# Trying to sync NTP (Doesn't work)
# RUN apt-get install -y ntp
# RUN apt-get install -y tzdata && \
#     ln -fs /usr/share/zoneinfo/UTC /etc/localtime && \
#     dpkg-reconfigure -f noninteractive tzdata

# Install each package individually
RUN apt-get install -y python3
RUN apt-get install -y python3-pip
RUN apt-get install -y pkg-config
RUN apt-get install -y libcairo2-dev
RUN apt-get install -y libpango1.0-dev
RUN apt-get install -y libpng-dev
RUN apt-get install -y libjpeg-dev
RUN apt-get install -y libgif-dev
RUN apt-get install -y librsvg2-dev

# Clean up APT cache
RUN rm -rf /var/lib/apt/lists/*

# Check Python and Pip version
RUN python3 --version
RUN pip3 --version

# Set working directory
WORKDIR /app

ARG DEBUG
ARG MONGO_URL
ARG SERVER_FPS
ARG SERVER_URL
ARG PORT
ARG ASSETS_URL
ARG PUBLIC_DIR
ARG PEER_SERVER_PORT

ENV DEBUG=$DEBUG
ENV MONGO_URL=$MONGO_URL
ENV SERVER_FPS=$SERVER_FPS
ENV SERVER_URL=$SERVER_URL
ENV PORT=$PORT
ENV ASSETS_URL=$ASSETS_URL
ENV PUBLIC_DIR=$PUBLIC_DIR
ENV PEER_SERVER_PORT=$PEER_SERVER_PORT

RUN echo "DEBUG: $DEBUG" && \
    echo "MONGO_URL: $MONGO_URL" && \
    echo "SERVER_FPS: $SERVER_FPS" && \
    echo "SERVER_URL: $SERVER_URL" && \
    echo "PORT: $PORT" && \
    echo "ASSETS_URL: $ASSETS_URL" && \
    echo "PUBLIC_DIR: $PUBLIC_DIR" && \
    echo "PEER_SERVER_PORT: $PEER_SERVER_PORT"

# Install global dependencies
RUN npm install -g vite

# Copy package.json and package-lock.json before other files
# Utilize Docker cache to save re-installing dependencies if unchanged
COPY ./package*.json ./
COPY ./client/package*.json ./client/
COPY ./server/package*.json ./server/
COPY ./ui/package*.json ./ui/
COPY ./shared/package*.json ./shared/

# Install npm dependencies
RUN npm install

# Copy everything over
COPY . .

# Build the client and the server
RUN npm run client:build
RUN npm run server:build

# ---- Production Stage ----
FROM node:lts AS production

WORKDIR /app

# Copy necessary files and directories from the previous stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/public ./public  
COPY --from=build /app/dist ./dist 

# Here we reinstall the canvas module specifically in the production environment
RUN npm install canvas --build-from-source

# Expose necessary ports (adjust if needed)
EXPOSE 8000


# This assumes you have a start script in your server's package.json
CMD ["npm", "run", "server:run"]
