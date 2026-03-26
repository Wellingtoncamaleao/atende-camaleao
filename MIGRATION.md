# 📦 Guia de Migração - v1.0 → v2.0 OpenClaw

## 🚨 Mudança Importante

O Atende Camaleão foi **completamente reescrito** da v1.0 (bot simples) para v2.0 (sistema inteligente com OpenClaw).

## 🎯 Opções de Migração

### Opção 1: Script Automático (Recomendado)
```bash
# Na VPS, no diretório do projeto
./migrate.sh
```

Este script vai:
- ✅ Fazer backup do sistema antigo
- ✅ Atualizar o código
- ✅ Migrar configurações
- ✅ Subir novo sistema
- ✅ Configurar webhook

### Opção 2: Deploy Limpo
```bash
# Para instalação nova
./quick-start.sh
```

### Opção 3: Migração Manual

#### 1. Fazer backup
```bash
cp -r . ../backup-atende-$(date +%Y%m%d)
cp .env .env.backup
```

#### 2. Parar sistema antigo
```bash
docker stop $(docker ps -q --filter name=vivi)
pm2 stop all  # Se usar PM2
```

#### 3. Atualizar código
```bash
git pull origin main
```

#### 4. Configurar novo .env
```bash
cp .env.example .env
# Copiar valores do .env.backup:
# - EVOLUTION_URL
# - EVOLUTION_API_KEY
# - EVOLUTION_INSTANCE
```

#### 5. Subir novo sistema
```bash
docker-compose up -d
```

## 🔄 Rollback (Voltar versão anterior)

Se precisar voltar:
```bash
./rollback.sh
```

Ou manualmente:
```bash
docker-compose down
git checkout a119e9f  # Último commit da v1.0
npm install
npm start
```

## 📊 Comparação de Versões

| Feature | v1.0 (Antiga) | v2.0 (Nova) |
|---------|---------------|-------------|
| **Arquitetura** | Bot Express simples | OpenClaw AI + Bridge + DB |
| **Inteligência** | Respostas fixas | IA contextual |
| **Memória** | Não tem | PostgreSQL + Redis |
| **Consultas** | Fake/mockado | APIs reais em tempo real |
| **Sessões** | Stateless | Persistente por cliente |
| **Skills** | Hardcoded | Modulares e extensíveis |
| **Analytics** | Não tem | Dashboard completo |
| **Deploy** | Node direto | Docker Compose |

## 🔧 Troubleshooting

### Erro: "OpenClaw not found"
```bash
# OpenClaw é parte do container, não precisa instalar
docker-compose build --no-cache openclaw
```

### Erro: "Cannot connect to Redis"
```bash
# Verificar se Redis está rodando
docker-compose up -d redis
docker-compose logs redis
```

### Erro: "Database migration failed"
```bash
# Recriar banco
docker-compose down -v
docker-compose up -d postgres
docker-compose exec postgres psql -U camaleao -d atendimento < sql/init.sql
```

### Webhook não funciona
```bash
# Reconfigurar
curl -X POST http://localhost:3000/setup

# Verificar logs
docker-compose logs bridge
```

## 📝 Checklist Pós-Migração

- [ ] Sistema subiu sem erros
- [ ] Dashboard acessível (porta 3000)
- [ ] Webhook Evolution configurado
- [ ] .env com todas variáveis configuradas
- [ ] Teste de mensagem funcionando
- [ ] Backup do sistema antigo salvo

## 🆘 Suporte

Se tiver problemas:

1. **Verifique os logs**
```bash
docker-compose logs -f
```

2. **Status dos serviços**
```bash
curl http://localhost:3000/health
```

3. **Reiniciar tudo**
```bash
docker-compose down
docker-compose up -d
```

4. **Contato**
- Wellington: (11) 94567-8900
- Email: suporte@camaleaocamisas.com.br

## ⚡ Performance

A v2.0 é mais pesada mas MUITO mais inteligente:

- **RAM**: 2GB mínimo (vs 512MB da v1.0)
- **CPU**: 2 cores recomendado
- **Disco**: 10GB para logs e banco

Vale a pena pelo ganho em inteligência e funcionalidades.

---

**Migração típica leva 5-10 minutos**