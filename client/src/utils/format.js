export function formatDate(value) {
  if (!value) return '—';
  const normalized = String(value).includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function capitalize(value) {
  if (!value) return '';
  return String(value)
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function summarizePayload(payload) {
  if (!payload) return 'No details';
  if (typeof payload === 'string') return payload;
  if (payload.reason) return `Reason: ${payload.reason}`;
  if (payload.from && payload.to) return `Status ${payload.from} → ${payload.to}`;
  if (payload.actionType || payload.suggested_action?.type) {
    return `Action: ${payload.suggested_action?.type || payload.actionType}`;
  }
  if (payload.ai_result_id) return `AI result ${String(payload.ai_result_id).slice(0, 8)}…`;
  try {
    const text = JSON.stringify(payload);
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  } catch {
    return 'Event recorded';
  }
}

export function getDecisionFromHistory(history, approveType, rejectType) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const event = history[i];
    if (event.event_type === approveType) {
      return { status: 'approved', event };
    }
    if (event.event_type === rejectType) {
      return { status: 'rejected', event };
    }
  }
  return null;
}
