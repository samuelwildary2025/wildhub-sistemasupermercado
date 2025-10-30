# ================================
# 🔧 Build Stage
# ================================
FROM node:18-alpine AS build

WORKDIR /app

# Recebe a variável do ambiente (vinda do EasyPanel)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copiar pacotes e instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código-fonte
COPY . .

# Garante que a variável entre no build do Vite
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env

# Compila o app com HTTPS correto
RUN npm run build

# ================================
# 🚀 Production Stage (Nginx)
# ================================
FROM nginx:alpine

# Copiar build
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
