export function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 text-slate-600" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function PageLoader({ label }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner label={label} />
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900">
      <p className="font-semibold">{title}</p>
      {message ? <p className="mt-1 text-sm text-rose-800">{message}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-rose-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {message ? <p className="mt-1 text-sm text-slate-500">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
