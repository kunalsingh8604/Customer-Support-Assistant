import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ticketsApi } from '../api/tickets';
import TicketForm from '../components/TicketForm';

export default function NewTicketPage() {
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: ticketsApi.create,
    onSuccess: (ticket) => {
      navigate(`/tickets/${ticket.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New ticket</h1>
        <p className="mt-1 text-sm text-slate-500">
          Capture the case details. Urgency is optional — AI can suggest one later.
        </p>
      </div>

      <TicketForm
        onSubmit={(payload) => createMutation.mutate(payload)}
        onCancel={() => navigate('/tickets')}
        isSubmitting={createMutation.isPending}
        submitError={createMutation.isError ? createMutation.error.message : null}
      />
    </div>
  );
}
