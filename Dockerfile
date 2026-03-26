FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código
COPY . .

# Criar diretórios
RUN mkdir -p logs data

# Defaults para variaveis de ambiente
ENV BOT_NAME=Vivi
ENV BOT_PORT=3000
ENV EVOLUTION_ENABLED=true

# Expor porta
EXPOSE 3000

# Comando - node direto (npm nao repassa signals corretamente)
CMD ["node", "src/index.js"]
