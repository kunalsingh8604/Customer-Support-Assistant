/**
 * Backend base URL (no trailing slash).
 * Set VITE_API_URL in production to your Render service URL.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function apiPath(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}/api${normalized}`;
}
