import { Router } from 'express';
import {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  getHistory,
  getAIResult,
} from '../services/ticketService.js';
import { logger, logError } from '../utils/logger.js';

const router = Router();

router.post('/', (req, res) => {
  logger.info('POST /api/tickets request', { body: req.body });

  try {
    const ticket = createTicket(req.body);
    logger.info('POST /api/tickets response', { ticketId: ticket.id });
    res.status(201).json(ticket);
  } catch (error) {
    logger.error('POST /api/tickets error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.get('/', (_req, res) => {
  logger.info('GET /api/tickets request');

  try {
    const tickets = getAllTickets();
    logger.info('GET /api/tickets response', { count: tickets.length });
    res.json(tickets);
  } catch (error) {
    logger.error('GET /api/tickets error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  logger.info('GET /api/tickets/:id request', { id });

  try {
    const ticket = getTicketById(id);
    if (!ticket) {
      logger.info('GET /api/tickets/:id response', { id, found: false });
      return res.status(404).json({ error: `Ticket not found: ${id}` });
    }

    const aiResult = getAIResult(id);
    logger.info('GET /api/tickets/:id response', { id, found: true });
    res.json({ ...ticket, ai_result: aiResult });
  } catch (error) {
    logger.error('GET /api/tickets/:id error', {
      id,
      error: error.message,
      stack: error.stack,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  logger.info('PATCH /api/tickets/:id/status request', { id, status });

  try {
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const ticket = updateTicketStatus(id, status);
    logger.info('PATCH /api/tickets/:id/status response', {
      id,
      status: ticket.status,
    });
    res.json(ticket);
  } catch (error) {
    logger.error('PATCH /api/tickets/:id/status error', {
      id,
      status,
      error: error.message,
      stack: error.stack,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.get('/:id/history', (req, res) => {
  const { id } = req.params;
  logger.info('GET /api/tickets/:id/history request', { id });

  try {
    const ticket = getTicketById(id);
    if (!ticket) {
      logger.info('GET /api/tickets/:id/history response', { id, found: false });
      return res.status(404).json({ error: `Ticket not found: ${id}` });
    }

    const history = getHistory(id);
    logger.info('GET /api/tickets/:id/history response', {
      id,
      count: history.length,
    });
    res.json(history);
  } catch (error) {
    logger.error('GET /api/tickets/:id/history error', {
      id,
      error: error.message,
      stack: error.stack,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
