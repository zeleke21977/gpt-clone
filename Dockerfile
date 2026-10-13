# ---------- 1) build the React frontend ----------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci || npm install
COPY frontend ./
RUN npm run build

# ---------- 2) backend that also serves the built frontend ----------
FROM node:22-alpine
WORKDIR /app/backend
ENV NODE_ENV=production \
    PORT=3130 \
    UPLOADS_DIR=/data/uploads

COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

RUN mkdir -p /data/uploads/images && chown -R node:node /data /app
USER node

EXPOSE 3130
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "index.js"]
