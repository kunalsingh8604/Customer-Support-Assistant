import { capitalize } from '../utils/format';

const STATUS_STYLES = {
  open: 'bg-sky-100 text-sky-800 ring-sky-200',
  'in-review': 'bg-amber-100 text-amber-900 ring-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  closed: 'bg-slate-200 text-slate-700 ring-slate-300',
};

const URGENCY_STYLES = {
  low: 'bg-slate-100 text-slate-700 ring-slate-200',
  medium: 'bg-blue-100 text-blue-800 ring-blue-200',
  high: 'bg-orange-100 text-orange-800 ring-orange-200',
  critical: 'bg-rose-100 text-rose-800 ring-rose-200',
};

export function StatusBadge({ status }) {
  const styles = STATUS_STYLES[status] || STATUS_STYLES.open;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {capitalize(status)}
    </span>
  );
}

export function UrgencyBadge({ urgency }) {
  const styles = URGENCY_STYLES[urgency] || URGENCY_STYLES.medium;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {capitalize(urgency)}
    </span>
  );
}

export function DecisionBadge({ decision }) {
  if (!decision) return null;
  const approved = decision.status === 'approved';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        approved
          ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
          : 'bg-rose-100 text-rose-800 ring-rose-200'
      }`}
    >
      {approved ? 'Approved' : 'Rejected'}
    </span>
  );
}
