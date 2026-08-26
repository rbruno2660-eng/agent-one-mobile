require('dotenv').config();
const app = require('./app');
const { startWorker } = require('./queues/message.queue');
const { query } = require('./db/pool');

const PORT = process.env.PORT || 3001;

// Migrations incrementais (idempotentes) — rodam antes de aceitar conexões
async function runMigrations() {
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`,
  ];
  for (const sql of migrations) {
    try { await query(sql); } catch (err) { console.warn('Migration skipped:', err.message); }
  }
  console.log('✅ Migrations OK');
}

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Agent One API rodando na porta ${PORT}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health: http://localhost:${PORT}/health`);

    // Inicia worker de mensagens WhatsApp
    try {
      startWorker();
    } catch (err) {
      console.warn('⚠️  Worker de mensagens não iniciado (Redis offline?):', err.message);
    }
  });
});
