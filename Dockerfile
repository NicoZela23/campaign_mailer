# Stage 1: Build the client
FROM node:18-slim AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the server
FROM node:18-slim AS server-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY server/ ./server/

# Stage 3: Final production image
FROM node:18-slim
WORKDIR /app
COPY --from=server-builder /app .
COPY --from=client-builder /app/client/dist ./client/dist

# Expose the port the app runs on
EXPOSE 8080

# Set the environment variable for production
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/index.js"]
