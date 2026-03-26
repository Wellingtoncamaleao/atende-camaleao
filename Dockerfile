# Dockerfile simples e funcional
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --production

# Copiar código
COPY src/ ./src/
COPY data/ ./data/

# Criar diretório de logs
RUN mkdir -p /app/logs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Iniciar aplicação
CMD ["node", "src/index.js"]