FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates wget unzip && rm -rf /var/lib/apt/lists/*
RUN wget -q https://github.com/duckdb/duckdb/releases/download/v1.1.3/duckdb_cli-linux-amd64.zip && \
    unzip -o duckdb_cli-linux-amd64.zip -d /usr/local/bin && \
    rm duckdb_cli-linux-amd64.zip

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npx prisma db seed && npm run dataset:download && npm run dataset:import && npm run start:dev"]


