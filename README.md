# 🤖 Vivi WhatsApp Bot - Camaleão Camisas

Bot de atendimento automático via WhatsApp para Camaleão Camisas.

## 🚀 Instalação Rápida (1 comando)

```bash
git clone https://github.com/SEU_USUARIO/vivi-whatsapp-bot.git && cd vivi-whatsapp-bot && bash install.sh
```

## 📋 Pré-requisitos

- Node.js 18+
- Docker (opcional)
- WhatsApp Business ou pessoal

## 🔧 Instalação Manual

### 1. Clone o repositório
```bash
git clone https://github.com/SEU_USUARIO/vivi-whatsapp-bot.git
cd vivi-whatsapp-bot
```

### 2. Configure o ambiente
```bash
cp .env.example .env
nano .env  # Edite as configurações
```

### 3. Instale dependências
```bash
npm install
```

### 4. Inicie o bot
```bash
npm start
```

## 🐳 Docker (Recomendado)

```bash
# Iniciar com Docker Compose (Evolution + Bot)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

## 📱 Conectar WhatsApp

### Opção 1: Evolution API Externa (GestorConecta)
```bash
# Configure no .env:
EVOLUTION_URL=https://evolution.gestorconecta.com.br
EVOLUTION_API_KEY=sua_api_key_aqui

# Execute:
node setup-evolution.js
```

### Opção 2: Baileys direto
```bash
USE_BAILEYS_DIRECT=true npm start
```

### Opção 3: Webhook externo
Configure seu sistema para enviar POST para:
```
http://SEU_IP:3000/webhook
```

## 🎯 Funcionalidades

- ✅ Tabela de preços automática
- ✅ Orçamentos instantâneos
- ✅ Catálogo de produtos
- ✅ Cálculo de prazos
- ✅ Escalação para vendedor
- ✅ Horário comercial
- ✅ Multi-plataforma

## 📊 Comandos do Cliente

- `oi` - Iniciar atendimento
- `1` - Ver preços
- `2` - Fazer orçamento
- `3` - Ver produtos
- `4` - Consultar prazos
- `5` - Falar com vendedor

## 🔌 Endpoints API

- `GET /` - Status do bot
- `GET /health` - Health check
- `GET /status` - Status detalhado
- `POST /webhook` - Receber mensagens

## 📁 Estrutura

```
vivi-whatsapp-bot/
├── src/
│   ├── index.js       # Servidor principal
│   ├── evolution.js   # Integração Evolution
│   ├── responses.js   # Lógica de respostas
│   └── logger.js      # Sistema de logs
├── data/             # Base de conhecimento
├── logs/             # Arquivos de log
├── docker-compose.yml
└── .env
```

## ⚙️ Configuração Avançada

### Personalizar respostas
Edite: `src/responses.js`

### Adicionar produtos
Crie: `data/produtos.json`

### Modificar preços
Edite: `src/responses.js` (seção precos)

## 🚨 Troubleshooting

### Bot não responde
```bash
# Verificar logs
tail -f logs/vivi.log

# Reiniciar
npm restart
```

### WhatsApp desconectou
```bash
# Gerar novo QR
curl http://localhost:3000/status
```

### Evolution não conecta
```bash
# Verificar container
docker ps
docker-compose restart evolution
```

## 📈 Monitoramento

```bash
# Status em tempo real
watch curl -s http://localhost:3000/status

# Mensagens processadas
curl http://localhost:3000/status | grep messages_processed
```

## 🛡️ Segurança

- API Key protegida
- Rate limiting configurado
- Logs sem dados sensíveis
- CORS habilitado

## 📞 Suporte

- WhatsApp: (11) 94567-8900
- Email: suporte@camaleaocamisas.com.br

## 📜 Licença

MIT - Use como quiser!

---

**Desenvolvido com ❤️ para Camaleão Camisas**