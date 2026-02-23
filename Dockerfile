FROM node:18-alpine

WORKDIR /app
COPY package.json /app/package.json
RUN npm ci || npm install
COPY . /app

EXPOSE 8080
ENV PORT=8080

CMD ["npm", "start"]
