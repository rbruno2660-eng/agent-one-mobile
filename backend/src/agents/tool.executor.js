const { query } = require('../db/pool');
const productService = require('../services/product.service');
const conversationService = require('../services/conversation.service');
const whatsappService = require('../services/whatsapp.service');

/**
 * Executa uma tool chamada pelo agente.
 * REGRA: nenhuma tool deve executar lógica arbitrária.
 * Cada uma tem escopo fixo e retorna dados do banco.
 */
async function executeTool(toolName, input, context) {
  const { tenantId, conversationId, contactId } = context;
  const start = Date.now();

  let output;
  try {
    switch (toolName) {

      case 'search_products': {
        const filters = {
          model: input.model,
          active: true,
        };
        if (input.condition && input.condition !== 'all') filters.condition = input.condition;
        const products = await productService.listProducts(tenantId, filters);

        // Filtra por storage se informado
        const filtered = input.storage
          ? products.filter(p => p.storage?.toLowerCase().includes(input.storage.toLowerCase()))
          : products;

        output = filtered.slice(0, 10).map(p => ({
          id: p.id,
          name: `${p.model}${p.variant ? ' ' + p.variant : ''} ${p.storage || ''}`.trim(),
          condition: p.condition,
          available: (p.available || 0) > 0,
          current_price: p.current_price,
        }));
        break;
      }

      case 'get_product_price': {
        output = await productService.getProductPrice(tenantId, input.product_id, input.payment_method || 'all');
        break;
      }

      case 'check_stock': {
        const result = await query(
          `SELECT (i.quantity - i.reserved) AS available
           FROM inventory i WHERE i.product_id = $1`,
          [input.product_id]
        );
        output = result.rows.length > 0
          ? { available: result.rows[0].available > 0, quantity: result.rows[0].available }
          : { available: false, quantity: 0 };
        break;
      }

      case 'check_discount': {
        output = await productService.checkDiscount(tenantId, input.product_id, input.proposed_price);
        break;
      }

      case 'calculate_installment': {
        const priceResult = await query(
          `SELECT pp.id FROM product_prices pp
           JOIN price_books pb ON pb.id = pp.price_book_id
           WHERE pp.product_id = $1 AND pp.tenant_id = $2 AND pb.name = 'default'`,
          [input.product_id, tenantId]
        );
        if (priceResult.rows.length === 0) {
          output = { error: 'Produto sem tabela de preço configurada' };
          break;
        }
        const instResult = await query(
          `SELECT installments, installment_value, total
           FROM installments WHERE product_price_id = $1 ORDER BY installments`,
          [priceResult.rows[0].id]
        );
        output = { installments: instResult.rows };
        break;
      }

      case 'get_trade_base_value': {
        const result = await query(
          `SELECT model, storage, base_value, min_value, max_value FROM trade_rules
           WHERE tenant_id = $1 AND active = true
             AND model ILIKE $2
             ${input.storage ? 'AND (storage ILIKE $3 OR storage IS NULL)' : ''}
           ORDER BY storage NULLS LAST LIMIT 5`,
          input.storage ? [tenantId, `%${input.model}%`, `%${input.storage}%`] : [tenantId, `%${input.model}%`]
        );
        if (result.rows.length === 0) {
          output = { found: false, message: 'Modelo não encontrado na tabela de trocas. Um atendente humano fará a avaliação.' };
        } else {
          const row = result.rows[0];
          const minV = parseFloat(row.min_value || row.base_value || 0);
          const maxV = parseFloat(row.max_value || row.base_value || 0);
          output = {
            found: true,
            model: row.model,
            min_value: minV,
            max_value: maxV,
            message: minV === 0 && maxV === 0
              ? 'Este modelo não tem valor de troca cadastrado — avaliação presencial necessária.'
              : `Valor de troca: R$ ${minV.toLocaleString('pt-BR')} a R$ ${maxV.toLocaleString('pt-BR')} (sujeito a descontos conforme estado do aparelho).`,
          };
        }
        break;
      }

      case 'calculate_trade_deductions': {
        // Busca descontos por aparelho (tabela nova) ou regras genéricas como fallback
        const model = input.model || input.tenant_id; // tenant_id era usado erroneamente no campo model antes
        const deductions = [];

        if (model && model !== tenantId) {
          // Busca descontos específicos do modelo
          const deviceDeds = await query(
            `SELECT item, amount FROM trade_device_deductions
             WHERE tenant_id = $1 AND model ILIKE $2 AND active = true`,
            [tenantId, `%${model}%`]
          );

          // Mapeia os defeitos informados para os itens da tabela
          const defectMap = [];
          if (input.screen_condition && input.screen_condition !== 'perfect') {
            defectMap.push('Tela');
          }
          if (input.battery_health !== undefined && input.battery_health < 80) {
            defectMap.push('Bateria');
          }
          if (input.back_condition && input.back_condition !== 'perfect') {
            defectMap.push('Vidro traseiro');
          }
          if (input.body_condition && input.body_condition !== 'perfect') {
            defectMap.push('Carcaça');
          }

          for (const ded of deviceDeds.rows) {
            if (defectMap.some(d => ded.item.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(ded.item.toLowerCase()))) {
              deductions.push({ type: ded.item, label: ded.item, amount: parseFloat(ded.amount) });
            }
          }
        }

        // Fallback: regras genéricas (legado)
        if (deductions.length === 0) {
          const deductionRules = await query(
            `SELECT type, condition, label, amount FROM trade_deduction_rules WHERE tenant_id = $1 AND active = true`,
            [tenantId]
          );
          const rules = deductionRules.rows;
          if (input.battery_health < 80) {
            const rule = rules.find(r => r.type === 'battery' && r.condition === 'below_80');
            if (rule) deductions.push({ type: 'battery', label: rule.label, amount: parseFloat(rule.amount) });
          }
          if (input.screen_condition !== 'perfect') {
            const rule = rules.find(r => r.type === 'screen' && r.condition === input.screen_condition);
            if (rule) deductions.push({ type: 'screen', label: rule.label, amount: parseFloat(rule.amount) });
          }
          if (input.back_condition && input.back_condition !== 'perfect') {
            const rule = rules.find(r => r.type === 'back' && r.condition === input.back_condition);
            if (rule) deductions.push({ type: 'back', label: rule.label, amount: parseFloat(rule.amount) });
          }
          if (input.body_condition && input.body_condition !== 'perfect') {
            const rule = rules.find(r => r.type === 'body' && r.condition === input.body_condition);
            if (rule) deductions.push({ type: 'body', label: rule.label, amount: parseFloat(rule.amount) });
          }
        }

        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        output = { deductions, total_deductions: totalDeductions };
        break;
      }

      case 'get_services': {
        const result = await query(
          `SELECT name, description, price, min_price, warranty_days, turnaround_days, compatible_with
           FROM services
           WHERE tenant_id = $1 AND active = true
           ORDER BY name`,
          [tenantId]
        );

        const services = result.rows;
        const filtered = input.model
          ? services.filter(s =>
              !s.compatible_with || s.compatible_with.length === 0 ||
              s.compatible_with.some(m => m.toLowerCase().includes(input.model.toLowerCase().split(' ')[1] || ''))
            )
          : services;

        output = filtered.map(s => ({
          name: s.name,
          description: s.description,
          price: s.price,
          warranty_days: s.warranty_days,
          turnaround_days: s.turnaround_days,
        }));
        break;
      }

      case 'create_lead': {
        const existing = await query(
          `SELECT id FROM leads WHERE tenant_id = $1 AND contact_id = $2 AND product_id = $3 AND stage != 'lost'`,
          [tenantId, contactId, input.product_id]
        );
        if (existing.rows.length === 0) {
          await query(
            `INSERT INTO leads (tenant_id, contact_id, conversation_id, product_id, source, score, stage)
             VALUES ($1,$2,$3,$4,$5,$6,'qualifying')`,
            [tenantId, contactId, conversationId, input.product_id, input.source || 'whatsapp', 30]
          );
        }
        output = { ok: true };
        break;
      }

      case 'request_handoff': {
        await query(
          `INSERT INTO handoffs (conversation_id, tenant_id, reason, summary, status)
           VALUES ($1,$2,$3,$4,'pending')`,
          [conversationId, tenantId, input.reason, input.summary]
        );
        await conversationService.updateConversationStatus(conversationId, 'human_requested');

        // Notifica atendentes cadastrados (ou managers com phone como fallback)
        try {
          const channelResult = await query(
            `SELECT phone_id FROM channels WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
            [tenantId]
          );
          const phoneId = channelResult.rows[0]?.phone_id;

          if (phoneId) {
            // Primeiro tenta atendentes de handoff cadastrados
            let teamResult = await query(
              `SELECT name, phone FROM handoff_agents
               WHERE tenant_id = $1 AND active = TRUE
                 AND phone IS NOT NULL AND phone != ''
               ORDER BY name`,
              [tenantId]
            );
            // Fallback: managers/admins com phone cadastrado
            if (teamResult.rows.length === 0) {
              teamResult = await query(
                `SELECT name, phone FROM users
                 WHERE tenant_id = $1 AND status = 'active'
                   AND phone IS NOT NULL AND phone != ''
                   AND role IN ('owner','admin','manager')`,
                [tenantId]
              );
            }

            const reasonLabels = {
              customer_requested: 'Cliente solicitou atendente',
              commercial_exception: 'Exceção comercial',
              trade_physical_inspection: 'Avaliação física de troca',
              sale_closure: 'Fechamento de venda',
              complaint: 'Reclamação',
              missing_information: 'Informação não disponível',
              high_intent: 'Cliente com alta intenção de compra',
            };

            const notification = `🔔 *Atendimento solicitado*\n\n*Motivo:* ${reasonLabels[input.reason] || input.reason}\n\n*Contexto:* ${input.summary}\n\nAcesse a plataforma para assumir o atendimento.`;

            for (const member of teamResult.rows) {
              whatsappService.sendText(phoneId, member.phone, notification).catch(() => {});
            }
          }
        } catch { /* notificação não deve quebrar o handoff */ }

        output = { ok: true, message: 'Atendente humano acionado' };
        break;
      }

      default:
        output = { error: `Tool desconhecida: ${toolName}` };
    }
  } catch (err) {
    output = { error: err.message };
  }

  const duration = Date.now() - start;

  // Log da tool call
  try {
    await query(
      `INSERT INTO tool_calls (conversation_id, tenant_id, tool, input, output, status, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        conversationId,
        tenantId,
        toolName,
        JSON.stringify(input),
        JSON.stringify(output),
        output?.error ? 'error' : 'ok',
        duration,
      ]
    );
  } catch { /* log não deve quebrar o fluxo */ }

  return output;
}

module.exports = { executeTool };
