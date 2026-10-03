/**
 * Script one-shot para registrar o número WhatsApp na Cloud API
 * e tirar do status "Pendente" no Meta Business Suite.
 *
 * Uso: node register_phone_now.js
 */

const { Pool } = require('pg');

// ── Config ────────────────────────────────────────────────────────────────────
const DB_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const PHONE_ID = '1257384394132266'; // ID do número +55 12 95371-1566
const PIN = '000000';               // PIN 2FA de 6 dígitos (número novo = qualquer valor)
// ──────────────────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // 1. Busca o token de acesso salvo no canal
  const res = await pool.query(
    `SELECT t.name, c.phone_id, c.phone_number, c.settings
     FROM channels c
     JOIN tenants t ON t.id = c.tenant_id
     WHERE c.phone_id = $1 LIMIT 1`,
    [PHONE_ID]
  );

  if (!res.rows.length) {
    console.error('❌ Nenhum canal encontrado com phone_id:', PHONE_ID);
    console.log('💡 Se o número ainda não foi salvo no canal, rode primeiro o /activate do superadmin.');
    await pool.end();
    return;
  }

  const { name, phone_id, phone_number, settings } = res.rows[0];
  const access_token = settings?.access_token;

  if (!access_token) {
    console.error('❌ Token de acesso não encontrado no banco. Salve o whatsapp_token via /activate primeiro.');
    await pool.end();
    return;
  }

  console.log(`📱 Registrando ${phone_number} (${phone_id}) — Tenant: ${name}`);

  // 2. Chama a API de registro da Meta
  const resp = await fetch(`https://graph.facebook.com/v18.0/${phone_id}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      pin: PIN,
    }),
  });

  const data = await resp.json();

  if (resp.ok) {
    console.log('✅ Número registrado com sucesso!');
    console.log('   Atualize o Meta Business Suite — o status deve mudar de "Pendente" para ativo.');
    console.log('   Resposta Meta:', JSON.stringify(data));
  } else {
    console.error('❌ Erro na API da Meta:');
    console.error(JSON.stringify(data, null, 2));

    if (data?.error?.code === 100 && data?.error?.error_subcode === 2494010) {
      console.log('\n💡 Este erro significa que o número precisa de verificação por SMS/voz.');
      console.log('   Acesse business.facebook.com → WhatsApp → Números de telefone → Verificar');
    }
    if (data?.error?.code === 190) {
      console.log('\n💡 Token expirado. Gere um novo token de acesso permanente no Meta para Apps.');
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  pool.end();
});
