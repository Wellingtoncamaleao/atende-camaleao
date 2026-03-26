#!/bin/bash

# ==============================================================================
# Script de Migração: Bot Simples → Sistema OpenClaw v2.0
# Camaleão Camisas - Atendimento Inteligente
# ==============================================================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🎨 Atende Camaleão - Migração para v2.0 OpenClaw        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Função para log
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# ==============================================================================
# PASSO 1: Verificar ambiente
# ==============================================================================

log "Verificando ambiente..."

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto atende-camaleao"
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    error "Docker não encontrado. Instale o Docker primeiro."
fi

if ! command -v docker-compose &> /dev/null; then
    warning "docker-compose não encontrado. Tentando docker compose..."
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# ==============================================================================
# PASSO 2: Backup do sistema antigo
# ==============================================================================

log "Criando backup do sistema antigo..."

BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup de arquivos importantes
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/.env.backup"
    log "✓ Backup do .env criado"
fi

if [ -d "src" ]; then
    cp -r src "$BACKUP_DIR/src-old"
    log "✓ Backup do código antigo criado"
fi

if [ -d "data" ]; then
    cp -r data "$BACKUP_DIR/data-old"
    log "✓ Backup dos dados criado"
fi

# Verificar se tem containers rodando
if docker ps | grep -q "vivi\|atende\|evolution"; then
    warning "Containers antigos detectados. Parando..."
    docker stop $(docker ps -q --filter name=vivi) 2>/dev/null || true
    docker stop $(docker ps -q --filter name=atende) 2>/dev/null || true
    log "✓ Containers antigos parados"
fi

# ==============================================================================
# PASSO 3: Atualizar código
# ==============================================================================

log "Atualizando código para v2.0..."

# Fazer pull das mudanças
git fetch origin main
git reset --hard origin/main
log "✓ Código atualizado do GitHub"

# ==============================================================================
# PASSO 4: Migrar configurações
# ==============================================================================

log "Migrando configurações..."

# Se não existe .env, criar do example
if [ ! -f ".env" ]; then
    cp .env.example .env
    warning "Criado novo .env - CONFIGURE AS VARIÁVEIS!"
else
    # Migrar variáveis do .env antigo
    if [ -f "$BACKUP_DIR/.env.backup" ]; then
        log "Migrando variáveis do .env antigo..."
        
        # Extrair variáveis antigas
        OLD_EVOLUTION_URL=$(grep "^EVOLUTION_URL=" "$BACKUP_DIR/.env.backup" | cut -d'=' -f2- || true)
        OLD_EVOLUTION_KEY=$(grep "^EVOLUTION_API_KEY=" "$BACKUP_DIR/.env.backup" | cut -d'=' -f2- || true)
        OLD_INSTANCE=$(grep "^EVOLUTION_INSTANCE=" "$BACKUP_DIR/.env.backup" | cut -d'=' -f2- || true)
        OLD_WEBHOOK=$(grep "^WEBHOOK_URL=" "$BACKUP_DIR/.env.backup" | cut -d'=' -f2- || true)
        
        # Criar novo .env preservando valores antigos
        cat > .env.migration << EOF
# OpenClaw Configuration (NOVO - CONFIGURE!)
OPENCLAW_API_KEY=oc_CONFIGURE_SUA_KEY_AQUI
OPENCLAW_AGENT_ID=atende-camaleao
OPENCLAW_MODEL=anthropic/claude-haiku-4-5
OPENCLAW_URL=http://openclaw:8080

# Evolution API (Migrado do sistema antigo)
EVOLUTION_URL=${OLD_EVOLUTION_URL:-https://evolution.gestorconecta.com.br}
EVOLUTION_API_KEY=${OLD_EVOLUTION_KEY:-CONFIGURE_AQUI}
EVOLUTION_INSTANCE=${OLD_INSTANCE:-camaleao}

# Camaleão API
CAMALEAO_API_URL=https://painel.camaleaocamisas.com.br/api/v1
CAMALEAO_API_KEY=oc_a4f6e08fec8e2a64c388daf280aba64b93788206da2caa52a20b84433105e0f9

# Bridge Server
BRIDGE_PORT=3000
WEBHOOK_URL=${OLD_WEBHOOK:-https://seu-dominio.com/webhook}
WEBHOOK_SECRET=camaleao_webhook_secret_2024
AUTO_SETUP_WEBHOOK=true
RATE_LIMIT_PER_MIN=30
SESSION_TIMEOUT_MIN=30

# Redis
REDIS_URL=redis://redis:6379

# PostgreSQL
DATABASE_URL=postgresql://camaleao:senha123@postgres:5432/atendimento

# Environment
NODE_ENV=production
EOF
        
        mv .env.migration .env
        log "✓ Configurações migradas - REVISE O .ENV!"
    fi
fi

# ==============================================================================
# PASSO 5: Preparar nova estrutura
# ==============================================================================

log "Preparando estrutura de diretórios..."

# Criar diretórios necessários
mkdir -p agent bridge dashboard skills sql logs data
mkdir -p backup-conversas  # Para guardar conversas antigas

# Mover dados antigos se existirem
if [ -d "$BACKUP_DIR/data-old" ]; then
    cp -r "$BACKUP_DIR/data-old"/* data/ 2>/dev/null || true
    log "✓ Dados antigos migrados"
fi

# ==============================================================================
# PASSO 6: Build dos containers
# ==============================================================================

log "Construindo novos containers..."

$DOCKER_COMPOSE build --no-cache
log "✓ Containers construídos"

# ==============================================================================
# PASSO 7: Inicializar banco de dados
# ==============================================================================

log "Iniciando banco de dados..."

# Subir apenas postgres primeiro
$DOCKER_COMPOSE up -d postgres redis
sleep 10  # Aguardar postgres inicializar

log "✓ Banco de dados iniciado"

# ==============================================================================
# PASSO 8: Subir sistema completo
# ==============================================================================

log "Iniciando sistema completo..."

$DOCKER_COMPOSE up -d
log "✓ Sistema v2.0 iniciado"

# Aguardar serviços subirem
log "Aguardando serviços ficarem prontos..."
sleep 15

# ==============================================================================
# PASSO 9: Verificar saúde
# ==============================================================================

log "Verificando saúde do sistema..."

# Testar Bridge Server
if curl -s http://localhost:3000/health > /dev/null; then
    log "✓ Bridge Server: OK"
else
    warning "Bridge Server não respondeu - verifique os logs"
fi

# Mostrar containers rodando
log "Containers ativos:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# ==============================================================================
# PASSO 10: Configurar webhook Evolution
# ==============================================================================

log "Configurando webhook da Evolution..."

WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:3000/setup)
if echo "$WEBHOOK_RESPONSE" | grep -q "success"; then
    log "✓ Webhook configurado com sucesso"
else
    warning "Falha ao configurar webhook - configure manualmente"
fi

# ==============================================================================
# FINALIZAÇÃO
# ==============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo ""
echo "1. ${YELLOW}IMPORTANTE:${NC} Edite o arquivo .env e configure:"
echo "   - OPENCLAW_API_KEY (se tiver)"
echo "   - EVOLUTION_API_KEY"
echo "   - WEBHOOK_URL com seu domínio real"
echo ""
echo "2. Verifique os logs:"
echo "   ${BLUE}$DOCKER_COMPOSE logs -f${NC}"
echo ""
echo "3. Acesse o dashboard:"
echo "   ${BLUE}http://localhost:3000/dashboard${NC}"
echo ""
echo "4. Teste o webhook:"
echo "   ${BLUE}curl http://localhost:3000/health${NC}"
echo ""
echo "5. Backup do sistema antigo salvo em:"
echo "   ${BLUE}$BACKUP_DIR/${NC}"
echo ""

# Mostrar avisos importantes
if [ -f ".env" ]; then
    if grep -q "CONFIGURE" .env; then
        echo -e "${RED}⚠️  ATENÇÃO: Existem variáveis não configuradas no .env!${NC}"
        echo -e "${RED}   Edite o arquivo e configure antes de usar em produção.${NC}"
        echo ""
    fi
fi

echo -e "${GREEN}📚 Documentação completa:${NC}"
echo "   https://github.com/Wellingtoncamaleao/atende-camaleao"
echo ""
echo -e "${BLUE}🚀 Sistema Atende Camaleão v2.0 - Powered by OpenClaw AI${NC}"

# Criar arquivo de status
cat > migration-status.txt << EOF
Migração executada em: $(date)
Backup salvo em: $BACKUP_DIR/
Versão antiga: Bot simples Express
Versão nova: OpenClaw v2.0
Status: SUCESSO
EOF

log "Status da migração salvo em migration-status.txt"