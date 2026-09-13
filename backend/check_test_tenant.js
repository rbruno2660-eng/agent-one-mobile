const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  // Listar todos os tenants
  const tenants = await pool.query(`SELECT id, name, niche, status, created_at FROM tenants ORDER BY created_at`);
  console.log('=== TENANTS ===');
  tenants.rows.forEach(t => console.log(JSON.stringify(t)));

  // Para cada tenant, contar registros nas principais tabelas
  for (const t of tenants.rows) {
    console.log(`\n--- Tenant: ${t.name} (${t.id}) ---`);
    const tables = ['users','channels','agents','contacts','conversations','messages','products','services'];
    for (const tbl of tables) {
      try {
        const r = await pool.query(`SELECT COUNT(*) FROM ${tbl} WHERE tenant_id = $1`, [t.id]);
        console.log(`  ${tbl}: ${r.rows[0].count}`);
      } catch(e) { /* tabela sem tenant_id */ }
    }
  }

  await pool.end();
}

run().catch(console.error);
