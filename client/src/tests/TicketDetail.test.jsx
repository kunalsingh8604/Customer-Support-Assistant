import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TicketDetailPage from '../pages/TicketDetailPage';
import { ticketsApi } from '../api/tickets';

vi.mock('../api/tickets', () => ({
  ticketsApi: {
    get: vi.fn(),
    history: vi.fn(),
    analyze: vi.fn(),
    approveResponse: vi.fn(),
    rejectResponse: vi.fn(),
    approveAction: vi.fn(),
    rejectAction: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

function renderDetail(ticketId = 'ticket-1') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TicketDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    ticketsApi.get.mockReturnValue(new Promise(() => {}));
    ticketsApi.history.mockReturnValue(new Promise(() => {}));

    renderDetail();
    expect(screen.getByText(/Loading ticket/i)).toBeInTheDocument();
  });

  it('shows error state', async () => {
    ticketsApi.get.mockRejectedValue(new Error('Network down'));
    ticketsApi.history.mockResolvedValue([]);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Could not load ticket')).toBeInTheDocument();
    });
    expect(screen.getByText('Network down')).toBeInTheDocument();
  });

  it('renders AI results when present', async () => {
    ticketsApi.get.mockResolvedValue({
      id: 'ticket-1',
      customer_type: 'Enterprise',
      product_area: 'billing',
      issue_description: 'Payment failed repeatedly at checkout for this customer.',
      previous_communication: null,
      urgency: 'high',
      status: 'in-review',
      created_at: '2026-07-28 10:00:00',
      updated_at: '2026-07-28 10:05:00',
      ai_result: {
        id: 'ai-1',
        classification: {
          category: 'billing',
          suggested_urgency: 'high',
          confidence: 'high',
        },
        missing_info: ['Invoice number'],
        follow_up_questions: ['When did the payment fail?'],
        draft_response: 'Thanks for reaching out about the payment failure.',
        suggested_action: {
          type: 'request_clarification',
          reason: 'Need more payment details',
          cited_source: 'Payment Failures Troubleshooting',
        },
        retrieved_articles: [
          {
            title: 'Payment Failures Troubleshooting',
            product_area: 'billing',
            tags: ['payment'],
            file_path: 'billing/payment-failures.md',
            excerpt: 'When a payment fails...',
            content: 'Full article content',
          },
        ],
      },
    });
    ticketsApi.history.mockResolvedValue([
      {
        id: 'h1',
        event_type: 'created',
        created_at: '2026-07-28 10:00:00',
        payload: { status: 'open' },
      },
      {
        id: 'h2',
        event_type: 'ai_analyzed',
        created_at: '2026-07-28 10:05:00',
        payload: { ai_result_id: 'ai-1' },
      },
    ]);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Invoice number')).toBeInTheDocument();
    });
    expect(screen.getByText('When did the payment fail?')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Thanks for reaching out about the payment failure.')
    ).toBeInTheDocument();
    expect(screen.getByText('Request Clarification')).toBeInTheDocument();
    expect(
      screen.getAllByText('Payment Failures Troubleshooting').length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Billing').length).toBeGreaterThan(0);
  });
});
