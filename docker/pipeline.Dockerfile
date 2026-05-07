FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl jq && \
    npm install -g playwright@latest && \
    npx playwright install --with-deps chromium
COPY package*.json ./
RUN npm ci --omit=dev
COPY . ./
ENTRYPOINT ["bash", "scripts/pipeline-entrypoint.sh"]
