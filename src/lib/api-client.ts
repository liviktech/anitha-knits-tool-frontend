const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

if (!rawBaseUrl && import.meta.env.PROD) {
  console.error('VITE_API_BASE_URL is not set — API requests will fail. Set it in .env.');
}

/**
 * The deployed backend sends no CORS headers, so a direct browser fetch to
 * its full URL is blocked. In dev, requests instead go same-origin through
 * the Vite proxy (see vite.config.ts), which forwards them server-to-server
 * where CORS doesn't apply. Production still needs a real CORS fix on the
 * backend — this only unblocks local development.
 */
const API_BASE_URL = import.meta.env.DEV && rawBaseUrl ? new URL(rawBaseUrl).pathname : rawBaseUrl;

/** Builds a full backend URL from a path relative to VITE_API_BASE_URL. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** fetch() + JSON parsing against the backend configured via VITE_API_BASE_URL. */
export async function fetchJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}
