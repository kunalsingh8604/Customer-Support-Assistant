import express from 'express';
import cors from 'cors';
import ticketsRouter from '../routes/tickets.js';
import aiRouter from '../routes/ai.js';
import { requestLogger } from '../middleware/requestLogger.js';
import { logger, logError } from '../utils/logger.js';

export function createApp() {
  const app = express();

  const allowedOrigins = (
    process.env.CORS_ORIGIN || 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );
  app.use(express.json());
  app.use(requestLogger);

  app.get('/', (_req, res) => {
    const wantsHtml = String(_req.headers.accept || '').includes('text/html');

    if (wantsHtml) {
      res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Customer Support Assistant API</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Segoe UI, system-ui, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      main {
        width: min(520px, 92vw);
        padding: 2rem;
        border: 1px solid #334155;
        border-radius: 16px;
        background: #111827;
      }
      h1 { margin: 0 0 0.35rem; font-size: 1.35rem; }
      p { margin: 0 0 1.25rem; color: #94a3b8; }
      .ok {
        display: inline-block;
        margin-bottom: 1rem;
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        background: #14532d;
        color: #bbf7d0;
        font-size: 0.85rem;
        font-weight: 600;
      }
      a {
        display: block;
        color: #93c5fd;
        text-decoration: none;
        margin: 0.45rem 0;
      }
      a:hover { text-decoration: underline; }
      code { color: #f8fafc; }
    </style>
  </head>
  <body>
    <main>
      <div class="ok">✓ API running</div>
      <h1>Customer Support Assistant</h1>
      <p>This is the backend API. Use the React app for the UI.</p>
      <a href="/health"><code>/health</code> — health check</a>
      <a href="/api/tickets"><code>/api/tickets</code> — tickets API</a>
      <a href="http://localhost:5173"><code>http://localhost:5173</code> — frontend UI</a>
    </main>
  </body>
</html>`);
      return;
    }

    res.json({
      name: 'Customer Support Assistant API',
      status: 'ok',
      health: '/health',
      endpoints: {
        tickets: '/api/tickets',
        ticketById: '/api/tickets/:id',
        analyze: 'POST /api/tickets/:id/analyze',
      },
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/tickets', ticketsRouter);
  app.use('/api/tickets', aiRouter);

  app.use((req, res) => {
    res.status(404).json({
      error: `Route not found: ${req.method} ${req.originalUrl}`,
      hint: 'Try GET / or GET /health',
    });
  });

  app.use((err, req, res, _next) => {
    logError('Unhandled error', err, {
      event: 'unhandled_error',
      requestId: req.requestId,
      ticketId: req.params?.id || null,
      path: req.originalUrl,
      method: req.method,
    });
    res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

export { logger };
