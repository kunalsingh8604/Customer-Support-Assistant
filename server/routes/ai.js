import { Router } from 'express';
import { searchArticles } from '../services/kbLoader.js';
import { analyzeTicket } from '../services/aiOrchestrator.js';
import {
  getTicketById,
  saveAIResult,
  getAIResult,
  appendHistory,
  updateTicketStatus,
} from '../services/ticketService.js';
import { logger, logError } from '../utils/logger.js';

const router = Router();

function buildSearchQuery(ticket) {
  return [ticket.product_area, ticket.issue_description, ticket.previous_communication]
    .filter(Boolean)
    .join(' ');
}

router.post('/:id/analyze', async (req, res) => {
  const { id } = req.params;
  logger.info('POST /api/tickets/:id/analyze request', { id });

  try {
    const ticket = getTicketById(id);
    if (!ticket) {
      logger.info('POST /api/tickets/:id/analyze response', { id, found: false });
      return res.status(404).json({ error: `Ticket not found: ${id}` });
    }

    const articles = searchArticles(buildSearchQuery(ticket), ticket.product_area);
    logger.info('POST /api/tickets/:id/analyze kb search', {
      id,
      articleCount: articles.length,
      sources: articles.map((article) => article.file_path),
    });

    const aiResult = await analyzeTicket(ticket, articles);
    const saved = saveAIResult(id, {
      classification: aiResult.classification,
      retrieved_articles: aiResult.retrieved_articles,
      missing_info: aiResult.missing_info,
      follow_up_questions: aiResult.follow_up_questions,
      draft_response: aiResult.draft_response,
      suggested_action: aiResult.suggested_action,
    });

    // Move open tickets into review after analysis (does not auto-approve drafts)
    if (ticket.status === 'open') {
      updateTicketStatus(id, 'in-review');
    }

    const refreshedTicket = getTicketById(id);

    // Human-in-the-loop: never auto-approve response or action
    const responseBody = {
      ...saved,
      citations: aiResult.citations,
      meta: aiResult.meta,
      ticket: refreshedTicket,
      approval_required: {
        response: true,
        action: true,
        note: 'Drafts are not auto-approved. Use approve/reject endpoints.',
      },
    };

    logger.info('POST /api/tickets/:id/analyze response', {
      id,
      aiResultId: saved?.id,
      category: aiResult.classification?.category,
      actionType: aiResult.suggested_action?.type,
    });

    res.status(200).json(responseBody);
  } catch (error) {
    logError('POST /api/tickets/:id/analyze error', error, {
      ticketId: id,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/:id/approve-response', (req, res) => {
  const { id } = req.params;
  logger.info('POST /api/tickets/:id/approve-response request', { id });

  try {
    const ticket = getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket not found: ${id}` });
    }

    const aiResult = getAIResult(id);
    if (!aiResult) {
      return res.status(404).json({ error: `No AI result found for ticket: ${id}` });
    }

    const entry = appendHistory(id, 'response_approved', {
      ai_result_id: aiResult.id,
      draft_response: aiResult.draft_response,
      approved_at: new Date().toISOString(),
    });

    logger.info('Approval decision recorded', {
      event: 'approval_decision',
      ticketId: id,
      type: 'response',
      decision: 'approved',
      historyId: entry.id,
    });

    res.json({
      ticket_id: id,
      event: entry,
      message: 'Draft response approved. No message was sent automatically.',
    });
  } catch (error) {
    logError('POST /api/tickets/:id/approve-response error', error, {
      ticketId: id,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/:id/reject-response', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  logger.info('POST /api/tickets/:id/reject-response request', { id, reason });

  try {
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'reason is required' });
    }

    const ticket = getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket not found: ${id}` });
    }

    const aiResult = getAIResult(id);
    if (!aiResult) {
      return res.status(404).json({ error: `No AI result found for ticket: ${id}` });
    }

    const entry = appendHistory(id, 'response_rejected', {
      ai_result_id: aiResult.id,
      reason: String(reason).trim(),
      draft_response: aiResult.draft_response,
      rejected_at: new Date().toISOString(),
    });

    logger.info('Approval decision recorded', {
      event: 'approval_decision',
      ticketId: id,
      type: 'response',
      decision: 'rejected',
      reason: String(reason).trim(),
      historyId: entry.id,
    });

    res.json({
      ticket_id: id,
      event: entry,
      message: 'Draft response rejected.',
    });
  } catch (error) {
    logError('POST /api/tickets/:id/reject-response error', error, {
      ticketId: id,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/:id/approve-action', (req, res) => {
  const { id } = req.params;
  logger.info('POST /api/tickets/:id/approve-action request', { id });

  try {
    const ticket = getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket not found: ${id}` });
    }

    const aiResult = getAIResult(id);
    if (!aiResult) {
      return res.status(404).json({ error: `No AI result found for ticket: ${id}` });
    }

    const entry = appendHistory(id, 'action_approved', {
      ai_result_id: aiResult.id,
      suggested_action: aiResult.suggested_action,
      approved_at: new Date().toISOString(),
    });

    logger.info('Approval decision recorded', {
      event: 'approval_decision',
      ticketId: id,
      type: 'action',
      decision: 'approved',
      actionType: aiResult.suggested_action?.type,
      historyId: entry.id,
    });

    res.json({
      ticket_id: id,
      event: entry,
      message: 'Suggested action approved. No action was executed automatically.',
    });
  } catch (error) {
    logError('POST /api/tickets/:id/approve-action error', error, {
      ticketId: id,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/:id/reject-action', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  logger.info('POST /api/tickets/:id/reject-action request', { id, reason });

  try {
    const ticket = getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket not found: ${id}` });
    }

    const aiResult = getAIResult(id);
    if (!aiResult) {
      return res.status(404).json({ error: `No AI result found for ticket: ${id}` });
    }

    const entry = appendHistory(id, 'action_rejected', {
      ai_result_id: aiResult.id,
      suggested_action: aiResult.suggested_action,
      reason: reason ? String(reason).trim() : null,
      rejected_at: new Date().toISOString(),
    });

    logger.info('Approval decision recorded', {
      event: 'approval_decision',
      ticketId: id,
      type: 'action',
      decision: 'rejected',
      reason: reason ? String(reason).trim() : null,
      historyId: entry.id,
    });

    res.json({
      ticket_id: id,
      event: entry,
      message: 'Suggested action rejected.',
    });
  } catch (error) {
    logError('POST /api/tickets/:id/reject-action error', error, {
      ticketId: id,
    });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
