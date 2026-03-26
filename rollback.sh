#!/bin/bash

# ==============================================================================
# Script de Rollback - Voltar para versão anterior
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     ⚠️  ROLLBACK - Voltar para versão anterior              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se existe backup
LATEST_BACKUP=$(ls -dt backup-* 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}Nenhum backup encontrado!${NC}"
    exit 1
fi

echo -e "${YELLOW}Backup encontrado: $LATEST_BACKUP${NC}"
echo -e "${RED}ATENÇÃO: Isso vai reverter para a versão antiga do bot!${NC}"
echo ""
read -p "Tem certeza? (digite 'sim' para confirmar): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    echo "Rollback cancelado."
    exit 0
fi

echo "Iniciando rollback..."

# Parar containers novos
docker-compose down

# Restaurar arquivos
if [ -f "$LATEST_BACKUP/.env.backup" ]; then
    cp "$LATEST_BACKUP/.env.backup" .env
    echo "✓ .env restaurado"
fi

if [ -d "$LATEST_BACKUP/src-old" ]; then
    rm -rf src
    cp -r "$LATEST_BACKUP/src-old" src
    echo "✓ Código antigo restaurado"
fi

if [ -d "$LATEST_BACKUP/data-old" ]; then
    rm -rf data
    cp -r "$LATEST_BACKUP/data-old" data
    echo "✓ Dados restaurados"
fi

# Reverter git
git checkout HEAD~1

# Reiniciar sistema antigo
npm install
npm start

echo -e "${GREEN}✓ Rollback concluído${NC}"
echo "Sistema antigo restaurado do backup: $LATEST_BACKUP"