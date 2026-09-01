/**
 * Transcrição de áudios do WhatsApp via OpenAI Whisper.
 *
 * Requer OPENAI_API_KEY no .env. Se a variável não estiver presente,
 * todas as chamadas retornam null (fallback silencioso).
 *
 * Fluxo:
 *   1. Busca URL de download da mídia na Graph API
 *   2. Baixa o buffer do áudio (OGG/MP4)
 *   3. Envia para Whisper e retorna o transcript em português
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
 * Transcreve um áudio do WhatsApp usando Whisper.
 * @param {string} mediaId - ID da mídia do WhatsApp
 * @returns {string|null} Texto transcrito, ou null se Whisper não configurado
 */
async function transcribeAudio(mediaId) {
  if (!process.env.OPENAI_API_KEY) {
    return null; // Whisper não configurado — caller trata como mídia normal
  }

  const { OpenAI } = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);

  // Determina extensão a partir do mime type
  let ext = 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'mp4';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3'))  ext = 'mp3';
  if (mimeType.includes('webm')) ext = 'webm';

  const transcript = await openai.audio.transcriptions.create({
    file: new File([buffer], `audio.${ext}`, { type: mimeType }),
    model: 'whisper-1',
    language: 'pt',
  });

  return transcript.text?.trim() || null;
}

module.exports = { transcribeAudio };
