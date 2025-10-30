# ================================
# 🔧 Build Stage
# ================================
FROM node:18-alpine AS build

WORKDIR /app

# Recebe variável do ambiente do EasyPanel
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código-fonte
COPY . .

# ✅ Injetar variável diretamente no build
# O Alpine usa 'sh', então este comando funciona 100%
RUN VITE_API_BASE_URL=$VITE_API_BASE_URL npm run build

# ================================
# 🚀 Production Stage (Nginx)
# ================================
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
