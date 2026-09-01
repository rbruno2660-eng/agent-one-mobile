/**
 * Transcrição de áudios do WhatsApp via OpenAI Whisper.
 *
 * Usa https nativo + form-data para evitar problemas com o undici
 * (SDK openai) em ambientes Railway (ECONNRESET em POSTs multipart).
 *
 * Fluxo:
 *   1. Busca URL de download da mídia na Graph API
 *   2. Baixa o buffer do áudio (OGG/MP4)
 *   3. Envia para Whisper via https nativo e retorna o transcript em português
 */

const BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Baixa o áudio de uma mídia do WhatsApp.
 * @param {string} mediaId - ID da mídia retornado pelo webhook
 * @returns {{ buffer: Buffer, mimeType: string }}
 */
async function downloadWhatsAppMedia(mediaId) {
  // 1. Busca metadata da mídia (URL de download)
  const metaRes = await fetch(`${BASE_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!metaRes.ok) throw new Error(`Media metadata: ${metaRes.status} ${metaRes.statusText}`);
  const { url, mime_type } = await metaRes.json();

  // 2. Baixa o arquivo de áudio
  const audioRes = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!audioRes.ok) throw new Error(`Audio download: ${audioRes.status} ${audioRes.statusText}`);

  const arrayBuffer = await audioRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType: mime_type || 'audio/ogg' };
}

/**
 * Envia buffer de áudio ao Whisper via https nativo (evita undici/ECONNRESET).
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} ext  - extensão do arquivo (ogg, mp4, mp3, webm)
 * @returns {string|null}
 */
function whisperViaHttps(buffer, mimeType, ext) {
  const FormData = require('form-data');
  const https = require('https');

  const form = new FormData();
  form.append('file', buffer, { filename: `audio.${ext}`, contentType: mimeType });
  form.append('model', 'whisper-1');
  form.append('language', 'pt');

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));
            resolve(parsed.text?.trim() || null);
          } catch (e) {
            reject(new Error('Resposta inválida do Whisper: ' + data.slice(0, 120)));
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(new Error('Whisper timeout')); });
    form.pipe(req);
  });
}

/**
 * Transcreve um áudio do WhatsApp usando Whisper.
 * @param {string} mediaId - ID da mídia do WhatsApp
 * @returns {string|null} Texto transcrito, ou null se Whisper não configurado
 */
async function transcribeAudio(mediaId) {
  if (!process.env.OPENAI_API_KEY) {
    return null; // Whisper não configurado — caller trata como mídia normal
  }

  const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);

  // Determina extensão a partir do mime type
  let ext = 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'mp4';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3'))  ext = 'mp3';
  if (mimeType.includes('webm')) ext = 'webm';

  return whisperViaHttps(buffer, mimeType, ext);
}

module.exports = { transcribeAudio };
