/**
 * Migration: adiciona suporte a super admin
 * - users.tenant_id → nullable
 * - users.is_superadmin BOOLEAN
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Tornar tenant_id nullable
    await client.query(`
      ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL
    `);
    console.log('✅ tenant_id agora é nullable');

    // 2. Adicionar coluna is_superadmin (idempotente)
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false
    `);
    console.log('✅ Coluna is_superadmin adicionada');

    // 3. Índice único de email para superadmins
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_superadmin_email_idx
        ON users (email)
        WHERE is_superadmin = true
    `);
    console.log('✅ Índice único de email para superadmin criado');

    await client.query('COMMIT');
    console.log('\n✅ Migration concluída com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
