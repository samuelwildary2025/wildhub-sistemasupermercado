# ================================
# 🔧 Build Stage
# ================================
FROM node:18-alpine AS build

WORKDIR /app

# Recebe variável do ambiente do EasyPanel
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copiar pacotes e instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar o código
COPY . .

# ✅ Forçar o uso da variável durante o build do Vite
RUN VITE_API_BASE_URL=${VITE_API_BASE_URL} npm run build

# ================================
# 🚀 Production Stage (Nginx)
# ================================
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
