/**
 * Fix: migrates user ea5639bb from ghost tenant c881b2e0 to real tenant bcf0cb7b
 * Run: node fix_tenant.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require',
});

async function main() {
  const GHOST_TENANT = 'c881b2e0-3526-48ad-8a76-56d4af15e13c';
  const REAL_TENANT  = 'bcf0cb7b-97be-4621-90d5-b03955c488af';
  const USER_ID      = 'ea5639bb-9b46-48b3-b3d2-03a5e18b01c5';

  // Show current state
  const before = await pool.query(
    `SELECT id, email, role, tenant_id FROM users WHERE tenant_id IN ($1,$2) ORDER BY tenant_id`,
    [GHOST_TENANT, REAL_TENANT]
  );
  console.log('Users before fix:', JSON.stringify(before.rows, null, 2));

  // Show conversations count per tenant
  const convs = await pool.query(
    `SELECT tenant_id, COUNT(*) FROM conversations WHERE tenant_id IN ($1,$2) GROUP BY tenant_id`,
    [GHOST_TENANT, REAL_TENANT]
  );
  console.log('Conversations per tenant:', JSON.stringify(convs.rows, null, 2));

  const REAL_USER = 'de39c104-23ef-406b-8042-9ceae507b81b';

  // Reassign all FKs from ghost user to real user
  const tables = [
    ['knowledge_documents', 'created_by'],
    ['conversations', 'assigned_user_id'],
    ['audit_logs', 'actor_id'],
  ];
  for (const [table, col] of tables) {
    const r = await pool.query(
      `UPDATE ${table} SET ${col} = $1 WHERE ${col} = $2`,
      [REAL_USER, USER_ID]
    );
    console.log(`Reassigned ${r.rowCount} rows in ${table}.${col}`);
  }

  // Delete refresh tokens for the ghost user first (FK constraint)
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [USER_ID]);
  console.log('Refresh tokens deleted for ghost user', USER_ID);

  // Delete the ghost user (ea5639bb in empty tenant c881b2e0)
  const del = await pool.query(
    `DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id, email, tenant_id`,
    [USER_ID, GHOST_TENANT]
  );
  console.log('Deleted ghost user:', JSON.stringify(del.rows, null, 2));

  // Also revoke refresh tokens for de39c104 (real user) to force fresh login
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, ['de39c104-23ef-406b-8042-9ceae507b81b']);
  console.log('Refresh tokens cleared for real user de39c104');

  // Show state after
  const after = await pool.query(
    `SELECT id, email, role, tenant_id FROM users WHERE tenant_id = $1`,
    [REAL_TENANT]
  );
  console.log('Users in real tenant after fix:', JSON.stringify(after.rows, null, 2));

  await pool.end();
  console.log('\nDone. Please log out and log back in on the web panel.');
}

main().catch(e => { console.error('ERROR:', e.message); pool.end(); });
