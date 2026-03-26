#!/bin/bash

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   🤖 Instalando Vivi WhatsApp Bot${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado!${NC}"
    echo "Instale: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "         sudo apt-get install -y nodejs"
    exit 1
fi

echo -e "${GREEN}✅ Node.js encontrado: $(node -v)${NC}\n"

# Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
npm install

# Configurar .env
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}⚙️ Configurando ambiente...${NC}"
    cp .env.example .env
    
    read -p "Usar Docker? (s/n): " USE_DOCKER
    
    if [[ $USE_DOCKER == "s" ]]; then
        # Docker
        echo -e "\n${YELLOW}🐳 Configurando Docker...${NC}"
        
        # Verificar Docker
        if ! command -v docker &> /dev/null; then
            echo -e "${YELLOW}Docker não instalado. Instalando...${NC}"
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            rm get-docker.sh
        fi
        
        # Verificar Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            echo -e "${YELLOW}Instalando Docker Compose...${NC}"
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi
        
        echo -e "\n${GREEN}🚀 Iniciando com Docker...${NC}"
        docker-compose up -d
        
        echo -e "\n${GREEN}========================================${NC}"
        echo -e "${GREEN}✅ VIVI INSTALADA COM SUCESSO!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "📱 Evolution API: http://$(hostname -I | awk '{print $1}'):8084"
        echo -e "🤖 Bot Vivi: http://$(hostname -I | awk '{print $1}'):3000"
        echo -e "🔑 API Key: vivi-key-2024"
        echo -e "${GREEN}========================================${NC}\n"
        echo -e "${YELLOW}📱 Para conectar WhatsApp:${NC}"
        echo "1. Acesse a Evolution API"
        echo "2. Crie instância: vivi-camaleao"
        echo "3. Escaneie o QR Code"
        echo ""
        echo -e "${YELLOW}📊 Ver logs:${NC}"
        echo "docker-compose logs -f"
        
    else
        # Sem Docker
        echo -e "\n${YELLOW}Porta do bot (padrão 3000): ${NC}"
        read -p "" PORT
        PORT=${PORT:-3000}
        
        sed -i "s/BOT_PORT=.*/BOT_PORT=$PORT/" .env
        
        # PM2
        if command -v pm2 &> /dev/null; then
            echo -e "\n${GREEN}🚀 Iniciando com PM2...${NC}"
            pm2 start src/index.js --name vivi-bot
            pm2 save
        else
            echo -e "\n${GREEN}🚀 Iniciando bot...${NC}"
            nohup npm start > logs/vivi.log 2>&1 &
            echo "PID: $!"
        fi
        
        echo -e "\n${GREEN}========================================${NC}"
        echo -e "${GREEN}✅ VIVI INSTALADA COM SUCESSO!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "🤖 Bot rodando em: http://$(hostname -I | awk '{print $1}'):$PORT"
        echo -e "📝 Logs: tail -f logs/vivi.log"
        echo -e "${GREEN}========================================${NC}\n"
        echo -e "${YELLOW}Configure seu WhatsApp para enviar webhooks para:${NC}"
        echo "http://$(hostname -I | awk '{print $1}'):$PORT/webhook"
    fi
else
    echo -e "${YELLOW}.env já existe. Pulando configuração.${NC}"
fi

echo -e "\n${GREEN}🎉 Instalação completa!${NC}"
echo -e "${YELLOW}Teste enviando:${NC}"
echo "curl -X POST http://localhost:3000/webhook -H 'Content-Type: application/json' -d '{\"message\": \"oi\", \"from\": \"teste\"}'"