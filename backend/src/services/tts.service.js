/**
 * TTS (Text-to-Speech) Service — ElevenLabs Voice Cloning
 *
 * Converte texto em áudio OGG/OPUS usando a voz clonada do representante via ElevenLabs.
 * O áudio gerado é enviado como mensagem de voz pelo WhatsApp quando o cliente envia um áudio.
 *
 * Variáveis de ambiente necessárias:
 *   ELEVENLABS_API_KEY   — chave da API ElevenLabs (obtida em elevenlabs.io)
 *   ELEVENLABS_VOICE_ID  — ID da voz clonada padrão (global, fallback por tenant)
 *
 * Por tenant: armazene elevenlabs_voice_id em channels.settings para que cada
 * tenant use a voz do seu próprio representante.
 *
 * Dependência de sistema: ffmpeg deve estar instalado no servidor.
 *   - Railway: adicione `ffmpeg` via Nixpacks (nixpacks.toml) ou apt-get
 *   - Docker: RUN apt-get install -y ffmpeg
 *   - Local: brew install ffmpeg / apt install ffmpeg
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execFileAsync = promisify(execFile);

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Converte texto em áudio OGG/OPUS usando a voz clonada da ElevenLabs.
 * @param {string} text — Texto a ser convertido em fala
 * @param {string} [voiceId] — ID da voz ElevenLabs (sobrepõe env ELEVENLABS_VOICE_ID)
 * @returns {Promise<Buffer>} — Buffer OGG/OPUS pronto para envio via WhatsApp
 */
async function textToSpeech(text, voiceId = null) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const resolvedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey) {
    throw new Error('[TTS] ELEVENLABS_API_KEY não configurado');
  }
  if (!resolvedVoiceId) {
    throw new Error('[TTS] ELEVENLABS_VOICE_ID não configurado (ou voice_id não fornecido)');
  }

  console.log(`[TTS] Gerando áudio para ${text.length} chars, voice: ${resolvedVoiceId}`);

  // 1. Chama ElevenLabs TTS → retorna MP3
  const mp3Buffer = await callElevenLabs(text, resolvedVoiceId, apiKey);

  // 2. Converte MP3 → OGG OPUS (formato exigido pelo WhatsApp)
  const oggBuffer = await convertMp3ToOgg(mp3Buffer);

  console.log(`[TTS] Áudio gerado com sucesso: ${oggBuffer.length} bytes (OGG/OPUS)`);

  return oggBuffer;
}

/**
 * Chama a API de TTS da ElevenLabs e retorna o MP3 como Buffer.
 */
async function callElevenLabs(text, voiceId, apiKey) {
  const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2', // suporta português BR
      voice_settings: {
        stability: 0.5,          // 0=mais variado, 1=mais consistente
        similarity_boost: 0.75,  // fidelidade à voz clonada
        style: 0.0,               // sem estilo exagerado
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errBody = await response.json();
      errMsg = errBody?.detail?.message || errBody?.detail || JSON.stringify(errBody);
    } catch {
      // ignora parse error
    }
    throw new Error(`[TTS] ElevenLabs API error ${response.status}: ${errMsg}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Converte Buffer MP3 para OGG/OPUS usando ffmpeg.
 * WhatsApp exige áudio OGG com codec OPUS para mensagens de voz.
 */
async function convertMp3ToOgg(mp3Buffer) {
  const tmpDir = os.tmpdir();
  const uniqueId = `tts_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const mp3Path = path.join(tmpDir, `${uniqueId}.mp3`);
  const oggPath = path.join(tmpDir, `${uniqueId}.ogg`);

  try {
    // Escreve MP3 em arquivo temporário
    await fs.promises.writeFile(mp3Path, mp3Buffer);

    // Converte com ffmpeg: MP3 → OGG OPUS
    await execFileAsync('ffmpeg', [
      '-y',              // sobrescreve sem perguntar
      '-i', mp3Path,     // entrada
      '-c:a', 'libopus', // codec OPUS (exigido pelo WhatsApp)
      '-b:a', '64k',     // bitrate adequado para voz
      '-ar', '24000',    // sample rate compatível com ElevenLabs
      '-ac', '1',        // mono (voz)
      oggPath,           // saída
    ]);

    const oggBuffer = await fs.promises.readFile(oggPath);
    return oggBuffer;

  } finally {
    // Limpeza dos arquivos temporários
    await fs.promises.unlink(mp3Path).catch(() => {});
    await fs.promises.unlink(oggPath).catch(() => {});
  }
}

/**
 * Verifica se o TTS está habilitado (variáveis de ambiente configuradas).
 * Pode receber voiceId por tenant para checar disponibilidade específica.
 */
function isTTSEnabled(tenantVoiceId = null) {
  const hasKey = !!process.env.ELEVENLABS_API_KEY;
  const hasVoice = !!(tenantVoiceId || process.env.ELEVENLABS_VOICE_ID);
  return hasKey && hasVoice;
}

/**
 * Clona uma voz na ElevenLabs a partir de amostras de áudio.
 * Retorna o voice_id da nova voz clonada para ser salvo no tenant.
 *
 * @param {string} voiceName — Nome da voz (ex: "João - Loja SP")
 * @param {Buffer[]} audioSamples — Array de Buffers de áudio (MP3/WAV, 1-5 min cada)
 * @param {string} [description] — Descrição opcional
 * @returns {Promise<string>} voice_id criado
 */
async function cloneVoice(voiceName, audioSamples, description = '') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('[TTS] ELEVENLABS_API_KEY não configurado');

  const formData = new FormData();
  formData.append('name', voiceName);
  if (description) formData.append('description', description);
  formData.append('labels', JSON.stringify({ use_case: 'whatsapp_agent', language: 'pt-BR' }));

  audioSamples.forEach((buf, idx) => {
    const blob = new Blob([buf], { type: 'audio/mpeg' });
    formData.append('files', blob, `sample_${idx + 1}.mp3`);
  });

  const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[TTS] Erro ao clonar voz: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.voice_id;
}

module.exports = { textToSpeech, isTTSEnabled, cloneVoice };
