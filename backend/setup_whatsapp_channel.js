/**
 * Setup completo do canal WhatsApp para o Agent One
 *
 * Uso: node setup_whatsapp_channel.js SEU_TOKEN_AQUI
 *
 * O token fica em: developers.facebook.com → seu App → WhatsApp → Configuração da API
 */

const { Pool } = require('pg');

const DB_URL = 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const PHONE_ID     = '1257384394132266';
const PHONE_NUMBER = '+5512953711566';
const PIN          = '000000';

const token = process.argv[2];
if (!token || token.length < 20) {
  console.error('❌ Passe o token do WhatsApp como argumento:');
  console.error('   node setup_whatsapp_channel.js EAAxxxxxxxxxx...');
  process.exit(1);
}

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // 1. Busca ou cria tenant MeuCelular
  let tenantId;
  const existing = await pool.query(`SELECT id FROM tenants WHERE name ILIKE '%meucelular%' OR name ILIKE '%agent%one%' LIMIT 1`);
  if (existing.rows.length > 0) {
    tenantId = existing.rows[0].id;
    console.log(`✅ Tenant encontrado: ${tenantId}`);
  } else {
    // Lista todos os tenants
    const all = await pool.query(`SELECT id, name FROM tenants ORDER BY created_at DESC LIMIT 5`);
    if (all.rows.length > 0) {
      tenantId = all.rows[0].id;
      console.log(`✅ Usando tenant mais recente: ${all.rows[0].name} (${tenantId})`);
    } else {
      // Cria tenant do zero
      const res = await pool.query(
        `INSERT INTO tenants (name, niche, status) VALUES ('MeuCelular', 'mobile_store', 'active') RETURNING id`
      );
      tenantId = res.rows[0].id;
      console.log(`✅ Tenant criado: ${tenantId}`);
    }
  }

  // 2. Upsert canal WhatsApp
  const channelExists = await pool.query(`SELECT id FROM channels WHERE phone_id = $1 LIMIT 1`, [PHONE_ID]);
  if (channelExists.rows.length > 0) {
    await pool.query(
      `UPDATE channels SET tenant_id = $1, status = 'active', settings = settings || $2::jsonb, updated_at = NOW() WHERE phone_id = $3`,
      [tenantId, JSON.stringify({ access_token: token }), PHONE_ID]
    );
    console.log(`✅ Canal atualizado com o novo token`);
  } else {
    await pool.query(
      `INSERT INTO channels (tenant_id, provider, phone_id, phone_number, status, settings)
       VALUES ($1, 'whatsapp', $2, $3, 'active', $4::jsonb)`,
      [tenantId, PHONE_ID, PHONE_NUMBER, JSON.stringify({ access_token: token })]
    );
    console.log(`✅ Canal criado para ${PHONE_NUMBER}`);
  }

  // 3. Cria agente Sofia se não existir
  const agentExists = await pool.query(`SELECT id FROM agents WHERE tenant_id = $1`, [tenantId]);
  if (!agentExists.rows.length) {
    await pool.query(
      `INSERT INTO agents (tenant_id, name, persona, tone, status) VALUES ($1, 'Sofia', 'Atendente virtual especialista em celulares e acessórios', 'professional', 'active')`,
      [tenantId]
    );
    console.log(`✅ Agente Sofia criada`);
  }

  // 4. Registra na WhatsApp Cloud API
  console.log(`\n📱 Registrando ${PHONE_NUMBER} na Meta Cloud API...`);
  const resp = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', pin: PIN }),
  });
  const data = await resp.json();

  if (resp.ok) {
    console.log('✅ SUCESSO! Número registrado na Cloud API.');
    console.log('   O status no Meta Business Suite deve mudar de "Pendente" para ativo.');
  } else {
    console.error('❌ Erro na API da Meta:', JSON.stringify(data, null, 2));
    if (data?.error?.code === 190) console.log('\n💡 Token expirado — gere um novo token permanente no Meta.');
    if (data?.error?.code === 100 && data?.error?.error_subcode === 2494010)
      console.log('\n💡 Verificação por SMS/voz necessária: business.facebook.com → WhatsApp → Números de telefone → Verificar');
  }

  await pool.end();
}

main().catch(e => { console.error('Erro:', e.message); pool.end(); });
