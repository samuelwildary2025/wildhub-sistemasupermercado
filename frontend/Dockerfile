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

# ✅ Substituir manualmente dentro do Vite antes de buildar
RUN echo "Injetando VITE_API_BASE_URL=${VITE_API_BASE_URL}" && \
    sed -i "s|import\.meta\.env\.VITE_API_BASE_URL|\"${VITE_API_BASE_URL}\"|g" src/axios.js && \
    npm run build

# ================================
# 🚀 Production Stage (Nginx)
# ================================
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
