FROM node:18-alpine

# Create app directory inside container
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend code into container
COPY backend ./backend

# Copy any other file your backend needs
COPY .env ./

# Expose backend port
EXPOSE 3000

# Start the backend server
CMD ["npm", "backend/server.js"]