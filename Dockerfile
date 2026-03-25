FROM node:18-alpine

# Create app directory inside container
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend code into container
COPY backend ./backend

# Expose backend port
EXPOSE 8080

# Start the backend server
CMD ["node", "backend/server.js"]