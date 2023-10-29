# Use an official Node.js LTS version as the base image
FROM node:lts

# Set the working directory in the container
WORKDIR /app

# Update package lists and install ntp
RUN apt-get update && apt-get install -y ntp && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run server:build && npm run client:build

# Expose the port your app runs on. This example assumes your server might run on port 3000.
EXPOSE 3000

# Define the ENTRYPOINT and the default command for the container
ENTRYPOINT ["npm"]

CMD ["run", "server:run"]