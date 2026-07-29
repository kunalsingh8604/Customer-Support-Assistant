import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api/tickets';
import { DecisionBadge, StatusBadge, UrgencyBadge } from '../components/Badges';
import { EmptyState, ErrorState, LoadingSpinner, PageLoader } from '../components/States';
import {
  capitalize,
  formatDate,
  getDecisionFromHistory,
  summarizePayload,
} from '../utils/format';

function Panel({ title, children, actions }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function KnowledgeArticle({ article }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-medium text-slate-900">{article.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {capitalize(article.product_area)} · {article.file_path}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {(article.tags || []).map((tag) => (
              <span
                key={tag}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <span className="text-xs text-slate-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-3 py-2">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
            {article.content || article.excerpt || 'No content available.'}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [draftResponse, setDraftResponse] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [actionRejectReason, setActionRejectReason] = useState('');
  const [showActionReject, setShowActionReject] = useState(false);
  const [citations, setCitations] = useState([]);

  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.get(id),
    enabled: Boolean(id),
  });

  const historyQuery = useQuery({
    queryKey: ['ticket-history', id],
    queryFn: () => ticketsApi.history(id),
    enabled: Boolean(id),
  });

  const aiResult = ticketQuery.data?.ai_result || null;

  useEffect(() => {
    if (aiResult?.draft_response != null) {
      setDraftResponse(aiResult.draft_response);
    }
  }, [aiResult?.id, aiResult?.draft_response]);

  const responseDecision = useMemo(
    () =>
      getDecisionFromHistory(
        historyQuery.data,
        'response_approved',
        'response_rejected'
      ),
    [historyQuery.data]
  );

  const actionDecision = useMemo(
    () =>
      getDecisionFromHistory(historyQuery.data, 'action_approved', 'action_rejected'),
    [historyQuery.data]
  );

  function invalidateTicket() {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['ticket-history', id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  }

  const analyzeMutation = useMutation({
    mutationFn: () => ticketsApi.analyze(id),
    onSuccess: (data) => {
      setCitations(data.citations || []);
      if (data.draft_response != null) {
        setDraftResponse(data.draft_response);
      }
      setShowRejectReason(false);
      setRejectReason('');
      setShowActionReject(false);
      setActionRejectReason('');
      invalidateTicket();
    },
  });

  const approveResponseMutation = useMutation({
    mutationFn: () => ticketsApi.approveResponse(id),
    onSuccess: () => {
      setShowRejectReason(false);
      invalidateTicket();
    },
  });

  const rejectResponseMutation = useMutation({
    mutationFn: (reason) => ticketsApi.rejectResponse(id, reason),
    onSuccess: () => {
      setShowRejectReason(false);
      setRejectReason('');
      invalidateTicket();
    },
  });

  const approveActionMutation = useMutation({
    mutationFn: () => ticketsApi.approveAction(id),
    onSuccess: () => {
      setShowActionReject(false);
      invalidateTicket();
    },
  });

  const rejectActionMutation = useMutation({
    mutationFn: (reason) => ticketsApi.rejectAction(id, reason),
    onSuccess: () => {
      setShowActionReject(false);
      setActionRejectReason('');
      invalidateTicket();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => ticketsApi.updateStatus(id, status),
    onSuccess: () => invalidateTicket(),
  });

  if (ticketQuery.isLoading) {
    return <PageLoader label="Loading ticket…" />;
  }

  if (ticketQuery.isError) {
    return (
      <ErrorState
        title="Could not load ticket"
        message={ticketQuery.error.message}
        onRetry={() => ticketQuery.refetch()}
      />
    );
  }

  const ticket = ticketQuery.data;
  const articles = aiResult?.retrieved_articles || [];
  const classification = aiResult?.classification;
  const missingInfo = aiResult?.missing_info || [];
  const followUps = aiResult?.follow_up_questions || [];
  const suggestedAction = aiResult?.suggested_action;
  const displayCitations =
    citations.length > 0
      ? citations
      : (articles || []).map((article) => article.title).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/tickets" className="text-sm text-slate-500 hover:text-slate-800">
            ← Back to tickets
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Ticket workspace</h1>
          <p className="mt-1 font-mono text-xs text-slate-400">{ticket.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) statusMutation.mutate(e.target.value);
            }}
            disabled={statusMutation.isPending}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            <option value="">Update status…</option>
            <option value="resolved">Mark resolved</option>
            <option value="closed">Mark closed</option>
            <option value="in-review">Mark in-review</option>
            <option value="open">Mark open</option>
          </select>
        </div>
      </div>

      {statusMutation.isError ? (
        <ErrorState title="Status update failed" message={statusMutation.error.message} />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        {/* SECTION 1 — Ticket info */}
        <Panel title="Ticket info">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Customer type</dt>
              <dd className="mt-0.5 text-slate-800">{capitalize(ticket.customer_type)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Product area</dt>
              <dd className="mt-0.5 text-slate-800">{capitalize(ticket.product_area)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Urgency</dt>
              <dd className="mt-1">
                <UrgencyBadge urgency={ticket.urgency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={ticket.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Created</dt>
              <dd className="mt-0.5 text-slate-800">{formatDate(ticket.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Updated</dt>
              <dd className="mt-0.5 text-slate-800">{formatDate(ticket.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Issue</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">
                {ticket.issue_description}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">
                Previous communication
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">
                {ticket.previous_communication || '—'}
              </dd>
            </div>
          </dl>
        </Panel>

        {/* Center column */}
        <div className="space-y-4">
          {/* SECTION 2 — AI Analysis */}
          <Panel
            title="AI analysis"
            actions={
              <button
                type="button"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzeMutation.isPending ? 'Running…' : 'Run AI Analysis'}
              </button>
            }
          >
            {analyzeMutation.isPending ? (
              <LoadingSpinner label="Running Groq analysis — this may take a moment…" />
            ) : null}

            {analyzeMutation.isError ? (
              <div className="mb-3">
                <ErrorState
                  title="AI analysis failed"
                  message={analyzeMutation.error.message}
                  onRetry={() => analyzeMutation.mutate()}
                />
              </div>
            ) : null}

            {analyzeMutation.isSuccess && !aiResult ? (
              <p className="mb-3 text-sm text-emerald-700">
                Analysis completed. Refreshing ticket data…
              </p>
            ) : null}

            {!aiResult && !analyzeMutation.isPending ? (
              <EmptyState
                title="No analysis yet"
                message="Run AI analysis to classify the ticket, find gaps, and draft a response."
              />
            ) : null}

            {aiResult ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-200">
                    {capitalize(classification?.category || 'general')}
                  </span>
                  <UrgencyBadge urgency={classification?.suggested_urgency || 'medium'} />
                  <span className="text-xs text-slate-500">
                    Confidence: {capitalize(classification?.confidence || 'low')}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Missing information</h3>
                  {missingInfo.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">None identified.</p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {missingInfo.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Follow-up questions</h3>
                  {followUps.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">None suggested.</p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {followUps.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </Panel>

          {/* SECTION 3 — Draft response */}
          <Panel
            title="Draft response"
            actions={<DecisionBadge decision={responseDecision} />}
          >
            {!aiResult ? (
              <EmptyState
                title="No draft yet"
                message="Run AI analysis to generate a customer-facing draft."
              />
            ) : (
              <div className="space-y-3">
                <textarea
                  value={draftResponse}
                  onChange={(e) => setDraftResponse(e.target.value)}
                  rows={10}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />

                {responseDecision?.status === 'rejected' &&
                responseDecision.event?.payload?.reason ? (
                  <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    Rejection reason: {responseDecision.event.payload.reason}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approveResponseMutation.mutate()}
                    disabled={
                      approveResponseMutation.isPending ||
                      responseDecision?.status === 'approved'
                    }
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {approveResponseMutation.isPending ? 'Approving…' : 'Approve Response'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectReason((value) => !value)}
                    disabled={responseDecision?.status === 'rejected'}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject Response
                  </button>
                </div>

                {showRejectReason ? (
                  <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 p-3">
                    <label className="block text-sm font-medium text-rose-900">
                      Rejection reason
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-rose-300 px-3 py-2 text-sm text-slate-800"
                        placeholder="Why is this draft being rejected?"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => rejectResponseMutation.mutate(rejectReason.trim())}
                      disabled={
                        !rejectReason.trim() || rejectResponseMutation.isPending
                      }
                      className="rounded-md bg-rose-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-60"
                    >
                      {rejectResponseMutation.isPending
                        ? 'Rejecting…'
                        : 'Confirm rejection'}
                    </button>
                  </div>
                ) : null}

                {(approveResponseMutation.isError || rejectResponseMutation.isError) && (
                  <ErrorState
                    title="Could not update response decision"
                    message={
                      approveResponseMutation.error?.message ||
                      rejectResponseMutation.error?.message
                    }
                  />
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Citations</h3>
                  {displayCitations.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">No citations provided.</p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {displayCitations.map((citation) => (
                        <li key={citation}>{citation}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </Panel>

          {/* SECTION 4 — Suggested action */}
          <Panel
            title="Suggested action"
            actions={<DecisionBadge decision={actionDecision} />}
          >
            {!suggestedAction ? (
              <EmptyState
                title="No suggested action"
                message="Run AI analysis to get a recommended next step."
              />
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {capitalize(suggestedAction.type)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{suggestedAction.reason}</p>
                  {suggestedAction.cited_source ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Source: {suggestedAction.cited_source}
                    </p>
                  ) : null}
                </div>

                {actionDecision?.status === 'rejected' &&
                actionDecision.event?.payload?.reason ? (
                  <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    Rejection reason: {actionDecision.event.payload.reason}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approveActionMutation.mutate()}
                    disabled={
                      approveActionMutation.isPending ||
                      actionDecision?.status === 'approved'
                    }
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {approveActionMutation.isPending ? 'Approving…' : 'Approve Action'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowActionReject((value) => !value)}
                    disabled={actionDecision?.status === 'rejected'}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject Action
                  </button>
                </div>

                {showActionReject ? (
                  <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 p-3">
                    <label className="block text-sm font-medium text-rose-900">
                      Rejection reason (optional)
                      <textarea
                        value={actionRejectReason}
                        onChange={(e) => setActionRejectReason(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-md border border-rose-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        rejectActionMutation.mutate(actionRejectReason.trim() || null)
                      }
                      disabled={rejectActionMutation.isPending}
                      className="rounded-md bg-rose-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-60"
                    >
                      {rejectActionMutation.isPending
                        ? 'Rejecting…'
                        : 'Confirm rejection'}
                    </button>
                  </div>
                ) : null}

                {(approveActionMutation.isError || rejectActionMutation.isError) && (
                  <ErrorState
                    title="Could not update action decision"
                    message={
                      approveActionMutation.error?.message ||
                      rejectActionMutation.error?.message
                    }
                  />
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* SECTION 5 — Knowledge sources */}
        <Panel title="Knowledge sources">
          {articles.length === 0 ? (
            <EmptyState
              title="No articles retrieved"
              message="KB sources appear here after AI analysis."
            />
          ) : (
            <div className="space-y-2">
              {articles.map((article) => (
                <KnowledgeArticle
                  key={article.file_path || article.title}
                  article={article}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* SECTION 6 — History */}
      <Panel title="History timeline">
        {historyQuery.isLoading ? (
          <LoadingSpinner label="Loading history…" />
        ) : null}

        {historyQuery.isError ? (
          <ErrorState
            title="Could not load history"
            message={historyQuery.error.message}
            onRetry={() => historyQuery.refetch()}
          />
        ) : null}

        {historyQuery.isSuccess && (historyQuery.data || []).length === 0 ? (
          <EmptyState title="No events yet" message="Ticket history will appear here." />
        ) : null}

        {historyQuery.isSuccess && (historyQuery.data || []).length > 0 ? (
          <ol className="space-y-3">
            {historyQuery.data.map((event) => (
              <li
                key={event.id}
                className="relative rounded-md border border-slate-200 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {capitalize(event.event_type)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(event.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {summarizePayload(event.payload)}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
      </Panel>
    </div>
  );
}
