FROM node:20-alpine

WORKDIR /app

COPY app/package.json ./
COPY app/server.js ./
COPY app/auth ./auth
COPY app/config ./config
COPY app/frontend ./frontend
COPY app/integrations ./integrations

RUN mkdir -p /data/config && \
    cp config/credentials.example.json /data/config/credentials.example.json

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV AUTH_ENABLED=true

VOLUME ["/data"]
ENV DATA_DIR=/data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["node", "server.js"]
