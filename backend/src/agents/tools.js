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
    description: 'Calcula os descontos de troca baseado no modelo e no estado do aparelho. Use após get_trade_base_value, passando o modelo exato retornado.',
    input_schema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Modelo exato do aparelho (ex: iPhone 14 Pro)' },
        battery_health: { type: 'number', description: 'Percentual de saúde da bateria (0-100)' },
        screen_condition: { type: 'string', enum: ['perfect', 'scratched', 'cracked', 'replaced'], description: 'Estado da tela' },
        back_condition: { type: 'string', enum: ['perfect', 'cracked'], description: 'Estado da traseira' },
        body_condition: { type: 'string', enum: ['perfect', 'damaged'], description: 'Estado da carcaça' },
      },
      required: ['model', 'battery_health', 'screen_condition'],
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
    name: 'send_product_media',
    description: 'Envia a foto de um produto diretamente no WhatsApp do cliente. Use após search_products quando quiser mostrar o aparelho visualmente. Envie no máximo 3 fotos por interação.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'UUID do produto' },
        caption: { type: 'string', description: 'Legenda curta para a foto (ex: iPhone 14 Pro 128GB - Space Black)' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'compare_products',
    description: 'Compara dois modelos de iPhone lado a lado: specs técnicos e preços reais da loja. Use quando o cliente perguntar a diferença entre modelos.',
    input_schema: {
      type: 'object',
      properties: {
        model_a: { type: 'string', description: 'Primeiro modelo (ex: iPhone 13)' },
        model_b: { type: 'string', description: 'Segundo modelo (ex: iPhone 14)' },
        storage: { type: 'string', description: 'Armazenamento para comparar preços (ex: 128GB). Se omitido, usa o mais barato disponível.' },
      },
      required: ['model_a', 'model_b'],
    },
  },
  {
    name: 'get_available_slots',
    description: 'Retorna os horários disponíveis para agendamento de visita nos próximos dias. Use quando o cliente quiser agendar uma visita à loja, reparo ou avaliação de troca presencial.',
    input_schema: {
      type: 'object',
      properties: {
        days_ahead: {
          type: 'number',
          description: 'Quantos dias à frente verificar (padrão: 3, máximo: 7)',
        },
        service_type: {
          type: 'string',
          enum: ['store_visit', 'repair', 'trade_in'],
          description: 'Tipo de atendimento desejado',
        },
      },
    },
  },
  {
    name: 'book_appointment',
    description: 'Agenda uma visita presencial do cliente à loja. Use apenas após o cliente confirmar o horário retornado por get_available_slots.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Data do agendamento no formato YYYY-MM-DD (ex: 2026-10-15)',
        },
        time: {
          type: 'string',
          description: 'Horário no formato HH:MM (ex: 14:30)',
        },
        service_type: {
          type: 'string',
          enum: ['store_visit', 'repair', 'trade_in', 'other'],
          description: 'Tipo de atendimento',
        },
        notes: {
          type: 'string',
          description: 'Observações adicionais (ex: trazer nota fiscal, iPhone 13 para reparo)',
        },
      },
      required: ['date', 'time', 'service_type'],
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
