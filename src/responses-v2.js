// responses-v2.js - Versão melhorada com IA e consultas reais
const axios = require('axios');
const Redis = require('ioredis');

// Conectar Redis se disponível
let redis = null;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
} catch (error) {
  console.log('Redis não disponível, usando memória local');
}

// Cache de sessões em memória (fallback)
const sessions = new Map();

// Gerenciar sessão do cliente
async function getSession(phone) {
  if (redis) {
    const session = await redis.get(`session:${phone}`);
    return session ? JSON.parse(session) : null;
  }
  return sessions.get(phone);
}

async function saveSession(phone, data) {
  const session = {
    phone,
    ...data,
    lastActivity: Date.now()
  };
  
  if (redis) {
    await redis.setex(`session:${phone}`, 1800, JSON.stringify(session)); // 30 min
  } else {
    sessions.set(phone, session);
  }
  
  return session;
}

// Consultar API da Camaleão (quando disponível)
async function consultarPedido(numeroPedido) {
  try {
    if (!process.env.CAMALEAO_API_KEY) {
      return null;
    }
    
    const response = await axios.get(
      `https://painel.camaleaocamisas.com.br/api/v1/pedidos.php`,
      {
        params: { id: numeroPedido },
        headers: {
          'X-API-Key': process.env.CAMALEAO_API_KEY
        },
        timeout: 5000
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erro ao consultar pedido:', error.message);
    return null;
  }
}

// Usar IA quando disponível (Gemini → Claude → OpenAI)
async function getAIResponse(message, context = {}) {
  const prompt = `Você é Vivi, atendente virtual da Camaleão Camisas. 
Contexto do cliente: ${JSON.stringify(context)}
Mensagem do cliente: ${message}
Responda de forma profissional mas amigável, em português brasileiro.`;

  // Tentar Gemini primeiro
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Erro Gemini:', error.message);
    }
  }
  
  // Fallback para Claude
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return response.data.content[0].text;
    } catch (error) {
      console.error('Erro Claude:', error.message);
    }
  }
  
  // Fallback para OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Erro OpenAI:', error.message);
    }
  }
  
  return null; // Nenhuma IA disponível
}

// Função principal melhorada
async function generateResponse(message, from) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Recuperar ou criar sessão
  let session = await getSession(from) || {};
  
  // Atualizar contador de mensagens
  session.messageCount = (session.messageCount || 0) + 1;
  
  // Saudações
  if (lowerMessage.match(/^(oi|ola|olá|bom dia|boa tarde|boa noite|hello|hey)/)) {
    session.state = 'menu';
    await saveSession(from, session);
    
    const greeting = session.messageCount > 1 
      ? `Olá novamente! 😊`
      : `Olá! Eu sou a Vivi, atendente virtual da Camaleão Camisas 🎨`;
      
    return `${greeting}

Como posso ajudar você hoje?

*Digite o número da opção:*
1️⃣ Ver tabela de preços
2️⃣ Fazer orçamento
3️⃣ Consultar pedido
4️⃣ Ver produtos
5️⃣ Falar com vendedor
6️⃣ Horários e contatos`;
  }
  
  // Menu numérico
  if (lowerMessage === '1' || lowerMessage.includes('preço') || lowerMessage.includes('tabela')) {
    return `📋 *TABELA DE PREÇOS 2024*

👕 *CAMISETAS*
• Malha 30.1: R$ 25,00
• PV Premium: R$ 35,00
• Dry Fit: R$ 45,00

✨ *PERSONALIZAÇÃO*
• Silk 1 cor: R$ 5,00
• Silk 2+ cores: R$ 3,00/cor
• Sublimação: R$ 15,00
• Bordado: R$ 12,00
• DTF: R$ 18,00

📦 *PEDIDO MÍNIMO:* 10 peças
💰 *DESCONTO:* 50+ peças = 10% | 100+ peças = 15%

Digite 2 para fazer um orçamento!`;
  }
  
  if (lowerMessage === '2' || lowerMessage.includes('orçamento') || lowerMessage.includes('cotação')) {
    session.state = 'orcamento_quantidade';
    await saveSession(from, session);
    return `📝 Vamos fazer seu orçamento!

Quantas camisetas você precisa?`;
  }
  
  // Consulta de pedido com API real
  if (lowerMessage === '3' || lowerMessage.includes('pedido') || lowerMessage.includes('status')) {
    session.state = 'consulta_pedido';
    await saveSession(from, session);
    return `🔍 Por favor, informe o número do seu pedido:`;
  }
  
  // Processar número de pedido
  if (session.state === 'consulta_pedido' && lowerMessage.match(/^\d+$/)) {
    const numeroPedido = lowerMessage;
    
    // Tentar consultar API real
    const pedido = await consultarPedido(numeroPedido);
    
    if (pedido && !pedido.error) {
      return `📦 *Pedido #${numeroPedido}*
      
Cliente: ${pedido.cliente || 'N/A'}
Status: ${pedido.status || 'Em processamento'}
Valor: R$ ${pedido.valor || '0,00'}
Prazo: ${pedido.prazo || 'A calcular'}

${pedido.observacoes || ''}

Precisa de mais alguma informação?`;
    } else {
      // Fallback se API não disponível
      return `📦 Consultando pedido #${numeroPedido}...

⚠️ Sistema em manutenção. Por favor, entre em contato:
📱 WhatsApp: (11) 94567-8900
☎️ Telefone: (11) 3456-7890

Digite 5 para falar com um vendedor.`;
    }
  }
  
  if (lowerMessage === '4' || lowerMessage.includes('produto') || lowerMessage.includes('catálogo')) {
    return `🎨 *NOSSOS PRODUTOS*

👕 *Camisetas*
• Básicas e promocionais
• Uniformes profissionais
• Eventos e campanhas

🎯 *Comunicação Visual*
• Banners e faixas
• Placas e adesivos
• Lonas e backdrops

🎁 *Brindes*
• Canecas e copos
• Bonés e bolsas
• Produtos personalizados

📸 Veja nosso portfólio:
www.camaleaocamisas.com.br/produtos

Quer fazer um orçamento? Digite 2`;
  }
  
  if (lowerMessage === '5' || lowerMessage.includes('vendedor') || lowerMessage.includes('humano') || lowerMessage.includes('atendente')) {
    return `👤 Vou transferir você para nossa equipe!

📱 *WhatsApp Vendas:* (11) 94567-8900
☎️ *Telefone:* (11) 3456-7890
📧 *Email:* vendas@camaleaocamisas.com.br

*Horário de atendimento:*
Seg-Sex: 8h às 18h
Sábado: 8h às 12h

Aguarde que em breve alguém vai te atender! 😊`;
  }
  
  if (lowerMessage === '6' || lowerMessage.includes('horário') || lowerMessage.includes('contato') || lowerMessage.includes('endereço')) {
    return `📍 *CAMALEÃO CAMISAS*

🏢 *Endereço:*
Rua das Camisetas, 123
Centro - São Paulo/SP
CEP: 01234-567

⏰ *Horários:*
Segunda a Sexta: 8h às 18h
Sábado: 8h às 12h
Domingo: Fechado

📞 *Contatos:*
WhatsApp: (11) 94567-8900
Telefone: (11) 3456-7890
Email: contato@camaleaocamisas.com.br

🌐 Site: www.camaleaocamisas.com.br
📸 Instagram: @camaleaocamisas`;
  }
  
  // Processar estado de orçamento
  if (session.state === 'orcamento_quantidade' && lowerMessage.match(/^\d+$/)) {
    const quantidade = parseInt(lowerMessage);
    session.orcamento = { quantidade };
    session.state = 'orcamento_tipo';
    await saveSession(from, session);
    
    return `Ótimo! ${quantidade} camisetas.

Qual tipo de camiseta?
1️⃣ Malha 30.1 (R$ 25)
2️⃣ PV Premium (R$ 35)
3️⃣ Dry Fit (R$ 45)`;
  }
  
  if (session.state === 'orcamento_tipo' && lowerMessage.match(/^[123]$/)) {
    const tipos = {
      '1': { nome: 'Malha 30.1', preco: 25 },
      '2': { nome: 'PV Premium', preco: 35 },
      '3': { nome: 'Dry Fit', preco: 45 }
    };
    
    const tipo = tipos[lowerMessage];
    const { quantidade } = session.orcamento;
    let total = quantidade * tipo.preco;
    
    // Aplicar desconto
    let desconto = 0;
    if (quantidade >= 100) {
      desconto = 15;
      total *= 0.85;
    } else if (quantidade >= 50) {
      desconto = 10;
      total *= 0.90;
    }
    
    session.state = 'menu';
    await saveSession(from, session);
    
    return `💰 *ORÇAMENTO CALCULADO*

📦 Quantidade: ${quantidade} unidades
👕 Tipo: ${tipo.nome}
💵 Valor unitário: R$ ${tipo.preco},00
${desconto > 0 ? `🎉 Desconto aplicado: ${desconto}%` : ''}

*TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*

✅ Orçamento válido por 7 dias
📍 Frete calculado na finalização

Deseja confirmar este orçamento?
Digite *SIM* para prosseguir ou *5* para falar com vendedor`;
  }
  
  // Tentar IA para mensagens não reconhecidas
  const hasAI = process.env.GOOGLE_AI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  
  if (hasAI) {
    const aiResponse = await getAIResponse(message, session);
    if (aiResponse) {
      await saveSession(from, session);
      return aiResponse;
    }
  }
  
  // Fallback padrão
  return `Desculpe, não entendi sua mensagem 🤔

*Digite o número da opção:*
1️⃣ Tabela de preços
2️⃣ Fazer orçamento
3️⃣ Consultar pedido
4️⃣ Ver produtos
5️⃣ Falar com vendedor
6️⃣ Horários e contatos

Ou digite *OI* para recomeçar`;
}

module.exports = { generateResponse };