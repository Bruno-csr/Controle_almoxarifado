FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=80 \
    DATA_DIR=/app/data

COPY package.json ./
COPY server.js ./
COPY public ./public

RUN mkdir -p /app/data

EXPOSE 80
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
