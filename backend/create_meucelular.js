const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DB = 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Criar tenant MeuCelular
    const tenantRes = await client.query(`
      INSERT INTO tenants (name, niche, status, timezone)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['MeuCelular', 'mobile_store', 'active', 'America/Sao_Paulo']);

    const tenantId = tenantRes.rows[0].id;
    console.log('Tenant criado:', tenantId);

    // 2. Hash da senha
    const passwordHash = await bcrypt.hash('MeuCelular@2026', 12);

    // 3. Criar usuário owner
    const userRes = await client.query(`
      INSERT INTO users (tenant_id, name, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, role
    `, [tenantId, 'MeuCelular', 'financeiro@meucelular.com', passwordHash, 'owner', 'active']);

    console.log('Usuário criado:', JSON.stringify(userRes.rows[0]));

    await client.query('COMMIT');
    console.log('\nSUCESSO! Cliente 1 — MeuCelular criado.');
    console.log('Tenant ID:', tenantId);
    console.log('Login: financeiro@meucelular.com');
    console.log('Senha: MeuCelular@2026');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERRO:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
