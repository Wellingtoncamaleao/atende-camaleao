#!/bin/bash

# SUBSTITUA COM SEU USUÁRIO DO GITHUB
GITHUB_USER="SEU_USUARIO_AQUI"

echo "🚀 Enviando Vivi para o GitHub..."

# Configurar remoto
git remote add origin https://github.com/${GITHUB_USER}/vivi-whatsapp-bot.git 2>/dev/null || \
git remote set-url origin https://github.com/${GITHUB_USER}/vivi-whatsapp-bot.git

# Renomear branch para main
git branch -M main

# Push
git push -u origin main

echo "✅ Pronto! Agora na VPS rode:"
echo ""
echo "git clone https://github.com/${GITHUB_USER}/vivi-whatsapp-bot.git"
echo "cd vivi-whatsapp-bot"
echo "bash install.sh"