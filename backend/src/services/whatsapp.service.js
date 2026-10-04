/**
 * Cliente para a WhatsApp Business Platform (Meta).
 * Usa fetch nativo do Node.js v18+ (sem dependência externa).
 * Token: usa o token do tenant (channels.settings.access_token) quando disponível,
 * com fallback para WHATSAPP_TOKEN no env (compatibilidade retroativa).
 */

const BASE_URL = 'https://graph.facebook.com/v19.0';

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token || process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Envia mensagem de texto simples.
 * @param {string} phoneId - ID do número (WABA phone_id)
 * @param {string} to - número do destinatário (ex: 5511999999999)
 * @param {string} text - texto a enviar
 * @param {string} [token] - access token do tenant (sobrepõe env var)
 */
async function sendText(phoneId, to, text, token) {
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
      headers: getHeaders(token),
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
 * Envia imagem via URL pública.
 * @param {string} phoneId - ID do número WABA
 * @param {string} to - número do destinatário
 * @param {string} imageUrl - URL pública da imagem (jpg/png/webp)
 * @param {string} [caption] - legenda opcional
 * @param {string} [token] - access token do tenant
 */
async function sendImage(phoneId, to, imageUrl, caption = '', token) {
  const url = `${BASE_URL}/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || res.statusText);
    return data;
  } catch (err) {
    throw new Error(`WhatsApp sendImage error: ${err.message}`);
  }
}

/**
 * Envia template aprovado pelo Meta.
 * @param {string} [token] - access token do tenant
 */
async function sendTemplate(phoneId, to, templateName, language = 'pt_BR', components = [], token) {
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
      headers: getHeaders(token),
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
 * @param {string} [token] - access token do tenant
 */
async function markAsRead(phoneId, messageId, token) {
  const url = `${BASE_URL}/${phoneId}/messages`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: getHeaders(token),
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
 * Envia mensagem de áudio/voz via WhatsApp.
 * Faz upload do buffer OGG/OPUS para a Media API e envia como mensagem de voz.
 * @param {string} phoneId - ID do número WABA
 * @param {string} to - número do destinatário
 * @param {Buffer} audioBuffer - Buffer OGG/OPUS gerado pelo TTS
 * @param {string} [token] - access token do tenant
 */
async function sendAudio(phoneId, to, audioBuffer, token) {
  const accessToken = token || process.env.WHATSAPP_TOKEN;
  const baseUrl = `${BASE_URL}/${phoneId}`;

  // Passo 1: Upload do áudio para a WhatsApp Media API
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/ogg; codecs=opus' });
  formData.append('file', blob, 'voice.ogg');
  formData.append('type', 'audio/ogg; codecs=opus');
  formData.append('messaging_product', 'whatsapp');

  const uploadRes = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(`WhatsApp media upload error: ${uploadData?.error?.message || uploadRes.statusText}`);
  }

  const mediaId = uploadData.id;

  // Passo 2: Envia mensagem de áudio com o media_id
  const sendRes = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'audio',
      audio: { id: mediaId },
    }),
  });

  const sendData = await sendRes.json();
  if (!sendRes.ok) {
    throw new Error(`WhatsApp sendAudio error: ${sendData?.error?.message || sendRes.statusText}`);
  }

  return sendData;
}

/**
 * Verifica assinatura HMAC-SHA256 do webhook Meta.
 * timingSafeEqual exige buffers de mesmo tamanho —
 * divergência de comprimento já indica assinatura inválida.
 */
function verifySignature(rawBody, signature) {
  const crypto = require('crypto');
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    throw new Error(
      '[Config] WHATSAPP_APP_SECRET não está configurado — ' +
      'verificação de assinatura do webhook impossível. Configure a variável de ambiente.'
    );
  }

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

module.exports = { sendText, sendImage, sendAudio, sendTemplate, markAsRead, verifySignature };
