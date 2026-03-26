const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const logger = require('./logger');

// Carregar base de conhecimento
let conhecimentoTexto = '';
try {
  const dataPath = path.join(__dirname, '..', 'data');
  if (fs.existsSync(path.join(dataPath, 'produtos.json'))) {
    const produtos = JSON.parse(fs.readFileSync(path.join(dataPath, 'produtos.json'), 'utf8'));
    conhecimentoTexto = JSON.stringify(produtos, null, 2);
  }
} catch (error) {
  logger.warn('Erro ao carregar conhecimento:', error.message);
}

// Cliente Claude (inicializa sob demanda)
let anthropic = null;
function getAnthropic() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

// Historico por contato (em memoria, limita ultimas 20 msgs)
const historicos = {};
const MAX_HISTORICO = 20;

function getHistorico(from) {
  if (!historicos[from]) {
    historicos[from] = [];
  }
  return historicos[from];
}

function addHistorico(from, role, content) {
  const hist = getHistorico(from);
  hist.push({ role, content });
  if (hist.length > MAX_HISTORICO) {
    historicos[from] = hist.slice(-MAX_HISTORICO);
  }
}

// System prompt da Vivi
const SYSTEM_PROMPT = `Voce e a Vivi, atendente virtual da Camaleao Camisas pelo WhatsApp.

## Sua personalidade
- Simpatica, prestativa e objetiva
- Usa emojis com moderacao (1-2 por mensagem, no maximo)
- Responde em portugues brasileiro informal mas profissional
- Mensagens curtas e diretas (WhatsApp nao e email)
- NUNCA inventa informacoes que nao estao abaixo

## Sobre a Camaleao Camisas
- Fabrica de camisetas e uniformes personalizados
- Localizacao: Rua da Mooca, 2456 - Mooca, Sao Paulo/SP
- Horario: Seg-Sex 8h as 18h, Sabado 8h as 13h
- Desconto PIX: 5% OFF
- Producao expressa: 24h (+30% no valor)

## Prazos de producao
- Ate 20 pecas: 3 dias uteis
- 21-50 pecas: 5 dias uteis
- 51-100 pecas: 7 dias uteis
- Acima de 100: consultar

## Prazos de entrega
- SP Capital: 1-2 dias uteis
- Grande SP: 2-3 dias uteis
- Interior SP: 3-4 dias uteis
- Outros estados: 5-7 dias uteis

## Catalogo e precos
${conhecimentoTexto}

## Regras importantes
1. Se o cliente pedir orcamento, colete: quantidade, tipo de camiseta, cores, personalizacao desejada e prazo
2. Se o cliente quiser falar com humano, diga que vai transferir e que a equipe responde em breve
3. Se nao souber a resposta, diga que vai verificar com a equipe e retorna
4. NUNCA invente precos ou produtos que nao estao no catalogo
5. Para pedidos acima de 100 pecas, diga que precisa consultar com a equipe para melhor preco
6. Sempre que possivel, conduza a conversa para fechar um orcamento`;

// ========== CLAUDE (primario) ==========
async function callClaude(historico) {
  const client = getAnthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY nao definida');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: historico
  });

  return response.content[0].text;
}

// ========== GEMINI (fallback) ==========
async function callGemini(historico) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY nao definida');

  // Converter historico para formato Gemini
  const contents = historico.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  );

  return response.data.candidates[0].content.parts[0].text;
}

// ========== FUNCAO PRINCIPAL ==========
async function generateResponse(message, from) {
  logger.info(`Processando: "${message}" de ${from}`);

  // Adicionar mensagem do usuario ao historico
  addHistorico(from, 'user', message);
  const historico = getHistorico(from);

  let resposta = null;
  let provider = null;

  // Tentar Claude primeiro
  try {
    resposta = await callClaude(historico);
    provider = 'claude';
  } catch (error) {
    logger.warn(`Claude falhou: ${error.message} — tentando Gemini...`);
  }

  // Fallback: Gemini
  if (!resposta) {
    try {
      resposta = await callGemini(historico);
      provider = 'gemini';
    } catch (error) {
      logger.warn(`Gemini falhou: ${error.message}`);
    }
  }

  // Fallback final: resposta estatica
  if (!resposta) {
    logger.error('Ambas as APIs falharam, usando fallback estatico');
    resposta = fallbackResponse(message);
    provider = 'fallback';
  }

  logger.info(`Resposta via ${provider} para ${from}`);
  addHistorico(from, 'assistant', resposta);

  return resposta;
}

// Fallback estatico
function fallbackResponse(message) {
  const msg = message.toLowerCase().trim();
  if (msg.match(/^(oi|ola|olá|bom dia|boa tarde|boa noite|opa|ei|e ai|eai)/)) {
    return 'Oi! Sou a Vivi da Camaleao Camisas! 👋\n\nComo posso ajudar?\n\n1 - Precos\n2 - Orcamento\n3 - Produtos\n4 - Prazos\n5 - Falar com vendedor';
  }
  return 'Desculpa, estou com uma instabilidade no momento. Pode tentar novamente em alguns minutos? 🙏';
}

module.exports = { generateResponse };
