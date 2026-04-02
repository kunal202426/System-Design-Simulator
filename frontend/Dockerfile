FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html
# Expose port 80 (nginx default)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
