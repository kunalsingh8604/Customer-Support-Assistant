import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { logger, logError } from '../utils/logger.js';

let db = null;

export function initDatabase(dbPath = process.env.DB_PATH || './data/support.db') {
  if (db) {
    try {
      db.close();
    } catch {
      // ignore close errors when re-initializing (tests)
    }
    db = null;
  }

  if (dbPath === ':memory:') {
    db = new Database(':memory:');
  } else {
    const absolutePath = path.isAbsolute(dbPath)
      ? dbPath
      : path.resolve(process.cwd(), dbPath);

    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info('Created database directory', { dir });
    }

    db = new Database(absolutePath);
    logger.info('SQLite database initialized', { path: absolutePath });
  }

  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      customer_type TEXT NOT NULL,
      product_area TEXT NOT NULL,
      issue_description TEXT NOT NULL,
      previous_communication TEXT,
      urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL CHECK (status IN ('open', 'in-review', 'resolved', 'closed')) DEFAULT 'open',
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_ai_results (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      classification TEXT,
      retrieved_articles TEXT,
      missing_info TEXT,
      follow_up_questions TEXT,
      draft_response TEXT,
      suggested_action TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ticket_history (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (
        event_type IN (
          'created',
          'ai_analyzed',
          'response_approved',
          'response_rejected',
          'action_approved',
          'action_rejected',
          'status_changed'
        )
      ),
      payload TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ticket_ai_results_ticket_id
      ON ticket_ai_results(ticket_id);

    CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id
      ON ticket_history(ticket_id);
  `);

  if (dbPath === ':memory:') {
    logger.info('SQLite database initialized', { path: ':memory:' });
  }

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase() {
  if (!db) return;
  db.close();
  db = null;
}
