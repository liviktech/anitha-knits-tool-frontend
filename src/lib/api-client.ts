
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

if (!API_BASE_URL) {
  console.error('VITE_API_BASE_URL is not set — API requests will fail. Set it in .env.');
}

/** Builds a full backend URL from a path relative to VITE_API_BASE_URL. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** fetch() + JSON parsing against the backend configured via VITE_API_BASE_URL. Sends the httpOnly auth cookie the backend's requireAuth middleware expects. */
export async function fetchJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: 'include', ...init });
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}
