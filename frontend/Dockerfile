FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Default to dev server (compose can override)
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

