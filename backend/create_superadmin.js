/**
 * Cria o usuário super admin da plataforma Agent One.
 * Roda uma única vez após a migration.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

const SUPERADMIN_NAME  = 'Rafael Bruno';
const SUPERADMIN_EMAIL = 'rbruno2660@gmail.com';
const SUPERADMIN_PASS  = 'AgentOne@SuperAdmin2026';

async function run() {
  const client = await pool.connect();
  try {
    // Verificar se já existe
    const existing = await client.query(
      `SELECT id FROM users WHERE email = $1 AND is_superadmin = true`,
      [SUPERADMIN_EMAIL]
    );
    if (existing.rows.length > 0) {
      console.log('⚠️  Superadmin já existe:', existing.rows[0].id);
      return;
    }

    const hash = await bcrypt.hash(SUPERADMIN_PASS, 12);

    const result = await client.query(`
      INSERT INTO users (tenant_id, name, email, password, role, is_superadmin, status)
      VALUES (NULL, $1, $2, $3, 'owner', true, 'active')
      RETURNING id
    `, [SUPERADMIN_NAME, SUPERADMIN_EMAIL, hash]);

    console.log('✅ Superadmin criado!');
    console.log('   ID:', result.rows[0].id);
    console.log('   Email:', SUPERADMIN_EMAIL);
    console.log('   Senha:', SUPERADMIN_PASS);
    console.log('\n⚠️  Guarde a senha em local seguro e delete este arquivo em produção.');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
