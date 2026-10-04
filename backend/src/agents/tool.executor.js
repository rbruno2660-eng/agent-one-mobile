const { query } = require('../db/pool');
const productService = require('../services/product.service');
const conversationService = require('../services/conversation.service');
const whatsappService = require('../services/whatsapp.service');

/**
 * Specs técnicos dos iPhones mais comuns.
 * Usado pelo compare_products para gerar comparações sem banco.
 */
const IPHONE_SPECS = {
  'iphone 11': { chip: 'A13 Bionic', camera: 'Dupla 12MP', display: 'LCD 6.1"', battery: '3110mAh', face_id: true, usb_c: false, dynamic_island: false },
  'iphone 12': { chip: 'A14 Bionic', camera: 'Dupla 12MP, modo noturno', display: 'OLED 6.1"', battery: '2815mAh', face_id: true, usb_c: false, dynamic_island: false },
  'iphone 12 pro': { chip: 'A14 Bionic', camera: 'Tripla 12MP, teleobjetiva, LiDAR', display: 'OLED 6.1"', battery: '2815mAh', face_id: true, usb_c: false, dynamic_island: false },
  'iphone 13': { chip: 'A15 Bionic', camera: 'Dupla 12MP, modo cinematográfico', display: 'OLED 6.1" 60Hz', battery: '3227mAh', face_id: true, usb_c: false, dynamic_island: false },
  'iphone 13 pro': { chip: 'A15 Bionic', camera: 'Tripla 12MP, macro, teleobjetiva 3x', display: 'OLED 6.1" ProMotion 120Hz', battery: '3095mAh', face_id: true, usb_c: false, dynamic_island: false },
  'iphone 14': { chip: 'A15 Bionic', camera: 'Dupla 12MP, modo ação', display: 'OLED 6.1" 60Hz', battery: '3279mAh', face_id: true, usb_c: false, dynamic_island: false },
  'iphone 14 pro': { chip: 'A16 Bionic', camera: 'Tripla 48MP, teleobjetiva 3x', display: 'OLED 6.1" ProMotion 120Hz', battery: '3200mAh', face_id: true, usb_c: false, dynamic_island: true },
  'iphone 15': { chip: 'A16 Bionic', camera: 'Dupla 48MP', display: 'OLED 6.1" 60Hz', battery: '3349mAh', face_id: true, usb_c: true, dynamic_island: true },
  'iphone 15 pro': { chip: 'A17 Pro', camera: 'Tripla 48MP, teleobjetiva 3x, titânio', display: 'OLED 6.1" ProMotion 120Hz', battery: '3274mAh', face_id: true, usb_c: true, dynamic_island: true },
  'iphone 16': { chip: 'A18', camera: 'Dupla 48MP, botão Camera Control', display: 'OLED 6.1" 60Hz', battery: '3561mAh', face_id: true, usb_c: true, dynamic_island: true },
  'iphone 16 pro': { chip: 'A18 Pro', camera: 'Tripla 48MP, teleobjetiva 5x, Apple Intelligence', display: 'OLED 6.3" ProMotion 120Hz', battery: '3582mAh', face_id: true, usb_c: true, dynamic_island: true },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida que um valor é um UUID bem-formado.
 * Lança TypeError com mensagem segura caso contrário.
 */
function assertUUID(value, fieldName) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new TypeError(`Campo '${fieldName}' deve ser um UUID válido`);
  }
}

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
        assertUUID(input.product_id, 'product_id');
        output = await productService.getProductPrice(tenantId, input.product_id, input.payment_method || 'all');
        break;
      }

      case 'check_stock': {
        assertUUID(input.product_id, 'product_id');
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
        assertUUID(input.product_id, 'product_id');
        output = await productService.checkDiscount(tenantId, input.product_id, input.proposed_price);
        break;
      }

      case 'calculate_installment': {
        assertUUID(input.product_id, 'product_id');
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
             AND ($3::text IS NULL OR storage ILIKE $3)
           ORDER BY storage NULLS LAST LIMIT 5`,
          [tenantId, `%${input.model}%`, input.storage ? `%${input.storage}%` : null]
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
        assertUUID(input.product_id, 'product_id');
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

      case 'send_product_media': {
        assertUUID(input.product_id, 'product_id');

        // Busca image_url do produto
        const mediaResult = await query(
          `SELECT p.brand || ' ' || p.model AS name, p.storage, p.image_url,
                  ch.phone_id, ch.settings
           FROM products p
           CROSS JOIN channels ch
           WHERE p.id = $1 AND p.tenant_id = $2
             AND ch.tenant_id = $2 AND ch.status = 'active'
           LIMIT 1`,
          [input.product_id, tenantId]
        );

        if (!mediaResult.rows.length) {
          output = { ok: false, error: 'Produto não encontrado' };
          break;
        }

        const mediaRow = mediaResult.rows[0];

        if (!mediaRow.image_url) {
          output = { ok: false, error: 'Produto sem foto cadastrada' };
          break;
        }

        // Busca telefone do contato
        const contactResult = await query(
          `SELECT phone FROM contacts WHERE id = $1`,
          [contactId]
        );
        if (!contactResult.rows.length || !contactResult.rows[0].phone) {
          output = { ok: false, error: 'Contato sem número de telefone' };
          break;
        }

        const { phone } = contactResult.rows[0];
        const { phone_id: phoneId, settings } = mediaRow;
        const token = settings?.access_token || null;
        const caption = input.caption || `${mediaRow.name}${mediaRow.storage ? ' ' + mediaRow.storage : ''}`;

        await whatsappService.sendImage(phoneId, phone, mediaRow.image_url, caption, token);
        output = { ok: true, sent_to: phone, image_url: mediaRow.image_url };
        break;
      }

      case 'compare_products': {
        const modelAKey = input.model_a.toLowerCase().trim();
        const modelBKey = input.model_b.toLowerCase().trim();

        // Busca specs estáticos
        const specsA = IPHONE_SPECS[modelAKey] || null;
        const specsB = IPHONE_SPECS[modelBKey] || null;

        // Busca preços reais da loja para cada modelo
        async function getPriceForModel(model, storage) {
          const filters = { model, active: true };
          const products = await productService.listProducts(tenantId, filters);
          let filtered = products;
          if (storage) filtered = products.filter(p => p.storage?.toLowerCase().includes(storage.toLowerCase()));
          if (filtered.length === 0) filtered = products; // fallback sem storage
          if (filtered.length === 0) return null;
          // Pega o mais barato disponível
          const sorted = filtered.sort((a, b) => (a.current_price || 999999) - (b.current_price || 999999));
          return sorted[0];
        }

        const storage = input.storage || null;
        const [productA, productB] = await Promise.all([
          getPriceForModel(input.model_a, storage),
          getPriceForModel(input.model_b, storage),
        ]);

        output = {
          model_a: {
            name: input.model_a,
            specs: specsA,
            store_price: productA ? {
              id: productA.id,
              storage: productA.storage,
              price: productA.current_price,
              available: (productA.available || 0) > 0,
            } : null,
          },
          model_b: {
            name: input.model_b,
            specs: specsB,
            store_price: productB ? {
              id: productB.id,
              storage: productB.storage,
              price: productB.current_price,
              available: (productB.available || 0) > 0,
            } : null,
          },
          note: !specsA && !specsB
            ? 'Specs técnicos não encontrados para estes modelos. Use apenas os preços da loja.'
            : null,
        };
        break;
      }

      case 'get_available_slots': {
        const daysAhead = Math.min(Math.max(input.days_ahead || 3, 1), 7);

        // Horários de funcionamento padrão: 09:00–18:00, Segunda a Sábado
        // Slots de 30 em 30 minutos
        const OPEN_HOUR = 9;
        const CLOSE_HOUR = 18;
        const SLOT_MINUTES = 30;

        // Busca agendamentos já existentes para evitar conflitos
        const booked = await query(`
          SELECT scheduled_date::text, scheduled_time::text
          FROM appointments
          WHERE tenant_id = $1
            AND status IN ('pending', 'confirmed')
            AND scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2
        `, [tenantId, daysAhead]);

        const bookedSet = new Set(
          booked.rows.map(r => `${r.scheduled_date}|${r.scheduled_time.slice(0, 5)}`)
        );

        const slots = [];
        const now = new Date();

        for (let d = 1; d <= daysAhead; d++) {
          const date = new Date(now);
          date.setDate(date.getDate() + d);

          const dayOfWeek = date.getDay(); // 0=Dom, 6=Sab
          if (dayOfWeek === 0) continue; // fecha domingo

          const dateStr = date.toISOString().slice(0, 10);
          const daySlots = [];

          for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
            for (let m = 0; m < 60; m += SLOT_MINUTES) {
              const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              const key = `${dateStr}|${timeStr}`;
              if (!bookedSet.has(key)) {
                daySlots.push(timeStr);
              }
            }
          }

          if (daySlots.length > 0) {
            const dateLabel = date.toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: '2-digit',
            });
            slots.push({ date: dateStr, label: dateLabel, available_times: daySlots });
          }
        }

        output = {
          slots,
          service_type: input.service_type || 'store_visit',
          note: slots.length === 0
            ? 'Nenhum horário disponível no período. Tente um período maior.'
            : `${slots.reduce((a, s) => a + s.available_times.length, 0)} horários disponíveis`,
        };
        break;
      }

      case 'book_appointment': {
        // Valida data e hora
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!dateRegex.test(input.date)) {
          output = { error: 'Formato de data inválido. Use YYYY-MM-DD.' };
          break;
        }
        if (!timeRegex.test(input.time)) {
          output = { error: 'Formato de horário inválido. Use HH:MM.' };
          break;
        }

        // Verifica conflito
        const conflict = await query(`
          SELECT id FROM appointments
          WHERE tenant_id = $1
            AND scheduled_date = $2
            AND scheduled_time = $3
            AND status IN ('pending', 'confirmed')
          LIMIT 1
        `, [tenantId, input.date, input.time]);

        if (conflict.rows.length > 0) {
          output = {
            ok: false,
            error: 'Horário já reservado. Por favor, escolha outro horário.',
          };
          break;
        }

        const result = await query(`
          INSERT INTO appointments
            (tenant_id, contact_id, conversation_id, scheduled_date, scheduled_time,
             service_type, notes, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
          RETURNING id, scheduled_date::text, scheduled_time::text, service_type, status
        `, [
          tenantId,
          contactId,
          conversationId,
          input.date,
          input.time,
          input.service_type || 'store_visit',
          input.notes || null,
        ]);

        const apt = result.rows[0];
        const dateLabel = new Date(apt.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long', day: '2-digit', month: '2-digit',
        });

        const serviceLabels = {
          store_visit: 'Visita à loja',
          repair:      'Serviço de reparo',
          trade_in:    'Avaliação de troca',
          other:       'Atendimento',
        };

        output = {
          ok: true,
          appointment_id: apt.id,
          message: `✅ Agendamento confirmado!\n📅 ${dateLabel} às ${apt.scheduled_time.slice(0, 5)}\n📋 ${serviceLabels[apt.service_type] || apt.service_type}`,
          date: apt.scheduled_date,
          time: apt.scheduled_time.slice(0, 5),
          service_type: apt.service_type,
          note: 'Você receberá um lembrete amanhã 24h antes do agendamento.',
        };
        break;
      }

      case 'request_handoff': {
        await query(
          `INSERT INTO handoffs (conversation_id, tenant_id, reason, summary, status)
           VALUES ($1,$2,$3,$4,'pending')`,
          [conversationId, tenantId, input.reason, input.summary]
        );
        await conversationService.updateConversationStatus(conversationId, tenantId, 'human_requested');

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
