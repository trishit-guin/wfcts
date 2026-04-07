FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p public/uploads

EXPOSE 3000

CMD ["node", "server.js"]
