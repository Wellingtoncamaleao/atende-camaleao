#!/usr/bin/env node

/**
 * Configurar Vivi com Evolution API do GestorConecta
 */

const axios = require('axios');
require('dotenv').config();

// Configurações
const EVOLUTION_URL = 'https://evolution.gestorconecta.com.br';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'SUA_API_KEY_AQUI';
const INSTANCE_NAME = 'vivi-camaleao';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://SEU_DOMINIO/webhook';

console.log(`
========================================
🔧 Configurando Vivi com Evolution API
========================================
Evolution: ${EVOLUTION_URL}
Instance: ${INSTANCE_NAME}
Webhook: ${WEBHOOK_URL}
========================================
`);

async function setup() {
  try {
    const api = axios.create({
      baseURL: EVOLUTION_URL,
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    // 1. Criar instância
    console.log('1️⃣ Criando instância...');
    try {
      await api.post('/instance/create', {
        instanceName: INSTANCE_NAME,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      console.log('✅ Instância criada!');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️ Instância já existe');
      } else {
        throw error;
      }
    }

    // 2. Configurar webhook
    console.log('\n2️⃣ Configurando webhook...');
    await api.put(`/webhook/set/${INSTANCE_NAME}`, {
      enabled: true,
      url: WEBHOOK_URL,
      webhookByEvents: true,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE'
      ]
    });
    console.log('✅ Webhook configurado!');

    // 3. Obter QR Code
    console.log('\n3️⃣ Obtendo QR Code...');
    const qrResponse = await api.get(`/instance/connect/${INSTANCE_NAME}`);
    
    if (qrResponse.data.qrcode?.code) {
      console.log('\n📱 QR CODE:');
      console.log('========================================');
      console.log(qrResponse.data.qrcode.code);
      console.log('========================================');
      console.log('\n⚠️ ESCANEIE COM WHATSAPP!');
    } else {
      // Verificar status
      const statusResponse = await api.get(`/instance/connectionState/${INSTANCE_NAME}`);
      if (statusResponse.data.state === 'open') {
        console.log('✅ WhatsApp já conectado!');
      } else {
        console.log('⚠️ Status:', statusResponse.data.state);
      }
    }

    console.log(`
========================================
✅ CONFIGURAÇÃO COMPLETA!
========================================

Próximos passos:
1. Escaneie o QR Code (se aparecer)
2. Configure o webhook no seu domínio
3. Teste enviando "oi" para o número

Webhook URL que a Evolution vai chamar:
${WEBHOOK_URL}

========================================
    `);

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    console.log(`
⚠️ CHECKLIST DE PROBLEMAS:

1. Verifique a API Key da Evolution
2. Confirme que ${EVOLUTION_URL} está acessível
3. Configure EVOLUTION_API_KEY no .env
4. Execute novamente: node setup-evolution.js
    `);
  }
}

// Executar
if (require.main === module) {
  setup();
}