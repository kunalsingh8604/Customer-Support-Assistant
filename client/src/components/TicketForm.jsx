import { useState } from 'react';
import { ErrorState, LoadingSpinner } from './States';

const CUSTOMER_TYPES = [
  { value: 'End User', label: 'End User' },
  { value: 'Business', label: 'Business' },
  { value: 'Enterprise', label: 'Enterprise' },
  { value: 'Internal', label: 'Internal' },
];

const PRODUCT_AREAS = [
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'account', label: 'Account' },
  { value: 'general', label: 'General' },
];

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const initialForm = {
  customer_type: 'End User',
  product_area: 'billing',
  issue_description: '',
  previous_communication: '',
  urgency: '',
};

export default function TicketForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
}) {
  const [form, setForm] = useState(initialForm);
  const [validationError, setValidationError] = useState('');

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const description = form.issue_description.trim();

    if (!description) {
      setValidationError('Issue description is required.');
      return;
    }

    if (description.length < 20) {
      setValidationError('Issue description must be at least 20 characters.');
      return;
    }

    const payload = {
      customer_type: form.customer_type,
      product_area: form.product_area,
      issue_description: description,
      previous_communication: form.previous_communication.trim() || null,
    };

    if (form.urgency) {
      payload.urgency = form.urgency;
    }

    onSubmit(payload);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Customer type</span>
        <select
          aria-label="Customer type"
          value={form.customer_type}
          onChange={(e) => updateField('customer_type', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          required
        >
          {CUSTOMER_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Product area</span>
        <select
          aria-label="Product area"
          value={form.product_area}
          onChange={(e) => updateField('product_area', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          required
        >
          {PRODUCT_AREAS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Issue description</span>
        <textarea
          aria-label="Issue description"
          value={form.issue_description}
          onChange={(e) => updateField('issue_description', e.target.value)}
          rows={5}
          placeholder="Describe the customer issue in detail (min 20 characters)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <span className="text-xs text-slate-400">
          {form.issue_description.trim().length}/20 minimum
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">
          Previous communication <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <textarea
          aria-label="Previous communication"
          value={form.previous_communication}
          onChange={(e) => updateField('previous_communication', e.target.value)}
          rows={4}
          placeholder="Paste relevant email or chat history"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">
          Urgency <span className="font-normal text-slate-400">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-3">
          {URGENCY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                form.urgency === option.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              <input
                type="radio"
                name="urgency"
                value={option.value}
                checked={form.urgency === option.value}
                onChange={(e) => updateField('urgency', e.target.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
          {form.urgency ? (
            <button
              type="button"
              onClick={() => updateField('urgency', '')}
              className="text-sm text-slate-500 underline hover:text-slate-700"
            >
              Clear
            </button>
          ) : null}
        </div>
      </fieldset>

      {validationError ? (
        <p role="alert" className="text-sm text-rose-700">
          {validationError}
        </p>
      ) : null}

      {submitError ? (
        <ErrorState title="Could not create ticket" message={submitError} />
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <LoadingSpinner label="Creating…" /> : 'Create ticket'}
        </button>
      </div>
    </form>
  );
}
