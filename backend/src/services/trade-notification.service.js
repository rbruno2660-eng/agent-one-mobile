/**
 * Serviço de notificações automáticas de troca via WhatsApp.
 * Disparado quando o status de uma trade_evaluation muda.
 */

const { query } = require('../db/pool');
const whatsappService = require('./whatsapp.service');

/**
 * Mensagens por status. Suportam placeholders: {nome}, {modelo}, {armazenamento}, {valor}
 */
const MESSAGES = {
  approved: (nome, modelo, armazenamento, valor) => {
    const nomeStr = nome ? `${nome.split(' ')[0]}! ` : '';
    const aparelho = `${modelo}${armazenamento ? ' ' + armazenamento : ''}`;
    const valorStr = valor ? ` por R$ ${Number(valor).toLocaleString('pt-BR')}` : '';
    return `✅ Boa notícia, ${nomeStr}Aprovamos a pré-avaliação do seu ${aparelho}${valorStr} de entrada.\n\nQuando você prefere vir até a loja para finalizar a troca? 😊`;
  },

  rejected: (nome, modelo, armazenamento) => {
    const nomeStr = nome ? `${nome.split(' ')[0]}, ` : '';
    const aparelho = `${modelo}${armazenamento ? ' ' + armazenamento : ''}`;
    return `Olá${nomeStr ? ', ' + nomeStr.replace(', ', '') : ''}! Infelizmente o ${aparelho} não se encaixou nas nossas condições de troca no momento.\n\nMas podemos conversar sobre outras formas de pagamento — parcelamento ou entrada em dinheiro. Posso te ajudar com isso? 🤝`;
  },

  reviewing: (nome, modelo, armazenamento) => {
    const nomeStr = nome ? `${nome.split(' ')[0]}! ` : '';
    const aparelho = `${modelo}${armazenamento ? ' ' + armazenamento : ''}`;
    return `Oi ${nomeStr}Recebemos as informações do seu ${aparelho} e estamos avaliando.\n\nNosso horário de atendimento é seg-sáb das 9h às 18h — você pode passar por aqui quando quiser para a avaliação presencial! 📱`;
  },
};

/**
 * Notifica o cliente pelo WhatsApp quando o status de uma avaliação muda.
 *
 * @param {string} tenantId
 * @param {object} evaluation - linha da tabela trade_evaluations com campos extras do contact
 * @param {string} newStatus - 'approved' | 'rejected' | 'reviewing'
 */
async function notifyTradeStatusChange(tenantId, evaluation, newStatus) {
  if (!MESSAGES[newStatus]) return; // status sem mensagem definida

  try {
    // Canal ativo do tenant
    const channelResult = await query(
      `SELECT phone_id, settings FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
      [tenantId]
    );
    if (!channelResult.rows.length) return;

    const { phone_id: phoneId, settings } = channelResult.rows[0];
    const token = settings?.access_token || null;

    // Dados do contato
    const contactResult = await query(
      `SELECT name, phone FROM contacts WHERE id = $1 AND tenant_id = $2`,
      [evaluation.contact_id, tenantId]
    );
    if (!contactResult.rows.length) return;

    const contact = contactResult.rows[0];
    if (!contact.phone) return;

    // Monta mensagem
    const message = MESSAGES[newStatus](
      contact.name,
      evaluation.device_model || 'aparelho',
      evaluation.device_storage || '',
      evaluation.estimate || evaluation.estimated_value || null
    );

    await whatsappService.sendText(phoneId, contact.phone, message, token);

    // Loga a notificação
    console.log(`[TradeNotification] Notificação "${newStatus}" enviada para ${contact.phone} (tenant: ${tenantId}, eval: ${evaluation.id})`);
  } catch (err) {
    // Não deixa erro de notificação quebrar o fluxo principal
    console.error(`[TradeNotification] Erro ao notificar status "${newStatus}":`, err.message);
  }
}

module.exports = { notifyTradeStatusChange };
