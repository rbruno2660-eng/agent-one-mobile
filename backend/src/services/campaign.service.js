/**
 * Serviço de campanhas ativas (outbound proactive messaging) — Feature 4.
 * Processa envio de mensagens em lote com rate-limit de 1/segundo.
 */

const { query } = require('../db/pool');
const whatsappService = require('./whatsapp.service');

/**
 * Dispara envio de uma campanha.
 * Rate-limita 1 msg/s para evitar banimento do WhatsApp.
 */
async function sendCampaign(tenantId, campaignId) {
  // Valida campanha e ownership
  const campaignResult = await query(
    `SELECT c.*, ch.phone_id, ch.settings AS channel_settings
     FROM campaigns c
     JOIN channels ch ON ch.tenant_id = c.tenant_id AND ch.status = 'active'
     WHERE c.id = $1 AND c.tenant_id = $2 AND c.status IN ('draft','scheduled')
     LIMIT 1`,
    [campaignId, tenantId]
  );

  if (!campaignResult.rows.length) {
    throw new Error('Campanha não encontrada ou não elegível para envio');
  }

  const campaign = campaignResult.rows[0];
  const phoneId = campaign.phone_id;
  const token = campaign.channel_settings?.access_token || null;

  // Marca campanha como em execução
  await query(
    `UPDATE campaigns SET status = 'running', updated_at = NOW() WHERE id = $1`,
    [campaignId]
  );

  // Busca contatos pendentes
  const contactsResult = await query(
    `SELECT id, contact_phone, contact_name FROM campaign_contacts
     WHERE campaign_id = $1 AND status = 'pending'
     ORDER BY id`,
    [campaignId]
  );

  let sentCount = 0;
  let failedCount = 0;

  for (const contact of contactsResult.rows) {
    try {
      // Personaliza mensagem com nome do contato se disponível
      const personalizedMsg = campaign.message_template
        .replace(/\{nome\}/gi, contact.contact_name || 'cliente')
        .replace(/\{name\}/gi, contact.contact_name || 'cliente');

      await whatsappService.sendText(phoneId, contact.contact_phone, personalizedMsg, token);

      await query(
        `UPDATE campaign_contacts SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [contact.id]
      );
      sentCount++;
    } catch (err) {
      console.error(`[Campaign] Falha ao enviar para ${contact.contact_phone}:`, err.message);
      await query(
        `UPDATE campaign_contacts SET status = 'failed' WHERE id = $1`,
        [contact.id]
      );
      failedCount++;
    }

    // Rate-limit: 1 mensagem por segundo
    await new Promise(r => setTimeout(r, 1000));
  }

  // Marca campanha como concluída e atualiza contadores
  await query(
    `UPDATE campaigns
     SET status = 'completed',
         sent_count   = (SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = $1 AND status = 'sent'),
         failed_count = (SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = $1 AND status = 'failed'),
         updated_at   = NOW()
     WHERE id = $1`,
    [campaignId]
  );

  console.log(`[Campaign] Campanha ${campaignId} concluída: ${sentCount} enviados, ${failedCount} falhas`);
  return { sentCount, failedCount };
}

/**
 * Adiciona contatos a uma campanha.
 * @param {string} campaignId
 * @param {Array<{phone: string, name: string}>} contacts
 */
async function addContactsToCampaign(campaignId, contacts) {
  if (!contacts?.length) return 0;

  const values = contacts.map((c, i) => {
    const base = i * 3;
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });

  const flat = contacts.flatMap(c => [campaignId, c.phone, c.name || null]);

  await query(
    `INSERT INTO campaign_contacts (campaign_id, contact_phone, contact_name)
     VALUES ${values.join(', ')}
     ON CONFLICT DO NOTHING`,
    flat
  );

  return contacts.length;
}

module.exports = { sendCampaign, addContactsToCampaign };
