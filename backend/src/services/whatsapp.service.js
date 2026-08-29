/**
 * Cliente para a WhatsApp Business Platform (Meta).
 * Usa fetch nativo do Node.js v18+ (sem dependência externa).
 * Todas as chamadas exigem WHATSAPP_TOKEN no env.
 */

const BASE_URL = 'https://graph.facebook.com/v19.0';

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Envia mensagem de texto simples.
 * @param {string} phoneId - ID do número (WABA phone_id)
 * @param {string} to - número do destinatário (ex: 5511999999999)
 * @param {string} text - texto a enviar
 */
async function sendText(phoneId, to, text) {
  const url = `${BASE_URL}/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || res.statusText);
    return data;
  } catch (err) {
    throw new Error(`WhatsApp sendText error: ${err.message}`);
  }
}

/**
 * Envia template aprovado pelo Meta.
 */
async function sendTemplate(phoneId, to, templateName, language = 'pt_BR', components = []) {
  const url = `${BASE_URL}/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: templateName, language: { code: language }, components },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || res.statusText);
    return data;
  } catch (err) {
    throw new Error(`WhatsApp sendTemplate error: ${err.message}`);
  }
}

/**
 * Marca mensagem como lida.
 */
async function markAsRead(phoneId, messageId) {
  const url = `${BASE_URL}/${phoneId}/messages`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch {
    // não crítico
  }
}

/**
 * Verifica assinatura HMAC-SHA256 do webhook Meta.
 * timingSafeEqual exige buffers de mesmo tamanho —
 * divergência de comprimento já indica assinatura inválida.
 */
function verifySignature(rawBody, signature) {
  const crypto = require('crypto');
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // pular em dev se não configurado

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signature || '');
  const expBuf = Buffer.from(expected);

  // Comprimentos diferentes → inválido (sem vazar timing)
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}

module.exports = { sendText, sendTemplate, markAsRead, verifySignature };
