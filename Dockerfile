# Use an official Node.js LTS version as the base image
FROM node:lts-alpine

# Set the working directory in the container
WORKDIR /app

# Update package lists and install ntp
RUN apk --no-cache add ntp

COPY . /app

RUN npm install

# Build the application
RUN npm run server:build && npm run client:build

# Expose the port your app runs on. This example assumes your server might run on port 3000.
EXPOSE 3000

CMD ["npm", "run", "server:run"]