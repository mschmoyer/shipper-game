# Use a Node.js base image
FROM node:18 AS builder

# Install PostgreSQL client utilities
RUN apt-get update && apt-get install -y postgresql-client

# Set the working directory
WORKDIR /app

# Copy and install dependencies for the backend
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy and install dependencies for the frontend
COPY client/package*.json ./client/
RUN cd client && npm install

# Build the React app
COPY client ./client
RUN cd client && npm run build

# Copy the server files
COPY server ./server

# Copy the init-db.sh script and make it executable
COPY server/init-db.sh /app/init-db.sh
RUN chmod +x /app/init-db.sh

# Set the working directory for the backend
WORKDIR /app/server

# Expose the port
EXPOSE 5005

# Run the resetDatabase script
RUN node scripts/resetDatabase.js

# Start the server
CMD ["node", "server.js"]
