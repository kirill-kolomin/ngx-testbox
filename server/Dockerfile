# Simple Node.js runtime to serve the Express API
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
