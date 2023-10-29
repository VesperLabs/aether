# Use an official Node.js LTS version as the base image
FROM node:lts-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run server:build && npm run client:build

# Expose the port your app runs on. This example assumes your server might run on port 3000.
EXPOSE 8000

CMD ["npm", "run", "server:run"]