const axios = require('axios');
const logger = require('./logger');

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://localhost:8084';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'vivi-camaleao';

class EvolutionAPI {
  constructor() {
    this.api = axios.create({
      baseURL: EVOLUTION_URL,
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      }
    });
  }

  async initialize() {
    try {
      logger.info('Inicializando Evolution API...');
      logger.info(`URL: ${EVOLUTION_URL}, Instancia: ${INSTANCE_NAME}`);

      // Criar instância
      await this.createInstance();

      // Configurar webhook
      await this.setWebhook();

      // Obter QR Code
      const qr = await this.getQRCode();
      if (qr) {
        logger.info('QR Code disponível! Acesse o painel para escanear.');
      }

      logger.info('Evolution API inicializada com sucesso!');
    } catch (error) {
      logger.error(`Erro ao inicializar Evolution (nao-fatal): status=${error.response?.status} body=${JSON.stringify(error.response?.data)} msg=${error.message}`);
      // NAO re-lanca o erro - bot continua rodando sem Evolution
    }
  }

  async createInstance() {
    try {
      const response = await this.api.post('/instance/create', {
        instanceName: INSTANCE_NAME,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      logger.info('Instância criada:', INSTANCE_NAME);
      return response.data;
    } catch (error) {
      if (error.response?.status === 409 || error.response?.status === 403) {
        logger.info('Instancia ja existe:', INSTANCE_NAME);
      } else {
        logger.error(`Erro createInstance: status=${error.response?.status} body=${JSON.stringify(error.response?.data)} msg=${error.message}`);
        throw error;
      }
    }
  }

  async setWebhook() {
    const webhookUrl = process.env.WEBHOOK_URL || `http://localhost:${process.env.BOT_PORT}/webhook`;
    logger.info(`Configurando webhook para: ${webhookUrl}`);
    try {
      // Evolution v2 endpoint
      await this.api.post(`/webhook/set/${INSTANCE_NAME}`, {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
        }
      });
      logger.info('Webhook configurado com sucesso');
    } catch (error) {
      logger.warn(`Erro webhook v2 (${error.response?.status}): ${JSON.stringify(error.response?.data || error.message)}`);
      // Tentar formato alternativo (Evolution v1)
      try {
        await this.api.put(`/webhook/set/${INSTANCE_NAME}`, {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
        });
        logger.info('Webhook configurado (formato v1)');
      } catch (err2) {
        logger.warn(`Erro webhook v1 tambem (${err2.response?.status}): ${JSON.stringify(err2.response?.data || err2.message)}`);
      }
    }
  }

  async getQRCode() {
    try {
      const response = await this.api.get(`/instance/connect/${INSTANCE_NAME}`);
      return response.data.qrcode?.code;
    } catch (error) {
      return null;
    }
  }

  async getStatus() {
    try {
      const response = await this.api.get(`/instance/connectionState/${INSTANCE_NAME}`);
      return response.data.state;
    } catch (error) {
      return 'disconnected';
    }
  }

  async sendMessage(to, text) {
    try {
      // remoteJid ja vem como 5511...@s.whatsapp.net
      const number = to.replace('@s.whatsapp.net', '').replace('@g.us', '');
      const response = await this.api.post(`/message/sendText/${INSTANCE_NAME}`, {
        number: number,
        text: text
      });
      logger.info(`Mensagem enviada para ${number}`);
      return response.data;
    } catch (error) {
      logger.error(`Erro ao enviar mensagem para ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

const evolutionAPI = new EvolutionAPI();

module.exports = {
  connectEvolution: evolutionAPI,
  sendMessage: (to, text) => evolutionAPI.sendMessage(to, text)
};