# 🚀 Deploy do Atende Camaleão

## Opção 1: VPS com Docker (Recomendado)

### Pré-requisitos
- VPS Ubuntu 22.04+ (mínimo 2GB RAM)
- Docker e Docker Compose instalados
- Domínio configurado (para webhook HTTPS)
- Certificado SSL (Let's Encrypt)

### Passo a passo

1. **Conecte no servidor**
```bash
ssh root@seu-servidor.com
```

2. **Clone o repositório**
```bash
cd /opt
git clone https://github.com/Wellingtoncamaleao/atende-camaleao.git
cd atende-camaleao
```

3. **Configure as variáveis**
```bash
cp .env.example .env
nano .env
# Configure todas as variáveis necessárias
```

4. **Configure SSL com Nginx (se necessário)**
```bash
# Instalar Nginx e Certbot
apt update && apt install -y nginx certbot python3-certbot-nginx

# Configurar proxy reverso
cat > /etc/nginx/sites-available/atende-camaleao << EOF
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/atende-camaleao /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Gerar certificado SSL
certbot --nginx -d seu-dominio.com
```

5. **Inicie os containers**
```bash
docker-compose up -d
```

6. **Configure o webhook da Evolution**
```bash
curl -X POST https://seu-dominio.com/setup
```

7. **Verificar logs**
```bash
docker-compose logs -f
```

## Opção 2: Deploy Manual (sem Docker)

### Requisitos
- Node.js 20+
- Redis
- PostgreSQL
- PM2 (gerenciador de processos)

### Instalação

1. **Instalar dependências do sistema**
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Redis
sudo apt-get install -y redis-server
sudo systemctl enable redis-server

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql

# PM2
npm install -g pm2
```

2. **Configurar banco de dados**
```bash
sudo -u postgres psql
CREATE DATABASE atendimento;
CREATE USER camaleao WITH ENCRYPTED PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE atendimento TO camaleao;
\q

# Executar schema
psql -U camaleao -d atendimento < sql/init.sql
```

3. **Instalar aplicação**
```bash
cd /opt/atende-camaleao
npm install --production
```

4. **Configurar PM2**
```bash
# Criar ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'atende-bridge',
      script: 'bridge/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'atende-openclaw',
      script: 'agent/start.sh',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Opção 3: Deploy na HostGator (Shared Hosting)

⚠️ **Limitações**: Shared hosting tem limitações. Recomendamos VPS para produção.

1. **Preparar arquivos**
```bash
# Criar versão PHP bridge
# Converter server.js para PHP
# Usar webhooks ao invés de WebSocket
```

2. **Upload via FTP**
```bash
# Usar FileZilla ou WinSCP
# Subir para public_html/atende/
```

3. **Configurar cron jobs no cPanel**
```bash
*/5 * * * * cd /home/seu-usuario/public_html/atende && php process-queue.php
```

## Monitoramento

### Health Checks
```bash
# Status geral
curl https://seu-dominio.com/health

# Métricas
curl https://seu-dominio.com/metrics

# Dashboard
https://seu-dominio.com/dashboard
```

### Logs
```bash
# Docker
docker-compose logs -f bridge
docker-compose logs -f openclaw

# PM2
pm2 logs atende-bridge
pm2 logs atende-openclaw

# Systemd
journalctl -u atende-camaleao -f
```

### Alertas
Configure alertas no seu servidor:

```bash
# Instalar monitoring
apt install -y monit

# Configurar alertas
cat > /etc/monit/conf.d/atende-camaleao << EOF
check process bridge with pidfile /var/run/atende-bridge.pid
  start program = "/usr/bin/pm2 start atende-bridge"
  stop program = "/usr/bin/pm2 stop atende-bridge"
  if failed port 3000 protocol http
    request "/health"
    with timeout 10 seconds
    then restart
  if 5 restarts within 5 cycles then alert
EOF

systemctl reload monit
```

## Backup

### Configurar backup automático
```bash
# Criar script de backup
cat > /opt/backup-atende.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/atende-camaleao"

# Backup banco
pg_dump -U camaleao atendimento > $BACKUP_DIR/db_$DATE.sql

# Backup configs
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /opt/atende-camaleao/.env

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /opt/atende-camaleao/logs/

# Limpar backups antigos (manter 30 dias)
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /opt/backup-atende.sh

# Agendar no cron
echo "0 3 * * * /opt/backup-atende.sh" | crontab -
```

## Troubleshooting

### Container não inicia
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

### Webhook não recebe mensagens
```bash
# Verificar Evolution
curl -H "apikey: sua-key" https://evolution-url/instance/fetchInstances

# Re-configurar webhook
curl -X POST https://seu-dominio.com/setup
```

### Respostas lentas
```bash
# Verificar recursos
docker stats
htop

# Aumentar workers
nano docker-compose.yml
# Ajustar replicas do bridge
```

### Erro de conexão com banco
```bash
# Verificar PostgreSQL
docker-compose exec postgres psql -U camaleao -d atendimento

# Recriar banco se necessário
docker-compose down -v
docker-compose up -d
```

## Segurança

### Firewall
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000
ufw enable
```

### Fail2ban
```bash
apt install -y fail2ban
systemctl enable fail2ban
```

### Atualização
```bash
# Backup antes
./backup-atende.sh

# Atualizar código
git pull

# Rebuild
docker-compose build
docker-compose up -d
```

## Suporte

Em caso de problemas:
1. Verifique os logs
2. Consulte a documentação
3. Abra uma issue no GitHub
4. Contate o suporte técnico

---

**Desenvolvido para Camaleão Camisas**