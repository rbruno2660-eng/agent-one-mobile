/**
 * Roteador por palavra-chave — Feature 2.
 * Detecta intenções em mensagens inbound ANTES de chamar a IA.
 * Economiza tokens Claude e encaminha instantaneamente para humano quando necessário.
 */

const KEYWORD_GROUPS = [
  {
    intent: 'cancel',
    handoffReason: 'complaint',
    keywords: ['cancelar', 'cancelamento', 'desistir', 'não quero mais', 'nao quero mais'],
  },
  {
    intent: 'payment',
    handoffReason: 'missing_information',
    keywords: ['boleto', 'pagamento', 'pagar', 'financeiro', 'pix comprovante', 'comprovante pix'],
  },
  {
    intent: 'human_request',
    handoffReason: 'customer_requested',
    keywords: [
      'falar com humano', 'falar com atendente', 'falar com pessoa',
      'atendente humano', 'quero falar com alguém', 'quero falar com alguem',
      'falar com alguém', 'falar com alguem',
    ],
  },
  {
    intent: 'promotion',
    handoffReason: null, // não transfere, apenas injeta contexto
    keywords: ['promoção', 'promocao', 'desconto especial', 'oferta', 'cupom'],
  },
];

/**
 * Analisa o texto de uma mensagem e retorna o intent detectado, se houver.
 *
 * @param {string} text - Conteúdo da mensagem inbound
 * @returns {{ intent: string, handoffReason: string|null } | null}
 */
function detectIntent(text) {
  if (!text || typeof text !== 'string') return null;

  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // remove acentos para comparação

  for (const group of KEYWORD_GROUPS) {
    for (const keyword of group.keywords) {
      const normalizedKw = keyword
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

      if (normalized.includes(normalizedKw)) {
        return { intent: group.intent, handoffReason: group.handoffReason };
      }
    }
  }

  return null;
}

module.exports = { detectIntent };
