import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../api/tickets';
import { StatusBadge, UrgencyBadge } from '../components/Badges';
import { EmptyState, ErrorState, PageLoader } from '../components/States';
import { capitalize, formatDate } from '../utils/format';

export default function TicketListPage() {
  const ticketsQuery = useQuery({
    queryKey: ['tickets'],
    queryFn: ticketsApi.list,
  });

  if (ticketsQuery.isLoading) {
    return <PageLoader label="Loading tickets…" />;
  }

  if (ticketsQuery.isError) {
    return (
      <ErrorState
        title="Could not load tickets"
        message={ticketsQuery.error.message}
        onRetry={() => ticketsQuery.refetch()}
      />
    );
  }

  const tickets = ticketsQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review open cases and launch AI-assisted analysis.
          </p>
        </div>
        <Link
          to="/tickets/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          message="Create a ticket to start the support workflow."
          action={
            <Link
              to="/tickets/new"
              className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create first ticket
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-medium text-slate-900 hover:text-slate-700"
                    >
                      {ticket.issue_description.slice(0, 80)}
                      {ticket.issue_description.length > 80 ? '…' : ''}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">
                      {ticket.id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {capitalize(ticket.customer_type)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {capitalize(ticket.product_area)}
                  </td>
                  <td className="px-4 py-3">
                    <UrgencyBadge urgency={ticket.urgency} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(ticket.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
