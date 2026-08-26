const winston = require('winston');

const fmt = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fmt.combine(
    fmt.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    fmt.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? fmt.json()
      : fmt.combine(
          fmt.colorize(),
          fmt.printf(({ timestamp, level, message, ...meta }) => {
            const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}] ${message}${extra}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Morgan-style HTTP request logger
logger.http = (req, res, duration) => {
  const tenantId = req.tenantId || '-';
  const userId = req.user?.id || '-';
  logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
    tenant: tenantId,
    user: userId,
    ip: req.ip,
  });
};

module.exports = logger;
