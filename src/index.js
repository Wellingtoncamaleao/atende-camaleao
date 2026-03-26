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
const EVOLUTION_ENABLED = EVOLUTION_ENABLED || !!process.env.EVOLUTION_URL;

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

// Debug - diagnostico da conexao Evolution
app.get('/debug', async (req, res) => {
  const result = {
    env: {
      EVOLUTION_URL: process.env.EVOLUTION_URL || '(nao definida)',
      EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || '(nao definida)',
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? '***' + process.env.EVOLUTION_API_KEY.slice(-6) : '(nao definida)',
      EVOLUTION_ENABLED: process.env.EVOLUTION_ENABLED || '(nao definida)',
      WEBHOOK_URL: process.env.WEBHOOK_URL || '(nao definida)',
      BOT_NAME: process.env.BOT_NAME || '(nao definida)',
    },
    evolution_status: 'checking...'
  };
  try {
    result.evolution_status = await connectEvolution.getStatus();
  } catch (error) {
    result.evolution_status = 'erro: ' + error.message;
  }
  res.json(result);
});

// Setup Evolution sob demanda
app.post('/setup', async (req, res) => {
  try {
    logger.info('Iniciando setup Evolution...');
    await connectEvolution.initialize();
    res.json({ status: 'ok', message: 'Evolution inicializada' });
  } catch (error) {
    logger.error('Erro no setup:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Webhook principal
app.post('/webhook', async (req, res) => {
  try {
    logger.info('Webhook recebido:', req.body);
    
    // Processar diferentes formatos
    let message = '';
    let from = '';

    // Evolution API v2 - data eh o objeto da mensagem diretamente
    if (req.body.event === 'messages.upsert') {
      const msg = req.body.data;
      if (!msg || msg.key?.fromMe) {
        return res.json({ status: 'ignored' });
      }
      message = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text || '';
      from = msg.key?.remoteJid;
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
    if (EVOLUTION_ENABLED && from) {
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
📱 Evolution: ${EVOLUTION_ENABLED ? 'Ativada' : 'Desativada'}
========================================
  `);
  
  // Inicializar Evolution automaticamente (sem bloquear startup)
  if (EVOLUTION_ENABLED) {
    setTimeout(async () => {
      try {
        logger.info('Auto-inicializando Evolution API...');
        await connectEvolution.initialize();
        logger.info('Evolution API pronta!');
      } catch (error) {
        logger.error('Falha ao auto-inicializar Evolution:', error.message);
        logger.info('Tente manualmente via POST /setup');
      }
    }, 3000);
  }
});