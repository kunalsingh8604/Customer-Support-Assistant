import { apiPath } from '../config/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  const response = await fetch(apiPath(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status);
  }

  return data;
}

export const ticketsApi = {
  list: () => request('/tickets'),
  get: (id) => request(`/tickets/${id}`),
  create: (body) =>
    request('/tickets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateStatus: (id, status) =>
    request(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  history: (id) => request(`/tickets/${id}/history`),
  analyze: (id) =>
    request(`/tickets/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  approveResponse: (id) =>
    request(`/tickets/${id}/approve-response`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  rejectResponse: (id, reason) =>
    request(`/tickets/${id}/reject-response`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  approveAction: (id) =>
    request(`/tickets/${id}/approve-action`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  rejectAction: (id, reason) =>
    request(`/tickets/${id}/reject-action`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || null }),
    }),
};
