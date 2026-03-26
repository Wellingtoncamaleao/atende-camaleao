#!/bin/bash

# ==============================================================================
# Quick Start - Deploy rápido em 1 minuto
# ==============================================================================

set -e

echo "🚀 Atende Camaleão - Quick Start"
echo "================================"
echo ""

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 2. Clonar repo se necessário
if [ ! -f "docker-compose.yml" ]; then
    echo "📥 Baixando código..."
    git clone https://github.com/Wellingtoncamaleao/atende-camaleao.git
    cd atende-camaleao
fi

# 3. Configurar .env
if [ ! -f ".env" ]; then
    echo "⚙️  Configurando ambiente..."
    cp .env.example .env
    
    # Pedir dados essenciais
    echo ""
    echo "Digite a URL da Evolution API:"
    read -p "URL [https://evolution.gestorconecta.com.br]: " EVO_URL
    EVO_URL=${EVO_URL:-https://evolution.gestorconecta.com.br}
    
    echo "Digite a API Key da Evolution:"
    read -p "API Key: " EVO_KEY
    
    echo "Digite a instância Evolution:"
    read -p "Instância [camaleao]: " EVO_INSTANCE
    EVO_INSTANCE=${EVO_INSTANCE:-camaleao}
    
    # Substituir no .env
    sed -i "s|EVOLUTION_URL=.*|EVOLUTION_URL=$EVO_URL|" .env
    sed -i "s|EVOLUTION_API_KEY=.*|EVOLUTION_API_KEY=$EVO_KEY|" .env
    sed -i "s|EVOLUTION_INSTANCE=.*|EVOLUTION_INSTANCE=$EVO_INSTANCE|" .env
fi

# 4. Subir sistema
echo ""
echo "🔄 Iniciando sistema..."
docker-compose up -d

# 5. Aguardar
echo "⏳ Aguardando serviços..."
sleep 20

# 6. Configurar webhook
echo "🔗 Configurando webhook..."
curl -X POST http://localhost:3000/setup

# 7. Mostrar status
echo ""
echo "✅ SISTEMA ONLINE!"
echo ""
echo "📊 Dashboard: http://localhost:3000/dashboard"
echo "🔍 Logs: docker-compose logs -f"
echo ""
echo "🎨 Atende Camaleão v2.0 - Pronto para usar!"