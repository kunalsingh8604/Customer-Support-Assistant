import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { initDatabase } from '../db/schema.js';
import { createApp } from '../src/app.js';
import { getHistory, getAIResult, saveAIResult } from '../services/ticketService.js';
import { searchArticles } from '../services/kbLoader.js';

vi.mock('../services/aiOrchestrator.js', () => ({
  analyzeTicket: vi.fn(async (ticket, articles) => ({
    classification: {
      category: 'billing',
      suggested_urgency: 'high',
      confidence: 'high',
    },
    missing_info: ['Invoice ID'],
    follow_up_questions: ['What is the invoice number?'],
    draft_response: 'Based on Refund Policy, we can help with your billing issue.',
    suggested_action: {
      type: 'request_clarification',
      reason: 'Need invoice ID',
      cited_source: 'Refund Policy',
    },
    citations: ['Refund Policy'],
    retrieved_articles: (articles || []).map((article) => ({
      title: article.title,
      product_area: article.product_area,
      tags: article.tags,
      file_path: article.file_path,
      excerpt: article.excerpt,
      content: article.content,
      score: article.score,
    })),
    meta: {
      model: 'llama-3.3-70b-versatile',
      duration_ms: 12,
      token_usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    },
  })),
}));

const validTicket = {
  customer_type: 'Enterprise',
  product_area: 'billing',
  issue_description: 'Customer cannot complete payment on checkout page.',
  previous_communication: 'Email thread started yesterday',
  urgency: 'high',
};

describe('Ticket API', () => {
  let app;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    initDatabase(':memory:');
    app = createApp();
  });

  it('POST /api/tickets creates a ticket and returns 201', async () => {
    const response = await request(app).post('/api/tickets').send(validTicket);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      customer_type: validTicket.customer_type,
      product_area: validTicket.product_area,
      issue_description: validTicket.issue_description,
      urgency: 'high',
      status: 'open',
    });
    expect(response.body.id).toBeTruthy();
  });

  it('POST /api/tickets validates required fields', async () => {
    const response = await request(app).post('/api/tickets').send({
      customer_type: 'Business',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/required/i);
  });

  it('GET /api/tickets/:id returns ticket with correct shape', async () => {
    const created = await request(app).post('/api/tickets').send(validTicket);
    const response = await request(app).get(`/api/tickets/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        customer_type: validTicket.customer_type,
        product_area: validTicket.product_area,
        issue_description: validTicket.issue_description,
        previous_communication: validTicket.previous_communication,
        urgency: 'high',
        status: 'open',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        ai_result: null,
      })
    );
  });

  it('PATCH /api/tickets/:id/status updates status and logs history', async () => {
    const created = await request(app).post('/api/tickets').send(validTicket);
    const id = created.body.id;

    const response = await request(app)
      .patch(`/api/tickets/${id}/status`)
      .send({ status: 'resolved' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('resolved');

    const history = getHistory(id);
    expect(history.some((event) => event.event_type === 'status_changed')).toBe(true);
    expect(
      history.find((event) => event.event_type === 'status_changed').payload
    ).toMatchObject({ from: 'open', to: 'resolved' });
  });

  it('kbLoader.searchArticles returns relevant articles for a known query', () => {
    const results = searchArticles('payment failed card decline', 'billing');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].file_path).toContain('billing/');
    expect(results[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        product_area: 'billing',
        tags: expect.any(Array),
        content: expect.any(String),
        excerpt: expect.any(String),
        file_path: expect.any(String),
        score: expect.any(Number),
      })
    );
  });

  it('POST /api/tickets/:id/approve-response only works after AI analysis', async () => {
    const created = await request(app).post('/api/tickets').send(validTicket);
    const id = created.body.id;

    const before = await request(app).post(`/api/tickets/${id}/approve-response`);
    expect(before.status).toBe(404);
    expect(before.body.error).toMatch(/No AI result/i);

    saveAIResult(id, {
      classification: { category: 'billing', suggested_urgency: 'high', confidence: 'high' },
      retrieved_articles: [],
      missing_info: [],
      follow_up_questions: [],
      draft_response: 'Draft reply',
      suggested_action: {
        type: 'no_action',
        reason: 'Informational',
        cited_source: 'N/A',
      },
    });

    const after = await request(app).post(`/api/tickets/${id}/approve-response`);
    expect(after.status).toBe(200);
    expect(after.body.event.event_type).toBe('response_approved');

    const history = getHistory(id);
    expect(history.some((event) => event.event_type === 'response_approved')).toBe(true);
  });

  it('POST /api/tickets/:id/analyze mocks Groq, saves result, and updates history', async () => {
    const created = await request(app).post('/api/tickets').send(validTicket);
    const id = created.body.id;

    const response = await request(app).post(`/api/tickets/${id}/analyze`);

    expect(response.status).toBe(200);
    expect(response.body.draft_response).toContain('billing');
    expect(response.body.classification.category).toBe('billing');

    const saved = getAIResult(id);
    expect(saved).toBeTruthy();
    expect(saved.draft_response).toBeTruthy();

    const history = getHistory(id);
    expect(history.some((event) => event.event_type === 'ai_analyzed')).toBe(true);
    expect(history.some((event) => event.event_type === 'status_changed')).toBe(true);
  });
});
