FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend code
COPY . .

EXPOSE 5173

# --host is required so Vite is accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]
