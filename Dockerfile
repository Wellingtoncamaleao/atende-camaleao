FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código
COPY . .

# Criar diretórios
RUN mkdir -p logs data

# Expor porta
EXPOSE 3000

# Comando
CMD ["npm", "start"]