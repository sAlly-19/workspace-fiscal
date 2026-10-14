import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  // Em produção, log JSON puro para ingestão por agregadores.
  // Em dev, usa pino-pretty se disponível (loaded lazily — não trava produção).
  base: {
    app: 'workspace-fiscal',
    pid: undefined,
  },
  // Redação de PII: nunca logar caminhos absolutos do userData nem conteúdo de XML.
  redact: {
    paths: [
      '*.userData',
      '*.documents',
      '*.downloads',
      '*.home',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-workspace-token"]',
      'req.headers.x-workspace-token',
      'password',
      '*.password',
      'senha',
      '*.senha',
      'token',
      '*.token',
      'pfx',
      '*.pfx',
      'certPassword',
      '*.certPassword',
      'privateKey',
      '*.privateKey',
      'secret',
      '*.secret',
      'xml',
      '*.xmlContent',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;