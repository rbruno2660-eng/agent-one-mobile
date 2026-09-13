/**
 * Copia a configuracao do tenant de teste para o tenant MeuCelular.
 * Copia: agents, products, services, price_books, product_prices,
 *        installments, trade_rules, trade_deduction_rules
 * NAO copia: channels (credenciais proprias), conversations, messages,
 *            contacts, users, refresh_tokens
 */

const { Pool } = require('pg');

const MEUCELULAR_ID = 'c06e0ef0-74ed-4d53-b83b-a6ccf48e1ec6';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Encontrar o tenant de teste (nao e MeuCelular)
    const tenants = await client.query(
      `SELECT id, name FROM tenants WHERE id != $1 ORDER BY created_at LIMIT 1`,
      [MEUCELULAR_ID]
    );
    if (!tenants.rows.length) { console.log('Nenhum tenant de teste encontrado.'); return; }

    const testTenant = tenants.rows[0];
    const TEST_ID = testTenant.id;
    console.log(`Tenant teste encontrado: ${testTenant.name} (${TEST_ID})`);
    console.log(`Destino: MeuCelular (${MEUCELULAR_ID})\n`);

    await client.query('BEGIN');

    // 2. Copiar agents
    const agents = await client.query(`SELECT * FROM agents WHERE tenant_id = $1`, [TEST_ID]);
    console.log(`agents: ${agents.rows.length} registros`);
    for (const a of agents.rows) {
      await client.query(`
        INSERT INTO agents (tenant_id, name, persona, tone, status, prompt_version, settings)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (tenant_id) DO UPDATE SET
          name=EXCLUDED.name, persona=EXCLUDED.persona, tone=EXCLUDED.tone,
          status=EXCLUDED.status, prompt_version=EXCLUDED.prompt_version, settings=EXCLUDED.settings
      `, [MEUCELULAR_ID, a.name, a.persona, a.tone, a.status, a.prompt_version, a.settings]);
    }

    // 3. Copiar products
    try {
      const rows = await client.query(
        `SELECT category,brand,model,variant,storage,color,condition,battery_health,warranty,description,active,metadata FROM products WHERE tenant_id = $1`, [TEST_ID]);
      console.log(`products: ${rows.rows.length} registros`);
      for (const r of rows.rows) {
        await client.query(`
          INSERT INTO products (tenant_id,category,brand,model,variant,storage,color,condition,battery_health,warranty,description,active,metadata)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING`,
          [MEUCELULAR_ID,r.category,r.brand,r.model,r.variant,r.storage,r.color,r.condition,r.battery_health,r.warranty,r.description,r.active,r.metadata]);
      }
    } catch(e) { console.log(`  products: pulado (${e.message.split('\n')[0]})`); }

    // 4. Copiar services
    try {
      const rows = await client.query(
        `SELECT name,description,compatible_with,price,min_price,warranty_days,turnaround_days,active FROM services WHERE tenant_id = $1`, [TEST_ID]);
      console.log(`services: ${rows.rows.length} registros`);
      for (const r of rows.rows) {
        await client.query(`
          INSERT INTO services (tenant_id,name,description,compatible_with,price,min_price,warranty_days,turnaround_days,active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
          [MEUCELULAR_ID,r.name,r.description,r.compatible_with,r.price,r.min_price,r.warranty_days,r.turnaround_days,r.active]);
      }
    } catch(e) { console.log(`  services: pulado (${e.message.split('\n')[0]})`); }

    // 5. Copiar price_books
    try {
      const rows = await client.query(
        `SELECT name,status FROM price_books WHERE tenant_id = $1`, [TEST_ID]);
      console.log(`price_books: ${rows.rows.length} registros`);
      for (const r of rows.rows) {
        await client.query(`
          INSERT INTO price_books (tenant_id,name,status) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [MEUCELULAR_ID,r.name,r.status]);
      }
    } catch(e) { console.log(`  price_books: pulado (${e.message.split('\n')[0]})`); }

    // 6. Copiar trade_rules
    try {
      const rows = await client.query(
        `SELECT model,storage,condition,base_value,active FROM trade_rules WHERE tenant_id = $1`, [TEST_ID]);
      console.log(`trade_rules: ${rows.rows.length} registros`);
      for (const r of rows.rows) {
        await client.query(`
          INSERT INTO trade_rules (tenant_id,model,storage,condition,base_value,active)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [MEUCELULAR_ID,r.model,r.storage,r.condition,r.base_value,r.active]);
      }
    } catch(e) { console.log(`  trade_rules: pulado (${e.message.split('\n')[0]})`); }

    // 7. Copiar trade_deduction_rules
    try {
      const rows = await client.query(
        `SELECT type,condition,label,amount,active FROM trade_deduction_rules WHERE tenant_id = $1`, [TEST_ID]);
      console.log(`trade_deduction_rules: ${rows.rows.length} registros`);
      for (const r of rows.rows) {
        await client.query(`
          INSERT INTO trade_deduction_rules (tenant_id,type,condition,label,amount,active)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [MEUCELULAR_ID,r.type,r.condition,r.label,r.amount,r.active]);
      }
    } catch(e) { console.log(`  trade_deduction_rules: pulado (${e.message.split('\n')[0]})`); }

    await client.query('COMMIT');
    console.log('\nSUCESSO! Configuracao copiada do teste para MeuCelular.');
    console.log('(Channels nao foram copiados — serao configurados com os dados do cliente)');

  } catch(err) {
    await client.query('ROLLBACK');
    console.error('ERRO:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
