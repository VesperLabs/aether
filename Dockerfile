# Use an official Node.js LTS version as the base image
FROM node:lts

# Set the working directory in the container
WORKDIR /app
ENV NODE_ENV production

# Update package lists
RUN apt-get update

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

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

RUN npm install husky --no-save && npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run server:build && npm run client:build

# Expose the port your app runs on. This example assumes your server might run on port 3000.
EXPOSE 8000

CMD ["npm", "run", "server:run"]
