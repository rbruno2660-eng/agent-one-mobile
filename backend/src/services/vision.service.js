/**
 * Serviço de visão — analisa fotos de celulares enviadas pelo WhatsApp.
 *
 * Usa Claude Vision (claude-haiku-4-5) para avaliar automaticamente:
 *   - Condição da tela (perfect / scratched / cracked / replaced)
 *   - Condição da traseira (perfect / cracked)
 *   - Condição da carcaça (perfect / damaged)
 *   - Modelo identificado visualmente
 *   - Resumo em português para o atendente
 *
 * O resultado é injetado como texto no conteúdo da mensagem
 * antes de chegar ao Agent Runtime, permitindo que a IA
 * use calculate_trade_deductions com dados reais da foto.
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Baixa uma mídia do WhatsApp Graph API e retorna em base64.
 * O WhatsApp requer 2 requisições: metadados → URL → download.
 *
 * @param {string} mediaId - ID da mídia (message.image.id)
 * @param {string} accessToken - Token do canal ativo do tenant
 * @returns {{ base64: string, mediaType: string }}
 */
async function downloadWhatsAppMedia(mediaId, accessToken) {
  // Passo 1: busca metadados (URL temporária da mídia)
  const metaResp = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!metaResp.ok) {
    throw new Error(`Erro ao buscar metadados da mídia (${metaResp.status})`);
  }

  const meta = await metaResp.json();
  if (!meta.url) throw new Error('URL da mídia não retornada pelo Meta');

  // Passo 2: baixa o arquivo de imagem
  const imgResp = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!imgResp.ok) {
    throw new Error(`Erro ao baixar imagem (${imgResp.status})`);
  }

  const buffer = await imgResp.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = imgResp.headers.get('content-type') || 'image/jpeg';

  return { base64, mediaType };
}

/**
 * Analisa uma foto de celular para avaliação de troca.
 * Retorna um objeto estruturado com condição do aparelho.
 *
 * @param {string} mediaId
 * @param {string} accessToken
 * @returns {object}
 */
async function analyzeTradePhoto(mediaId, accessToken) {
  const { base64, mediaType } = await downloadWhatsAppMedia(mediaId, accessToken);

  const systemPrompt = `Você é um especialista em avaliação de celulares usados para revendas.
Analise fotos de aparelhos e retorne JSON preciso sobre a condição.
RESPONDA APENAS COM JSON VÁLIDO — nenhum texto antes ou depois.`;

  const userPrompt = `Analise esta foto e retorne um JSON com:
{
  "model_detected": "modelo identificado (ex: iPhone 13, iPhone 14 Pro) ou null se não visível",
  "screen_condition": "perfect" | "scratched" | "cracked" | "replaced",
  "back_condition": "perfect" | "cracked",
  "body_condition": "perfect" | "damaged",
  "confidence": "high" | "medium" | "low",
  "summary": "descrição curta em português do estado geral (1-2 frases)",
  "notes": "observações adicionais relevantes ou null"
}

Critérios:
- screen_condition "perfect" = sem riscos visíveis; "scratched" = riscos mas funcional; "cracked" = vidro trincado/quebrado; "replaced" = tela visivelmente substituída (moldura diferente, cola aparente)
- back_condition "perfect" = sem trincas; "cracked" = vidro traseiro trincado
- body_condition "perfect" = alumínio/titânio sem dobras ou amassados; "damaged" = com danos estruturais
- confidence = quão certa está a avaliação com base na qualidade/ângulo da foto`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  });

  const rawText = response.content.find(b => b.type === 'text')?.text || '{}';

  try {
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback seguro — IA pedirá mais informações ao cliente
    return {
      model_detected: null,
      screen_condition: 'perfect',
      back_condition: 'perfect',
      body_condition: 'perfect',
      confidence: 'low',
      summary: 'Não foi possível analisar a imagem com precisão.',
      notes: null,
    };
  }
}

/**
 * Formata o resultado da análise como texto legível para o Agent Runtime.
 * Esse texto é injetado no conteúdo da mensagem antes do Claude ler.
 */
function formatAnalysisForAgent(analysis) {
  const labels = {
    perfect: 'perfeita',
    scratched: 'com riscos leves',
    cracked: 'trincada/quebrada',
    replaced: 'tela substituída',
    damaged: 'com danos',
  };

  let text = `[Foto do aparelho enviada pelo cliente — análise automática Agent One Vision]\n\n`;
  text += `📸 Resultado da análise (confiança: ${analysis.confidence || 'média'}):\n`;
  if (analysis.model_detected) text += `• Modelo identificado: ${analysis.model_detected}\n`;
  text += `• Tela: ${labels[analysis.screen_condition] || analysis.screen_condition}\n`;
  text += `• Traseira: ${labels[analysis.back_condition] || analysis.back_condition}\n`;
  text += `• Carcaça: ${labels[analysis.body_condition] || analysis.body_condition}\n`;
  if (analysis.notes) text += `• Obs: ${analysis.notes}\n`;
  text += `\n📋 ${analysis.summary}\n`;
  text += `\nUse screen_condition="${analysis.screen_condition}", back_condition="${analysis.back_condition}", body_condition="${analysis.body_condition}" no calculate_trade_deductions.`;

  return text;
}

module.exports = { analyzeTradePhoto, formatAnalysisForAgent };
