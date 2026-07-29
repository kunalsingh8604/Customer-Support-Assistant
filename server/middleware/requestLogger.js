import { randomUUID } from 'crypto';
import { logger, runWithRequestContext, setTicketId } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const ticketIdFromParams = req.params?.id || null;

  runWithRequestContext({ requestId, ticketId: ticketIdFromParams }, () => {
    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      const ticketId =
        req.params?.id ||
        req.body?.ticketId ||
        res.locals?.ticketId ||
        ticketIdFromParams ||
        null;

      if (ticketId) {
        setTicketId(ticketId);
      }

      logger.info('HTTP request completed', {
        event: 'http_request',
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration,
        requestId,
        ticketId,
      });
    });

    next();
  });
}
