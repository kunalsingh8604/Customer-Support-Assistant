import 'dotenv/config';
import os from 'os';
import { initDatabase, closeDatabase } from './db/schema.js';
import { createApp } from './src/app.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || './data/support.db';

function getNetworkAddress() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return null;
}

function printStartupBanner(port) {
  const localUrl = `http://localhost:${port}`;
  const networkHost = getNetworkAddress();
  const networkUrl = networkHost ? `http://${networkHost}:${port}` : 'unavailable';

  console.log('');
  console.log('  Customer Support Assistant API');
  console.log(`  - Local:    ${localUrl}`);
  console.log(`  - Network:  ${networkUrl}`);
  console.log(`  - Health:   ${localUrl}/health`);
  console.log(`  - Env:      ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('  ✓ Ready');
  console.log('');
}

initDatabase(DB_PATH);

const app = createApp();

const server = app.listen(PORT, () => {
  const localUrl = `http://localhost:${PORT}`;

  logger.info('Server listening', {
    event: 'server_start',
    port: Number(PORT),
    dbPath: DB_PATH,
    url: localUrl,
  });

  printStartupBanner(PORT);
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('Graceful shutdown started', { event: 'server_shutdown', signal });

  server.close((closeError) => {
    if (closeError) {
      logger.error('Error while closing HTTP server', {
        event: 'server_shutdown_error',
        error: closeError.message,
        stack: closeError.stack,
      });
    }

    try {
      closeDatabase();
      logger.info('Database connection closed', { event: 'db_closed' });
    } catch (dbError) {
      logger.error('Error while closing database', {
        event: 'db_close_error',
        error: dbError.message,
        stack: dbError.stack,
      });
    }

    logger.on('finish', () => {
      process.exit(closeError ? 1 : 0);
    });
    logger.end();

    setTimeout(() => process.exit(closeError ? 1 : 0), 2000).unref();
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
