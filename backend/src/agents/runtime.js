const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt } = require('./prompt.builder');
const { TOOL_DEFINITIONS } = require('./tools');
const { executeTool } = require('./tool.executor');
const { query } = require('../db/pool');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_CONTEXT_MESSAGES = 20;  // últimas N mensagens do histórico
const MAX_TOOL_ITERATIONS = 5;    // evita loops infinitos de tools

/**
 * Executa o Agent Runtime para uma conversa.
 *
 * @param {string} tenantId
 * @param {string} conversationId
 * @param {object} contact - { id, phone, name }
 * @param {object} inboundMessage - mensagem salva no banco
 * @returns {string} texto da resposta a ser enviada
 */
async function run(tenantId, conversationId, contact, inboundMessage) {
  // 1. Verifica se conversa está com humano — não responde
  const convResult = await query(
    `SELECT status FROM conversations WHERE id = $1`,
    [conversationId]
  );
  const status = convResult.rows[0]?.status;
  if (status === 'human_active' || status === 'human_requested' || status === 'closed') {
    return null;
  }

  // 2. Monta system prompt
  const systemPrompt = await buildSystemPrompt(tenantId);

  // 3. Carrega histórico de mensagens (contexto)
  const histResult = await query(
    `SELECT direction, content FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [conversationId, MAX_CONTEXT_MESSAGES]
  );

  const history = histResult.rows.reverse().map(msg => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content || '',
  }));

  // Garante que começa com 'user' (Claude API exige alternância)
  const messages = normalizeMessages(history);

  // 4. Agentic loop com tools
  let iterations = 0;
  let currentMessages = [...messages];

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',   // rápido e barato para WhatsApp
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages: currentMessages,
    });

    // Adiciona resposta do assistente ao contexto
    currentMessages.push({ role: 'assistant', content: response.content });

    // Verifica stop_reason
    if (response.stop_reason === 'end_turn') {
      // Extrai texto da resposta final
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock?.text || null;
    }

    if (response.stop_reason === 'tool_use') {
      // Executa todas as tools chamadas neste turno
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        const context = { tenantId, conversationId, contactId: contact.id };
        const output = await executeTool(block.name, block.input, context);

        // Se handoff foi acionado, para o loop
        if (block.name === 'request_handoff' && output?.ok) {
          return 'Um momento! Estou chamando um de nossos atendentes para continuar o seu atendimento. 😊';
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(output),
        });
      }

      // Adiciona resultados das tools ao contexto
      currentMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // max_tokens ou outro stop
    break;
  }

  // Fallback se loop terminar sem resposta
  return 'Desculpe, tive uma dificuldade ao processar. Um atendente irá te ajudar em instantes.';
}

/**
 * Normaliza mensagens para garantir alternância user/assistant.
 * Claude API exige que comece com user e alterne.
 */
function normalizeMessages(messages) {
  if (messages.length === 0) return [];

  const result = [];
  let lastRole = null;

  for (const msg of messages) {
    if (!msg.content?.trim()) continue;

    if (msg.role === lastRole) {
      // Mescla com a anterior se mesmo role
      result[result.length - 1].content += '\n' + msg.content;
    } else {
      result.push({ role: msg.role, content: msg.content });
      lastRole = msg.role;
    }
  }

  // Claude API exige que comece com 'user'
  if (result.length > 0 && result[0].role === 'assistant') {
    result.shift();
  }

  return result;
}

module.exports = { run };
