/**
 * Serviço de lembretes de agendamento.
 *
 * Cron a cada 1 hora: busca agendamentos para amanhã
 * que ainda não receberam lembrete e envia WhatsApp ao contato.
 *
 * Esquema: appointments.reminder_sent = TRUE após envio.
 */

const { query } = require('../db/pool');
const whatsappService = require('./whatsapp.service');

const SERVICE_LABELS = {
  store_visit: 'visita à loja',
  repair:      'serviço de reparo',
  trade_in:    'avaliação de troca',
  other:       'atendimento',
};

/**
 * Executa um ciclo de lembretes para todos os tenants.
 */
async function runReminderCycle() {
  console.log('[AppointmentReminder] Iniciando ciclo...');

  try {
    // Busca agendamentos para amanhã sem lembrete enviado
    const result = await query(`
      SELECT
        a.id,
        a.tenant_id,
        a.scheduled_date,
        a.scheduled_time,
        a.service_type,
        a.notes,
        c.phone   AS contact_phone,
        c.name    AS contact_name,
        ch.phone_id,
        ch.settings->>'access_token' AS access_token
      FROM appointments a
      JOIN contacts c   ON c.id = a.contact_id
      JOIN channels ch  ON ch.tenant_id = a.tenant_id AND ch.status = 'active'
      WHERE a.status = 'pending'
        AND a.reminder_sent = FALSE
        AND a.scheduled_date = CURRENT_DATE + INTERVAL '1 day'
      ORDER BY a.scheduled_date, a.scheduled_time
    `);

    const appointments = result.rows;
    console.log(`[AppointmentReminder] ${appointments.length} lembretes a enviar`);

    let sent = 0;
    let errors = 0;

    for (const apt of appointments) {
      try {
        const dateFormatted = new Date(apt.scheduled_date).toLocaleDateString('pt-BR', {
          weekday: 'long', day: '2-digit', month: '2-digit',
        });
        const timeFormatted = String(apt.scheduled_time).slice(0, 5);
        const serviceLabel = SERVICE_LABELS[apt.service_type] || 'atendimento';

        const nome = apt.contact_name ? apt.contact_name.split(' ')[0] : 'Cliente';

        const msg = `🗓️ *Lembrete do seu agendamento*\n\n` +
          `Olá, ${nome}! Lembrando do seu agendamento *amanhã*:\n\n` +
          `📅 *Data:* ${dateFormatted}\n` +
          `⏰ *Horário:* ${timeFormatted}\n` +
          `📋 *Tipo:* ${serviceLabel}\n` +
          (apt.notes ? `💬 *Obs:* ${apt.notes}\n` : '') +
          `\nSe precisar remarcar, é só avisar! 😊`;

        await whatsappService.sendText(
          apt.phone_id,
          apt.contact_phone,
          msg,
          apt.access_token
        );

        // Marca lembrete como enviado
        await query(
          `UPDATE appointments SET reminder_sent = TRUE, updated_at = NOW() WHERE id = $1`,
          [apt.id]
        );

        sent++;
      } catch (err) {
        console.error(`[AppointmentReminder] Erro no agendamento ${apt.id}:`, err.message);
        errors++;
      }
    }

    console.log(`[AppointmentReminder] Ciclo concluído: ${sent} enviados, ${errors} erros`);
  } catch (err) {
    console.error('[AppointmentReminder] Erro no ciclo:', err.message);
  }
}

module.exports = { runReminderCycle };
