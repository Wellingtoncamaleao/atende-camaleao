const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Carregar configurações
dotenv.config();

// Importar módulos
const { connectEvolution, sendMessage } = require('./evolution');
const { generateResponse } = require('./responses');
const logger = require('./logger');

// Criar app
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.BOT_PORT || 3000;

// Rota principal
app.get('/', (req, res) => {
  res.json({
    bot: 'Vivi',
    empresa: 'Camaleão Camisas',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      webhook: '/webhook',
      status: '/status',
      health: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Status
app.get('/status', async (req, res) => {
  try {
    const evolutionStatus = await connectEvolution.getStatus();
    res.json({
      bot: 'online',
      evolution: evolutionStatus,
      messages_processed: global.messageCount || 0
    });
  } catch (error) {
    res.json({
      bot: 'online',
      evolution: 'error',
      error: error.message
    });
  }
});

// Webhook principal
app.post('/webhook', async (req, res) => {
  try {
    logger.info('Webhook recebido:', req.body);
    
    // Processar diferentes formatos
    let message = '';
    let from = '';
    
    // Evolution API
    if (req.body.event === 'messages.upsert') {
      const msg = req.body.data?.message?.[0];
      if (!msg || msg.key.fromMe) {
        return res.json({ status: 'ignored' });
      }
      message = msg.message?.conversation || 
                msg.message?.extendedTextMessage?.text || '';
      from = msg.key.remoteJid;
    }
    // Formato simples
    else if (req.body.message) {
      message = req.body.message;
      from = req.body.from || req.body.sender;
    }
    
    if (!message) {
      return res.json({ status: 'no_message' });
    }
    
    logger.info(`Mensagem de ${from}: ${message}`);
    global.messageCount = (global.messageCount || 0) + 1;
    
    // Gerar resposta
    const response = await generateResponse(message, from);
    
    // Enviar resposta se Evolution estiver ativa
    if (process.env.EVOLUTION_ENABLED === 'true' && from) {
      await sendMessage(from, response);
    }
    
    res.json({
      status: 'processed',
      message,
      response
    });
    
  } catch (error) {
    logger.error('Erro no webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, async () => {
  logger.info(`
========================================
✅ Vivi Bot - Camaleão Camisas
========================================
📍 Porta: ${PORT}
🤖 Bot: ${process.env.BOT_NAME}
📱 Evolution: ${process.env.EVOLUTION_ENABLED === 'true' ? 'Ativada' : 'Desativada'}
========================================
  `);
  
  // Conectar Evolution se habilitada
  if (process.env.EVOLUTION_ENABLED === 'true') {
    setTimeout(() => {
      connectEvolution.initialize().catch(err => {
        logger.error('Falha na inicializacao Evolution (nao-fatal):', err.message);
      });
    }, 3000);
  }
});