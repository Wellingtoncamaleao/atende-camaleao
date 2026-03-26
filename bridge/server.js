const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Redis = require('ioredis');
const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Logger configurado
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Conexão Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// App Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: process.env.RATE_LIMIT_PER_MIN || 30,
  message: 'Muitas requisições, tente novamente em breve'
});

// Classe para gerenciar sessões
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TIMEOUT = (process.env.SESSION_TIMEOUT_MIN || 30) * 60 * 1000;
  }

  async getOrCreate(phone) {
    // Verificar cache Redis primeiro
    const cached = await redis.get(`session:${phone}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Criar nova sessão
    const session = {
      phone,
      startTime: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      context: {},
      clientName: null
    };

    await this.save(phone, session);
    return session;
  }

  async save(phone, session) {
    session.lastActivity = Date.now();
    await redis.setex(
      `session:${phone}`,
      this.SESSION_TIMEOUT / 1000,
      JSON.stringify(session)
    );
    this.sessions.set(phone, session);
  }

  async end(phone) {
    await redis.del(`session:${phone}`);
    this.sessions.delete(phone);
  }

  async getActive() {
    const keys = await redis.keys('session:*');
    const sessions = [];
    for (const key of keys) {
      const session = await redis.get(key);
      if (session) {
        sessions.push(JSON.parse(session));
      }
    }
    return sessions;
  }
}

const sessionManager = new SessionManager();

// Classe para comunicação com OpenClaw
class OpenClawBridge {
  constructor() {
    this.baseURL = process.env.OPENCLAW_URL || 'http://localhost:8080';
    this.apiKey = process.env.OPENCLAW_API_KEY;
  }

  async sendMessage(phone, message, session) {
    try {
      const response = await axios.post(
        `${this.baseURL}/message`,
        {
          phone,
          message,
          session,
          timestamp: Date.now()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erro ao comunicar com OpenClaw:', error.message);
      throw error;
    }
  }

  async getContext(phone) {
    try {
      const response = await axios.get(
        `${this.baseURL}/context/${phone}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Erro ao buscar contexto:', error.message);
      return null;
    }
  }

  async health() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }
}

const openClaw = new OpenClawBridge();

// Classe para Evolution API
class EvolutionBridge {
  constructor() {
    this.baseURL = process.env.EVOLUTION_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instance = process.env.EVOLUTION_INSTANCE || 'camaleao';
  }

  async sendMessage(phone, message, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/message/sendText/${this.instance}`,
        {
          number: phone,
          text: message,
          ...options
        },
        {
          headers: {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Erro ao enviar via Evolution:', error.message);
      throw error;
    }
  }

  async setupWebhook() {
    try {
      const webhookUrl = process.env.WEBHOOK_URL || `http://localhost:3000/webhook`;
      
      const response = await axios.put(
        `${this.baseURL}/webhook/set/${this.instance}`,
        {
          url: webhookUrl,
          webhook_by_events: true,
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'CONNECTION_UPDATE',
            'PRESENCE_UPDATE'
          ]
        },
        {
          headers: {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info('Webhook configurado:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Erro ao configurar webhook:', error.message);
      throw error;
    }
  }

  async getStatus() {
    try {
      const response = await axios.get(
        `${this.baseURL}/instance/fetchInstances`,
        {
          headers: {
            'apikey': this.apiKey
          }
        }
      );
      
      const instance = response.data.find(i => i.instance === this.instance);
      return instance ? instance.status : 'not_found';
    } catch (error) {
      logger.error('Erro ao verificar status:', error.message);
      return 'error';
    }
  }
}

const evolution = new EvolutionBridge();

// Rotas principais

// Status geral
app.get('/', (req, res) => {
  res.json({
    service: 'Atende Camaleão Bridge',
    status: 'online',
    version: '2.0.0',
    endpoints: {
      webhook: '/webhook',
      health: '/health',
      status: '/status',
      sessions: '/sessions',
      metrics: '/metrics',
      setup: '/setup'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  const health = {
    bridge: 'healthy',
    openclaw: await openClaw.health(),
    evolution: await evolution.getStatus(),
    redis: redis.status,
    uptime: process.uptime()
  };
  
  const isHealthy = health.openclaw.status !== 'offline' && 
                    health.redis === 'ready';
  
  res.status(isHealthy ? 200 : 503).json(health);
});

// Status detalhado
app.get('/status', async (req, res) => {
  const sessions = await sessionManager.getActive();
  
  res.json({
    bridge: 'online',
    openclaw: await openClaw.health(),
    evolution: await evolution.getStatus(),
    activeSessions: sessions.length,
    totalMessages: await redis.get('stats:total_messages') || 0,
    uptime: process.uptime()
  });
});

// Listar sessões ativas
app.get('/sessions', async (req, res) => {
  const sessions = await sessionManager.getActive();
  res.json({
    total: sessions.length,
    sessions: sessions.map(s => ({
      phone: s.phone,
      clientName: s.clientName,
      messageCount: s.messageCount,
      duration: Date.now() - s.startTime,
      lastActivity: new Date(s.lastActivity).toISOString()
    }))
  });
});

// Métricas
app.get('/metrics', async (req, res) => {
  const stats = {
    totalMessages: await redis.get('stats:total_messages') || 0,
    totalSessions: await redis.get('stats:total_sessions') || 0,
    avgResponseTime: await redis.get('stats:avg_response_time') || 0,
    successRate: await redis.get('stats:success_rate') || 100,
    topQueries: await redis.zrevrange('stats:top_queries', 0, 9, 'WITHSCORES')
  };
  
  res.json(stats);
});

// Configurar webhook Evolution
app.post('/setup', async (req, res) => {
  try {
    const result = await evolution.setupWebhook();
    res.json({ status: 'success', result });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Webhook principal - recebe mensagens da Evolution
app.post('/webhook', limiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validar webhook secret se configurado
    if (process.env.WEBHOOK_SECRET) {
      const signature = req.headers['x-webhook-signature'];
      const expected = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expected) {
        logger.warn('Webhook signature inválida');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    // Log do webhook recebido
    logger.info('Webhook recebido:', {
      event: req.body.event,
      instance: req.body.instance
    });
    
    // Processar apenas mensagens recebidas
    if (req.body.event !== 'messages.upsert') {
      return res.json({ status: 'ignored', reason: 'not a message' });
    }
    
    const { messages } = req.body.data;
    if (!messages || !messages.length) {
      return res.json({ status: 'ignored', reason: 'no messages' });
    }
    
    const message = messages[0];
    
    // Ignorar mensagens enviadas por nós
    if (message.key.fromMe) {
      return res.json({ status: 'ignored', reason: 'from me' });
    }
    
    // Extrair dados da mensagem
    const phone = message.key.remoteJid.replace('@s.whatsapp.net', '');
    const text = message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || '';
    const name = message.pushName || 'Cliente';
    
    if (!text) {
      return res.json({ status: 'ignored', reason: 'no text content' });
    }
    
    // Obter ou criar sessão
    const session = await sessionManager.getOrCreate(phone);
    session.messageCount++;
    session.clientName = session.clientName || name;
    
    // Log da mensagem
    logger.info('Processando mensagem:', {
      phone,
      name,
      message: text.substring(0, 100)
    });
    
    // Enviar para OpenClaw processar
    const response = await openClaw.sendMessage(phone, text, session);
    
    // Enviar resposta via Evolution
    if (response.reply) {
      await evolution.sendMessage(phone, response.reply, {
        quoted: message
      });
    }
    
    // Atualizar sessão
    if (response.context) {
      session.context = { ...session.context, ...response.context };
    }
    await sessionManager.save(phone, session);
    
    // Atualizar estatísticas
    await redis.incr('stats:total_messages');
    await redis.zadd('stats:top_queries', Date.now(), text.substring(0, 50));
    
    // Calcular tempo de resposta
    const responseTime = Date.now() - startTime;
    await redis.lpush('stats:response_times', responseTime);
    await redis.ltrim('stats:response_times', 0, 999);
    
    res.json({ 
      status: 'success',
      processed: true,
      responseTime
    });
    
  } catch (error) {
    logger.error('Erro no webhook:', error);
    
    // Resposta de fallback
    try {
      const phone = req.body.data?.messages?.[0]?.key?.remoteJid?.replace('@s.whatsapp.net', '');
      if (phone) {
        await evolution.sendMessage(
          phone,
          '🔄 Desculpe, estou processando sua mensagem. Por favor, aguarde um momento.'
        );
      }
    } catch (fallbackError) {
      logger.error('Erro no fallback:', fallbackError.message);
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Webhook de teste
app.post('/webhook/test', (req, res) => {
  logger.info('Webhook de teste recebido');
  res.json({ status: 'ok', message: 'Webhook funcionando' });
});

// Dashboard simples
app.get('/dashboard', async (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Atende Camaleão - Dashboard</title>
      <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: inline-block; margin: 10px 20px; }
        .metric .value { font-size: 2em; font-weight: bold; color: #2196F3; }
        .metric .label { color: #666; margin-top: 5px; }
        .status { padding: 5px 10px; border-radius: 4px; display: inline-block; }
        .status.online { background: #4CAF50; color: white; }
        .status.offline { background: #f44336; color: white; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; }
      </style>
      <meta http-equiv="refresh" content="30">
    </head>
    <body>
      <h1>🎨 Atende Camaleão - Dashboard</h1>
      
      <div class="card">
        <h2>Status dos Serviços</h2>
        <div>
          Bridge: <span class="status online">Online</span>
          OpenClaw: <span class="status ${(await openClaw.health()).status === 'healthy' ? 'online' : 'offline'}">${(await openClaw.health()).status}</span>
          Evolution: <span class="status ${await evolution.getStatus() === 'open' ? 'online' : 'offline'}">${await evolution.getStatus()}</span>
          Redis: <span class="status ${redis.status === 'ready' ? 'online' : 'offline'}">${redis.status}</span>
        </div>
      </div>
      
      <div class="card">
        <h2>Métricas</h2>
        <div class="metric">
          <div class="value">${await redis.get('stats:total_messages') || 0}</div>
          <div class="label">Mensagens Processadas</div>
        </div>
        <div class="metric">
          <div class="value">${(await sessionManager.getActive()).length}</div>
          <div class="label">Sessões Ativas</div>
        </div>
        <div class="metric">
          <div class="value">${Math.floor(process.uptime() / 3600)}h</div>
          <div class="label">Uptime</div>
        </div>
      </div>
      
      <div class="card">
        <h2>Sessões Ativas</h2>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Mensagens</th>
              <th>Duração</th>
              <th>Última Atividade</th>
            </tr>
          </thead>
          <tbody>
            ${(await sessionManager.getActive()).map(s => `
              <tr>
                <td>${s.clientName || 'Desconhecido'}</td>
                <td>${s.phone}</td>
                <td>${s.messageCount}</td>
                <td>${Math.floor((Date.now() - s.startTime) / 60000)} min</td>
                <td>${new Date(s.lastActivity).toLocaleTimeString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

// Inicializar servidor
const PORT = process.env.BRIDGE_PORT || 3000;

app.listen(PORT, async () => {
  logger.info(`Bridge Server rodando na porta ${PORT}`);
  
  // Verificar conexões
  logger.info('Verificando conexões...');
  logger.info('Redis:', redis.status);
  logger.info('OpenClaw:', await openClaw.health());
  logger.info('Evolution:', await evolution.getStatus());
  
  // Configurar webhook automaticamente se configurado
  if (process.env.AUTO_SETUP_WEBHOOK === 'true') {
    logger.info('Configurando webhook automaticamente...');
    try {
      await evolution.setupWebhook();
      logger.info('Webhook configurado com sucesso');
    } catch (error) {
      logger.error('Erro ao configurar webhook:', error.message);
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido, encerrando...');
  await redis.quit();
  process.exit(0);
});

module.exports = app;