const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const client = await pool.connect();
  try {
    const before = await client.query('SELECT id, name, email, phone, role, status FROM users');
    console.log('Users ANTES:');
    console.log(JSON.stringify(before.rows, null, 2));

    const upd = await client.query(
      "UPDATE users SET phone='5512982911895' WHERE role IN ('owner','admin') AND status='active'"
    );
    console.log('\nRows updated:', upd.rowCount);

    const after = await client.query('SELECT id, name, email, phone, role FROM users WHERE status=\'active\'');
    console.log('\nUsers DEPOIS:');
    console.log(JSON.stringify(after.rows, null, 2));

    console.log('\nSUCESSO! Numero cadastrado: 5512982911895');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
