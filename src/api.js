/**
 * Base URL for backend API. In dev, Vite proxies /api to the server (see vite.config.js).
 * Set VITE_API_URL in .env (e.g. http://localhost:3000) if the backend runs on another origin.
 */
export const API_BASE = import.meta.env.VITE_API_URL || '';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
