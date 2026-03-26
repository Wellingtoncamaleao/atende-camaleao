const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Carregar base de conhecimento
const conhecimento = {
  produtos: '',
  faq: '',
  precos: ''
};

// Tentar carregar arquivos de conhecimento
try {
  const dataPath = path.join(__dirname, '..', 'data');
  if (fs.existsSync(path.join(dataPath, 'produtos.json'))) {
    conhecimento.produtos = JSON.parse(fs.readFileSync(path.join(dataPath, 'produtos.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(dataPath, 'faq.json'))) {
    conhecimento.faq = JSON.parse(fs.readFileSync(path.join(dataPath, 'faq.json'), 'utf8'));
  }
} catch (error) {
  logger.warn('Erro ao carregar conhecimento:', error.message);
}

// Respostas padrão
const respostas = {
  saudacao: `Oi! 👋 Sou a Vivi da Camaleão Camisas!

Como posso ajudar você hoje?

1️⃣ Ver tabela de preços
2️⃣ Fazer orçamento
3️⃣ Conhecer produtos
4️⃣ Prazos de entrega
5️⃣ Falar com vendedor

Digite o número ou me conte o que precisa! 😊`,

  precos: `📋 TABELA DE PREÇOS 2024

👕 Camisetas Básicas (100% Algodão):
• 1-10 unidades: R$ 25,00
• 11-50 unidades: R$ 22,00
• 51-100 unidades: R$ 19,00
• Acima de 100: R$ 17,00

👔 Camisetas Premium:
• A partir de R$ 35,00

🏃 Dry-Fit Esportiva:
• A partir de R$ 32,00

🎨 Personalização:
• Silk 1 cor: R$ 3,00/peça
• Silk 2 cores: R$ 5,00/peça
• Bordado até 5cm: R$ 8,00/peça
• Sublimação total: R$ 15,00/peça

💰 Desconto especial PIX: 5% OFF

Quer um orçamento personalizado? Digite 2 📲`,

  orcamento: `📝 VAMOS FAZER SEU ORÇAMENTO!

Para preparar o melhor preço, preciso saber:

1️⃣ Quantas peças?
2️⃣ Qual tipo? (básica/premium/dry-fit)
3️⃣ Cores desejadas?
4️⃣ Vai ter personalização?
5️⃣ Qual seu prazo?

Me passa essas informações que preparo na hora! ⚡`,

  produtos: `🛍️ NOSSOS PRODUTOS

👕 Camisetas:
• Básica - 100% Algodão
• Premium - Algodão Penteado
• Dry-Fit - Esportiva
• Polo - Piquet
• Regata
• Manga Longa

👔 Uniformes:
• Empresarial
• Escolar
• Operacional
• Jaleco

🎨 Personalização:
• Silk Screen
• Bordado
• Sublimação
• DTF

🎁 Brindes:
• Bonés
• Ecobags
• Aventais

Qual tipo te interessa? 🤔`,

  prazos: `⏰ PRAZOS DE ENTREGA

🏭 Produção:
• Até 20 peças: 3 dias úteis
• 21-50 peças: 5 dias úteis
• 51-100 peças: 7 dias úteis
• Acima de 100: consultar

🚚 Entrega:
• SP Capital: 1-2 dias úteis
• Grande SP: 2-3 dias úteis
• Interior SP: 3-4 dias úteis
• Outros estados: 5-7 dias úteis

⚡ Produção EXPRESSA: 24h (+30%)

📍 Retirada: Rua da Mooca, 2456

Precisa com urgência? Me avisa! 🏃‍♂️`,

  vendedor: `👤 FALAR COM VENDEDOR

Vou chamar alguém da equipe para te atender!

📱 WhatsApp direto: (11) 94567-8900
☎️ Telefone: (11) 2456-7890
📍 Loja: Rua da Mooca, 2456

⏰ Atendimento:
Seg-Sex: 8h às 18h
Sáb: 8h às 13h

Aguarde que já já alguém responde! 🏃‍♂️`,

  localizacao: `📍 NOSSA LOCALIZAÇÃO

Camaleão Camisas
Rua da Mooca, 2456
Mooca - São Paulo/SP
CEP: 03104-002

🗺️ Referências:
• Próximo Metrô Bresser-Mooca
• Em frente Supermercado Extra

🚗 Estacionamento convênio ao lado

⏰ Funcionamento:
Seg-Sex: 8h às 18h
Sábado: 8h às 13h

📍 Google Maps: https://maps.google.com/maps?q=Rua+da+Mooca+2456`,

  padrao: `🤔 Não entendi muito bem...

Você pode escolher:
1️⃣ Ver tabela de preços
2️⃣ Fazer orçamento
3️⃣ Conhecer produtos
4️⃣ Prazos de entrega
5️⃣ Falar com vendedor

Ou me conta com suas palavras! 😊

_Vivi - Camaleão Camisas_`
};

// Função principal
async function generateResponse(message, from) {
  const msg = message.toLowerCase().trim();
  
  // Log para debug
  logger.info(`Processando: "${msg}"`);
  
  // Saudações
  if (msg.match(/^(oi|ola|olá|bom dia|boa tarde|boa noite|opa|ei|e ai|eai)/)) {
    return respostas.saudacao;
  }
  
  // Comandos numerados
  if (msg === '1') return respostas.precos;
  if (msg === '2') return respostas.orcamento;
  if (msg === '3') return respostas.produtos;
  if (msg === '4') return respostas.prazos;
  if (msg === '5') return respostas.vendedor;
  
  // Palavras-chave
  if (msg.includes('preço') || msg.includes('preco') || msg.includes('valor') || msg.includes('quanto custa')) {
    return respostas.precos;
  }
  
  if (msg.includes('orçamento') || msg.includes('orcamento') || msg.includes('cotação') || msg.includes('cotacao')) {
    return respostas.orcamento;
  }
  
  if (msg.includes('produto') || msg.includes('catálogo') || msg.includes('catalogo') || msg.includes('opções') || msg.includes('opcoes')) {
    return respostas.produtos;
  }
  
  if (msg.includes('prazo') || msg.includes('entrega') || msg.includes('demora') || msg.includes('tempo')) {
    return respostas.prazos;
  }
  
  if (msg.includes('vendedor') || msg.includes('humano') || msg.includes('atendente') || msg.includes('pessoa') || msg.includes('falar com')) {
    return respostas.vendedor;
  }
  
  if (msg.includes('onde fica') || msg.includes('endereço') || msg.includes('endereco') || msg.includes('localização') || msg.includes('localizacao')) {
    return respostas.localizacao;
  }
  
  // Resposta padrão
  return respostas.padrao;
}

module.exports = { generateResponse };