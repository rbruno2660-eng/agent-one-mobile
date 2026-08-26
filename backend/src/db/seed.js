require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('./pool');

async function seed() {
  console.log('🌱 Rodando seed inicial...');

  try {
    // Tenant principal
    const tenantResult = await query(`
      INSERT INTO tenants (name, niche, timezone)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, ['Minha Loja de iPhones', 'mobile_store', 'America/Sao_Paulo']);

    let tenantId;
    if (tenantResult.rows.length === 0) {
      const existing = await query(`SELECT id FROM tenants LIMIT 1`);
      tenantId = existing.rows[0].id;
    } else {
      tenantId = tenantResult.rows[0].id;
    }

    console.log(`✅ Tenant: ${tenantId}`);

    // Usuário owner
    const passwordHash = await bcrypt.hash('Admin@2025', 12);
    const userResult = await query(`
      INSERT INTO users (tenant_id, name, email, password, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tenant_id, email) DO NOTHING
      RETURNING id
    `, [tenantId, 'Administrador', 'admin@loja.com', passwordHash, 'owner']);

    if (userResult.rows.length > 0) {
      console.log(`✅ Usuário owner criado: admin@loja.com / Admin@2025`);
    } else {
      console.log(`ℹ️  Usuário owner já existe`);
    }

    // Price book padrão
    const pbResult = await query(`
      INSERT INTO price_books (tenant_id, name, status)
      VALUES ($1, 'default', 'active')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [tenantId]);

    if (pbResult.rows.length > 0) {
      console.log(`✅ Price book padrão criado`);
    }

    // Agent padrão
    await query(`
      INSERT INTO agents (tenant_id, name, persona, tone)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tenant_id) DO NOTHING
    `, [tenantId, 'Agent One', 'Assistente especializado em iPhones, atencioso e objetivo.', 'professional']);

    console.log(`✅ Agent padrão criado`);

    // Subscription trial
    await query(`
      INSERT INTO subscriptions (tenant_id, plan, status, trial_ends_at)
      VALUES ($1, 'starter', 'trial', NOW() + INTERVAL '30 days')
      ON CONFLICT DO NOTHING
    `, [tenantId]);

    console.log(`✅ Subscription trial (30 dias) criada`);

    console.log('\n🎉 Seed concluído!');
    console.log('Login: admin@loja.com | Senha: Admin@2025');

  } catch (err) {
    console.error('❌ Erro no seed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
