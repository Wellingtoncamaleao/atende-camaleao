# 🚀 Deploy na VPS - Passo a Passo

## 1️⃣ Clone o repositório
```bash
git clone https://github.com/SEU_USUARIO/vivi-whatsapp-bot.git
cd vivi-whatsapp-bot
```

## 2️⃣ Configure o ambiente
```bash
cp .env.example .env
nano .env
```

**Edite o .env com:**
```env
# Bot
BOT_NAME=Vivi
BOT_PORT=3000

# Evolution (GestorConecta)
EVOLUTION_ENABLED=true
EVOLUTION_URL=https://evolution.gestorconecta.com.br
EVOLUTION_API_KEY=SUA_API_KEY_DA_EVOLUTION
EVOLUTION_INSTANCE=vivi-camaleao

# Webhook - IMPORTANTE!
WEBHOOK_URL=https://vivi.seudominio.com.br/webhook

# API Camaleão
CAMALEAO_API_KEY=oc_a4f6e08fec8e2a64c388daf280aba64b93788206da2caa52a20b84433105e0f9
```

## 3️⃣ Instale dependências
```bash
npm install
```

## 4️⃣ Configure Evolution
```bash
node setup-evolution.js
```

## 5️⃣ Configure Nginx (Reverse Proxy)
```nginx
server {
    server_name vivi.seudominio.com.br;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/vivi.seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vivi.seudominio.com.br/privkey.pem;
}
```

## 6️⃣ Inicie com PM2
```bash
# Instalar PM2
npm install -g pm2

# Iniciar bot
pm2 start src/index.js --name vivi-bot

# Salvar config
pm2 save
pm2 startup
```

## 7️⃣ Teste
```bash
# Status
pm2 status

# Logs
pm2 logs vivi-bot

# Teste webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "oi", "from": "teste"}'
```

## 📱 No Evolution (GestorConecta)
1. Acesse: https://evolution.gestorconecta.com.br
2. Crie/abra instância: `vivi-camaleao`
3. Configure webhook: `https://vivi.seudominio.com.br/webhook`
4. Escaneie QR Code

## 🔧 Comandos Úteis

```bash
# Atualizar código
git pull && pm2 restart vivi-bot

# Ver logs em tempo real
pm2 logs vivi-bot --lines 100

# Monitorar
pm2 monit

# Parar
pm2 stop vivi-bot

# Reiniciar
pm2 restart vivi-bot
```

## ⚠️ Troubleshooting

### Bot não recebe mensagens
- Verifique webhook na Evolution
- Confirme que porta 3000 está aberta
- Teste: `curl http://localhost:3000/health`

### Evolution não conecta
- Verifique API Key
- Confirme URL: https://evolution.gestorconecta.com.br
- Teste conexão: `curl https://evolution.gestorconecta.com.br`

### Nginx 502 Bad Gateway
- Bot está rodando? `pm2 status`
- Porta correta? `netstat -tlpn | grep 3000`
- Reinicie: `pm2 restart vivi-bot`

---
**Suporte:** Wellington - WhatsApp (11) 94567-8900