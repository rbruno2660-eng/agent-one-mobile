const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const tenants = await pool.query(`SELECT id, name, status FROM tenants ORDER BY created_at DESC`);
  console.log('\n=== TENANTS ===');
  tenants.rows.forEach(t => console.log(`ID: ${t.id} | Nome: ${t.name} | Status: ${t.status}`));

  const channels = await pool.query(`SELECT tenant_id, phone_id, phone_number, status FROM channels`);
  console.log('\n=== CHANNELS ===');
  if (channels.rows.length === 0) console.log('Nenhum canal cadastrado ainda.');
  else channels.rows.forEach(c => console.log(`Tenant: ${c.tenant_id} | Phone: ${c.phone_number} | ID: ${c.phone_id} | Status: ${c.status}`));

  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
