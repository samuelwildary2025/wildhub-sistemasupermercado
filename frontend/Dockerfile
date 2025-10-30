# ================================
# 🔧 Build Stage
# ================================
FROM node:18-alpine AS build

WORKDIR /app

# Copiar dependências e instalar
COPY package*.json ./
RUN npm ci

# Copiar código-fonte
COPY . .

# Receber variável manualmente (do EasyPanel)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# ✅ Substituir o import.meta.env pela URL real antes do build
RUN echo "Injetando VITE_API_BASE_URL=${VITE_API_BASE_URL}" && \
    sed -i "s|import\.meta\.env\.VITE_API_BASE_URL|\"${VITE_API_BASE_URL}\"|g" src/services/api.js && \
    npm run build

# ================================
# 🚀 Production Stage (Nginx)
# ================================
FROM nginx:alpine

# Copiar build final para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
