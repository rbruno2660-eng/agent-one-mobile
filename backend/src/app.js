require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();

// ─── Segurança e performance ───────────────────
app.use(helmet());
app.use(compression());

// CORS
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limit global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
}));

// Rate limit mais estrito para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

// Rate limit dedicado para webhook WhatsApp — 60 req/min por IP
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests.' },
});

// Captura rawBody via verify do express.json (evita double-consume do stream)
// Necessário para validar assinatura HMAC do webhook WhatsApp
app.use(express.json({
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ───────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => logger.http(req, res, Date.now() - start));
  next();
});

// ─── Health check ──────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ─── Rotas ────────────────────────────────────
const superadminMiddleware = require('./middleware/superadmin');
app.use('/superadmin', superadminMiddleware, require('./routes/superadmin'));

app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/products', require('./routes/products'));
app.use('/conversations', require('./routes/conversations'));
app.use('/trades', require('./routes/trades'));
app.use('/services', require('./routes/services'));
app.use('/leads', require('./routes/leads'));
app.use('/webhooks/whatsapp', webhookLimiter, require('./routes/whatsapp'));

app.use('/knowledge', require('./routes/knowledge'));
app.use('/agents', require('./routes/agents'));
app.use('/audit', require('./routes/audit'));

app.use('/analytics', require('./routes/analytics'));
app.use('/handoff-agents', require('./routes/handoff-agents'));
app.use('/ai-config', require('./routes/ai-config'));

// ─── 404 ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ─── Error handler ─────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // Loga internamente com stack completo — nunca envia para o cliente
  logger.error({ message: err.message, stack: err.stack, method: req.method, url: req.url, status });

  // Em produção: mensagem genérica para 5xx e sem stack em nenhum caso
  const isProd = process.env.NODE_ENV === 'production';
  const message = (isProd || status >= 500)
    ? (status >= 500 ? 'Erro interno do servidor' : err.message || 'Erro')
    : err.message || 'Erro interno';

  // Garante que jamais enviamos stack trace ou objetos de erro brutos ao cliente
  res.status(status).json({ error: message });
});

module.exports = app;
