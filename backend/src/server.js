require('dotenv').config();
const app = require('./app');
const { startWorker } = require('./queues/message.queue');

const PORT = process.env.PORT || 3001;

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
