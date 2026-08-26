/**
 * Definição das tools disponíveis para o Agent One.
 * Formato compatível com a Claude API (Anthropic).
 *
 * SEPARAÇÃO CRÍTICA: a IA conversa; o backend calcula.
 * Nenhuma tool aceita lógica arbitrária — cada uma tem escopo fixo.
 */

const TOOL_DEFINITIONS = [
  {
    name: 'get_product_price',
    description: 'Retorna preço atual, preço Pix e disponibilidade de um produto por forma de pagamento. SEMPRE use esta tool antes de informar qualquer preço ao cliente.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'UUID do produto' },
        payment_method: {
          type: 'string',
          enum: ['pix', 'cash', 'card', 'all'],
          description: 'Forma de pagamento desejada',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'search_products',
    description: 'Busca produtos no catálogo por modelo, condição ou armazenamento. Use para encontrar o product_id antes de consultar preço.',
    input_schema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Ex: iPhone 14 Pro' },
        storage: { type: 'string', description: 'Ex: 128GB' },
        condition: { type: 'string', enum: ['new', 'used', 'all'], description: 'Condição do aparelho' },
      },
    },
  },
  {
    name: 'check_stock',
    description: 'Verifica disponibilidade em estoque de um produto específico.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'UUID do produto' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'check_discount',
    description: 'Valida se um preço proposto está acima do preço mínimo permitido. SEMPRE use antes de confirmar qualquer desconto.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'UUID do produto' },
        proposed_price: { type: 'number', description: 'Preço proposto em reais' },
      },
      required: ['product_id', 'proposed_price'],
    },
  },
  {
    name: 'calculate_installment',
    description: 'Retorna as opções de parcelamento cadastradas para um produto.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'UUID do produto' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_trade_base_value',
    description: 'Busca o valor base de troca para um modelo de iPhone. Primeiro passo da avaliação.',
    input_schema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Ex: iPhone 12' },
        storage: { type: 'string', description: 'Ex: 64GB' },
      },
      required: ['model'],
    },
  },
  {
    name: 'calculate_trade_deductions',
    description: 'Calcula os descontos de troca baseado no estado do aparelho (bateria, tela, traseira, carcaça). Use após get_trade_base_value.',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string' },
        battery_health: { type: 'number', description: 'Percentual de saúde da bateria (0-100)' },
        screen_condition: { type: 'string', enum: ['perfect', 'scratched', 'cracked', 'replaced'], description: 'Estado da tela' },
        back_condition: { type: 'string', enum: ['perfect', 'cracked'], description: 'Estado da traseira' },
        body_condition: { type: 'string', enum: ['perfect', 'damaged'], description: 'Estado da carcaça' },
      },
      required: ['battery_health', 'screen_condition'],
    },
  },
  {
    name: 'get_services',
    description: 'Lista os serviços de manutenção disponíveis, opcionalmente filtrado por modelo de iPhone.',
    input_schema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Ex: iPhone 13 Pro — filtra serviços compatíveis' },
      },
    },
  },
  {
    name: 'create_lead',
    description: 'Registra um lead quando o cliente demonstra interesse em um produto específico.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'UUID do produto de interesse' },
        source: { type: 'string', description: 'Ex: whatsapp, indicacao, instagram' },
        score_reason: { type: 'string', description: 'Motivo do interesse (ex: perguntou sobre parcelamento)' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'request_handoff',
    description: 'Transfere a conversa para um atendente humano. Use quando o cliente pede uma pessoa, há conflito, desconto além do limite ou fechamento de venda.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          enum: [
            'customer_requested',
            'commercial_exception',
            'trade_physical_inspection',
            'sale_closure',
            'complaint',
            'missing_information',
            'high_intent',
          ],
          description: 'Motivo do handoff',
        },
        summary: { type: 'string', description: 'Resumo do contexto para o atendente humano' },
      },
      required: ['reason', 'summary'],
    },
  },
];

module.exports = { TOOL_DEFINITIONS };
