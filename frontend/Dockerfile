FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3240
CMD ["sh", "-c", "sed -i 's/listen       80;/listen       3240;/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
