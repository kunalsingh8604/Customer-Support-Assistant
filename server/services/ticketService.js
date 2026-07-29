import { randomUUID } from 'crypto';
import { getDb } from '../db/schema.js';
import { logger, logError } from '../utils/logger.js';

const VALID_URGENCY = new Set(['low', 'medium', 'high', 'critical']);
const VALID_STATUS = new Set(['open', 'in-review', 'resolved', 'closed']);
const VALID_EVENT_TYPES = new Set([
  'created',
  'ai_analyzed',
  'response_approved',
  'response_rejected',
  'action_approved',
  'action_rejected',
  'status_changed',
]);

function toJsonString(value) {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function parseJsonField(value) {
  if (value === undefined || value === null || value === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapTicket(row) {
  if (!row) return null;
  return { ...row };
}

function mapAIResult(row) {
  if (!row) return null;
  return {
    ...row,
    classification: parseJsonField(row.classification),
    retrieved_articles: parseJsonField(row.retrieved_articles),
    missing_info: parseJsonField(row.missing_info),
    follow_up_questions: parseJsonField(row.follow_up_questions),
    suggested_action: parseJsonField(row.suggested_action),
  };
}

function mapHistory(row) {
  if (!row) return null;
  return {
    ...row,
    payload: parseJsonField(row.payload),
  };
}

export function createTicket(data) {
  logger.info('ticketService.createTicket request', { data });

  try {
    const {
      customer_type,
      product_area,
      issue_description,
      previous_communication = null,
      urgency,
    } = data;

    if (!customer_type || !product_area || !issue_description) {
      const error = new Error(
        'customer_type, product_area, and issue_description are required'
      );
      error.statusCode = 400;
      throw error;
    }

    if (issue_description.trim().length < 20) {
      const error = new Error('issue_description must be at least 20 characters');
      error.statusCode = 400;
      throw error;
    }

    const resolvedUrgency = urgency || 'medium';

    if (!VALID_URGENCY.has(resolvedUrgency)) {
      const error = new Error(
        `Invalid urgency. Must be one of: ${[...VALID_URGENCY].join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    const db = getDb();
    const id = randomUUID();
    const status = 'open';

    const insert = db.prepare(`
      INSERT INTO tickets (
        id, customer_type, product_area, issue_description,
        previous_communication, urgency, status
      ) VALUES (
        @id, @customer_type, @product_area, @issue_description,
        @previous_communication, @urgency, @status
      )
    `);

    const create = db.transaction(() => {
      insert.run({
        id,
        customer_type,
        product_area,
        issue_description,
        previous_communication,
        urgency: resolvedUrgency,
        status,
      });

      appendHistory(id, 'created', {
        customer_type,
        product_area,
        urgency: resolvedUrgency,
        status,
      });
    });

    create();

    const ticket = getTicketById(id);
    logger.info('ticketService.createTicket response', { ticketId: id });
    return ticket;
  } catch (error) {
    logger.error('ticketService.createTicket error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export function getTicketById(id) {
  logger.info('ticketService.getTicketById request', { id });

  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    const ticket = mapTicket(row);

    logger.info('ticketService.getTicketById response', {
      id,
      found: Boolean(ticket),
    });
    return ticket;
  } catch (error) {
    logger.error('ticketService.getTicketById error', {
      id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export function getAllTickets() {
  logger.info('ticketService.getAllTickets request');

  try {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM tickets ORDER BY created_at DESC')
      .all();
    const tickets = rows.map(mapTicket);

    logger.info('ticketService.getAllTickets response', { count: tickets.length });
    return tickets;
  } catch (error) {
    logger.error('ticketService.getAllTickets error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export function updateTicketStatus(id, status) {
  logger.info('ticketService.updateTicketStatus request', { id, status });

  try {
    if (!VALID_STATUS.has(status)) {
      const error = new Error(
        `Invalid status. Must be one of: ${[...VALID_STATUS].join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    const existing = getTicketById(id);
    if (!existing) {
      const error = new Error(`Ticket not found: ${id}`);
      error.statusCode = 404;
      throw error;
    }

    const db = getDb();
    const previousStatus = existing.status;

    const update = db.transaction(() => {
      db.prepare(`
        UPDATE tickets
        SET status = @status, updated_at = datetime('now')
        WHERE id = @id
      `).run({ id, status });

      appendHistory(id, 'status_changed', {
        from: previousStatus,
        to: status,
      });
    });

    update();

    const ticket = getTicketById(id);
    logger.info('Ticket status changed', {
      event: 'ticket_status_change',
      ticketId: id,
      oldStatus: previousStatus,
      newStatus: status,
    });
    return ticket;
  } catch (error) {
    logError('ticketService.updateTicketStatus error', error, {
      ticketId: id,
      status,
    });
    throw error;
  }
}

export function saveAIResult(ticketId, aiResult) {
  logger.info('ticketService.saveAIResult request', { ticketId });

  try {
    const existing = getTicketById(ticketId);
    if (!existing) {
      const error = new Error(`Ticket not found: ${ticketId}`);
      error.statusCode = 404;
      throw error;
    }

    const db = getDb();
    const id = randomUUID();

    const insert = db.transaction(() => {
      db.prepare(`
        INSERT INTO ticket_ai_results (
          id, ticket_id, classification, retrieved_articles,
          missing_info, follow_up_questions, draft_response, suggested_action
        ) VALUES (
          @id, @ticket_id, @classification, @retrieved_articles,
          @missing_info, @follow_up_questions, @draft_response, @suggested_action
        )
      `).run({
        id,
        ticket_id: ticketId,
        classification: toJsonString(aiResult.classification),
        retrieved_articles: toJsonString(aiResult.retrieved_articles),
        missing_info: toJsonString(aiResult.missing_info),
        follow_up_questions: toJsonString(aiResult.follow_up_questions),
        draft_response: aiResult.draft_response ?? null,
        suggested_action: toJsonString(aiResult.suggested_action),
      });

      db.prepare(`
        UPDATE tickets
        SET updated_at = datetime('now')
        WHERE id = ?
      `).run(ticketId);

      appendHistory(ticketId, 'ai_analyzed', { ai_result_id: id });
    });

    insert();

    const result = getAIResult(ticketId);
    logger.info('ticketService.saveAIResult response', {
      ticketId,
      aiResultId: id,
    });
    return result;
  } catch (error) {
    logger.error('ticketService.saveAIResult error', {
      ticketId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export function getAIResult(ticketId) {
  logger.info('ticketService.getAIResult request', { ticketId });

  try {
    const db = getDb();
    const row = db
      .prepare(
        `
        SELECT * FROM ticket_ai_results
        WHERE ticket_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(ticketId);

    const result = mapAIResult(row);
    logger.info('ticketService.getAIResult response', {
      ticketId,
      found: Boolean(result),
    });
    return result;
  } catch (error) {
    logger.error('ticketService.getAIResult error', {
      ticketId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export function appendHistory(ticketId, eventType, payload = null) {
  logger.info('ticketService.appendHistory request', {
    ticketId,
    eventType,
  });

  try {
    if (!VALID_EVENT_TYPES.has(eventType)) {
      const error = new Error(
        `Invalid event_type. Must be one of: ${[...VALID_EVENT_TYPES].join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    const db = getDb();
    const id = randomUUID();

    db.prepare(`
      INSERT INTO ticket_history (id, ticket_id, event_type, payload)
      VALUES (@id, @ticket_id, @event_type, @payload)
    `).run({
      id,
      ticket_id: ticketId,
      event_type: eventType,
      payload: toJsonString(payload),
    });

    const entry = mapHistory(
      db.prepare('SELECT * FROM ticket_history WHERE id = ?').get(id)
    );

    logger.info('ticketService.appendHistory response', {
      ticketId,
      historyId: id,
      eventType,
    });
    return entry;
  } catch (error) {
    logger.error('ticketService.appendHistory error', {
      ticketId,
      eventType,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export function getHistory(ticketId) {
  logger.info('ticketService.getHistory request', { ticketId });

  try {
    const db = getDb();
    const rows = db
      .prepare(
        `
        SELECT * FROM ticket_history
        WHERE ticket_id = ?
        ORDER BY created_at ASC
      `
      )
      .all(ticketId);

    const history = rows.map(mapHistory);
    logger.info('ticketService.getHistory response', {
      ticketId,
      count: history.length,
    });
    return history;
  } catch (error) {
    logger.error('ticketService.getHistory error', {
      ticketId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
