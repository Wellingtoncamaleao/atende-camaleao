/**
 * Skill: Consulta de Pedido
 * Consulta status de pedido em tempo real via API Camaleão
 */

const axios = require('axios');

module.exports = {
  name: 'consulta-pedido',
  description: 'Consulta status detalhado de pedido',
  patterns: [
    /pedido\s*#?(\d+)/i,
    /status.*pedido/i,
    /onde.*está.*pedido/i,
    /prazo.*entrega/i,
    /acompanhar.*pedido/i
  ],
  
  async execute(context) {
    const { message, session, apis } = context;
    
    // Extrair número do pedido
    const pedidoMatch = message.match(/\d+/);
    if (!pedidoMatch) {
      return {
        reply: "📦 Por favor, me informe o número do seu pedido que vou consultar o status para você.",
        context: { waitingFor: 'order_number' }
      };
    }
    
    const pedidoId = pedidoMatch[0];
    
    try {
      // Consultar API
      const response = await axios.get(
        `${process.env.CAMALEAO_API_URL}/pedidos.php`,
        {
          params: { id: pedidoId },
          headers: {
            'X-API-Key': process.env.CAMALEAO_API_KEY
          }
        }
      );
      
      const pedido = response.data;
      
      if (!pedido || pedido.error) {
        return {
          reply: `❌ Não encontrei o pedido #${pedidoId}. Verifique se o número está correto ou me passe seu CPF/CNPJ para eu localizar seus pedidos.`,
          context: { lastSearchedOrder: pedidoId }
        };
      }
      
      // Formatar resposta baseada no status
      let statusEmoji = '📦';
      let mensagemAdicional = '';
      
      switch(pedido.status) {
        case 'aguardando_pagamento':
          statusEmoji = '⏳';
          mensagemAdicional = '\n💳 Aguardando confirmação do pagamento.';
          break;
        case 'em_producao':
          statusEmoji = '🏭';
          mensagemAdicional = '\n⚙️ Seu pedido está sendo produzido com carinho!';
          break;
        case 'pronto':
          statusEmoji = '✅';
          mensagemAdicional = '\n📞 Entraremos em contato para combinar a entrega.';
          break;
        case 'enviado':
          statusEmoji = '🚚';
          mensagemAdicional = pedido.codigo_rastreio ? 
            `\n📍 Código de rastreio: ${pedido.codigo_rastreio}` : '';
          break;
        case 'entregue':
          statusEmoji = '✅';
          mensagemAdicional = '\n🙏 Obrigado pela preferência!';
          break;
      }
      
      // Calcular dias desde o pedido
      const dataPedido = new Date(pedido.data_pedido);
      const hoje = new Date();
      const diasDecorridos = Math.floor((hoje - dataPedido) / (1000 * 60 * 60 * 24));
      
      const resposta = `${statusEmoji} **Pedido #${pedidoId}**
      
📋 **Status:** ${pedido.status_formatado}
👤 **Cliente:** ${pedido.cliente_nome}
💰 **Valor:** R$ ${pedido.valor_total}
📅 **Data do Pedido:** ${new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
📅 **Prazo de Entrega:** ${new Date(pedido.prazo_entrega).toLocaleDateString('pt-BR')}
⏱️ **Tempo decorrido:** ${diasDecorridos} dias

**Itens do Pedido:**
${pedido.itens.map(item => `• ${item.quantidade}x ${item.produto} - R$ ${item.valor}`).join('\n')}

${mensagemAdicional}

${pedido.observacoes ? `\n📝 **Observações:** ${pedido.observacoes}` : ''}

Precisa de mais alguma informação sobre este pedido?`;
      
      // Salvar no contexto
      return {
        reply: resposta,
        context: {
          lastOrder: pedido,
          clientPhone: session.phone,
          clientName: pedido.cliente_nome
        }
      };
      
    } catch (error) {
      console.error('Erro ao consultar pedido:', error);
      
      return {
        reply: `🔄 Tive um problema ao consultar o pedido #${pedidoId}. Vou verificar com nossa equipe e já retorno. Por favor, aguarde um momento ou digite "vendedor" para falar com um atendente.`,
        context: { 
          error: error.message,
          failedOrderQuery: pedidoId
        }
      };
    }
  }
};