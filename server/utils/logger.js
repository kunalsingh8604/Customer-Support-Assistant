import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'async_hooks';
import winston from 'winston';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export const requestContext = new AsyncLocalStorage();

const contextFormat = winston.format((info) => {
  const store = requestContext.getStore() || {};
  info.requestId = info.requestId ?? store.requestId ?? null;
  info.ticketId = info.ticketId ?? store.ticketId ?? null;
  return info;
});

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  contextFormat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  contextFormat(),
  winston.format.printf(({ timestamp, level, message, requestId, ticketId, stack, ...meta }) => {
    const base = `${timestamp} [${level}] ${message}`;
    const ids = `requestId=${requestId ?? 'null'} ticketId=${ticketId ?? 'null'}`;
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack ? `${base} ${ids}${rest}\n${stack}` : `${base} ${ids}${rest}`;
  })
);

const transports = [
  new winston.transports.File({
    filename: LOG_FILE,
    format: jsonFormat,
  }),
];

if (process.env.NODE_ENV !== 'test') {
  transports.unshift(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
} else if (process.env.LOG_TO_CONSOLE === 'true') {
  transports.unshift(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'error' : 'info'),
  defaultMeta: { service: 'customer-support-assistant' },
  transports,
});

export function runWithRequestContext(store, fn) {
  return requestContext.run(store, fn);
}

export function setTicketId(ticketId) {
  const store = requestContext.getStore();
  if (store) {
    store.ticketId = ticketId;
  }
}

export function logError(message, error, meta = {}) {
  logger.error(message, {
    ...meta,
    error: error?.message || String(error),
    stack: error?.stack,
  });
}
