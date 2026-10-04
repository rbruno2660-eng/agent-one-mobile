const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Usa a mesma connection string do projeto
const DB = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_zWa29qphmlXi@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // Acha o tenant MeuCelular
    const tenantRes = await client.query(
      "SELECT id, name FROM tenants WHERE name ILIKE '%meucelular%' LIMIT 1"
    );

    if (tenantRes.rows.length === 0) {
      console.error('Tenant MeuCelular não encontrado.');
      return;
    }

    const tenant = tenantRes.rows[0];
    console.log(`Tenant: ${tenant.name} (${tenant.id})`);

    // Busca todos os documentos de conhecimento
    const docsRes = await client.query(
      `SELECT id, title, type, status, content, created_at, updated_at
       FROM knowledge_documents
       WHERE tenant_id = $1
       ORDER BY type, title`,
      [tenant.id]
    );

    console.log(`Encontrados ${docsRes.rows.length} documentos.`);

    // Exporta como JSON
    const output = {
      tenant: tenant.name,
      exported_at: new Date().toISOString(),
      documents: docsRes.rows
    };

    const outPath = path.join(__dirname, 'knowledge_meucelular.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\nExportado para: ${outPath}`);

    // Mostra resumo
    const byType = {};
    docsRes.rows.forEach(d => {
      byType[d.type] = (byType[d.type] || 0) + 1;
    });
    console.log('\nResumo por tipo:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} doc(s)`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => console.error('Erro:', err.message));
