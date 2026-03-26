# 🎨 Atende Camaleão v2.0 - Bot WhatsApp Inteligente

Bot de atendimento automático via WhatsApp para Camaleão Camisas, agora com IA e sessões persistentes.

## ✨ O que há de novo na v2.0

- **🧠 IA Integrada**: Gemini, Claude ou OpenAI para respostas inteligentes
- **💾 Sessões com Redis**: Mantém contexto das conversas
- **🔌 API Real**: Consulta pedidos direto do painel Camaleão
- **📊 Cache inteligente**: Respostas mais rápidas
- **🐳 Docker otimizado**: Deploy simples e confiável

## 🚀 Instalação Rápida

### Opção 1: Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/Wellingtoncamaleao/atende-camaleao.git
cd atende-camaleao

# Configure as variáveis
cp .env.example .env
nano .env  # Edite com suas chaves

# Suba o sistema
docker-compose up -d

# Veja os logs
docker-compose logs -f
```

### Opção 2: Node.js Direto

```bash
# Instale as dependências
npm install

# Configure o .env
cp .env.example .env
nano .env

# Inicie o bot
npm start
```

## ⚙️ Configuração

### Variáveis Essenciais (.env)

```env
# Evolution API (Obrigatório)
EVOLUTION_URL=https://evolution.gestorconecta.com.br
EVOLUTION_API_KEY=sua_chave_aqui
EVOLUTION_INSTANCE=camaleao

# IA (Opcional - escolha uma ou mais)
GOOGLE_AI_API_KEY=sua_chave_gemini      # Recomendado (grátis)
ANTHROPIC_API_KEY=sua_chave_claude      # Alternativa
OPENAI_API_KEY=sua_chave_openai         # Fallback

# API Camaleão (Opcional - para consultas reais)
CAMALEAO_API_KEY=oc_a4f6e08fec8e2a64c388daf280aba64b93788206da2caa52a20b84433105e0f9

# Redis (Opcional - para cache)
REDIS_URL=redis://redis:6379
```

## 🎯 Funcionalidades

### Menu Principal
1️⃣ **Tabela de preços** - Valores atualizados  
2️⃣ **Fazer orçamento** - Cálculo automático com descontos  
3️⃣ **Consultar pedido** - Status em tempo real (se API configurada)  
4️⃣ **Ver produtos** - Catálogo completo  
5️⃣ **Falar com vendedor** - Escalonamento humano  
6️⃣ **Horários e contatos** - Informações da loja  

### Recursos Inteligentes

- **Contexto de Conversa**: Lembra do cliente e histórico
- **Respostas com IA**: Quando não entende, usa IA para responder
- **Cálculo de Descontos**: Automático baseado em quantidade
- **Multi-idioma**: Responde em português, mas entende outros idiomas

## 📊 Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  WhatsApp   │────▶│ Evolution API│────▶│   Bot   │
└─────────────┘     └──────────────┘     └────┬────┘
                                              │
                    ┌─────────────────────────┴────────┐
                    │                                   │
              ┌─────▼─────┐                    ┌───────▼──────┐
              │   Redis   │                    │      IA      │
              │  (Cache)  │                    │(Gemini/Claude)│
              └───────────┘                    └──────────────┘
```

## 🔌 Endpoints

- `GET /` - Status do bot
- `GET /health` - Health check
- `POST /webhook` - Recebe mensagens da Evolution
- `GET /status` - Status detalhado
- `GET /debug` - Informações de debug

## 🐛 Troubleshooting

### Bot não responde

```bash
# Verificar logs
docker-compose logs bot

# Testar webhook
curl http://localhost:3000/health

# Reiniciar
docker-compose restart bot
```

### Redis não conecta

```bash
# Verificar se Redis está rodando
docker-compose ps redis

# Ver logs do Redis
docker-compose logs redis
```

### IA não funciona

- Verifique se configurou pelo menos uma API key (Gemini/Claude/OpenAI)
- O bot funciona sem IA, mas com respostas fixas

## 📈 Monitoramento

```bash
# Ver todas as mensagens processadas
docker-compose logs -f bot | grep "Webhook recebido"

# Status dos containers
docker-compose ps

# Uso de recursos
docker stats
```

## 🔄 Atualizações

```bash
# Baixar atualizações
git pull

# Reconstruir imagem
docker-compose build

# Reiniciar com nova versão
docker-compose up -d
```

## 🤝 Contribuindo

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/melhoria`)
3. Commit suas mudanças (`git commit -am 'Add: nova feature'`)
4. Push para a branch (`git push origin feature/melhoria`)
5. Abra um Pull Request

## 📞 Suporte

- **WhatsApp**: (11) 94567-8900
- **Email**: suporte@camaleaocamisas.com.br
- **Issues**: [GitHub Issues](https://github.com/Wellingtoncamaleao/atende-camaleao/issues)

## 📜 Licença

MIT - Use como quiser!

---

**Desenvolvido com ❤️ para Camaleão Camisas**