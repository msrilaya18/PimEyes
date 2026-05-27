# Use Node 18 slim image as the base
FROM node:18-bullseye-slim

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Install Playwright and its OS dependencies specifically for Chromium
# This keeps the image size smaller by only installing the Chromium browser
RUN npx playwright install --with-deps chromium

# Copy all project files into the container
COPY . .

# Create the uploads and results directories to ensure they exist
RUN mkdir -p uploads public/results

# Expose port 3000 for the Express server
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
