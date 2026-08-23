
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

if (!API_BASE_URL) {
  console.error('VITE_API_BASE_URL is not set — API requests will fail. Set it in .env.');
}

/** Builds a full backend URL from a path relative to VITE_API_BASE_URL. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// Shared with auth-context.tsx, which owns reading/writing the stored user. Kept here (rather
// than the other way around) so this module never has to import from auth-context.
export const AUTH_STORAGE_KEY = 'ak_auth_user';

type SessionKind = 'platform-admin' | 'company-user';

function currentSessionKind(): SessionKind | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { kind?: SessionKind }).kind ?? null;
  } catch {
    return null;
  }
}

function refreshPathFor(kind: SessionKind): string {
  return kind === 'platform-admin' ? '/platform/admin/refresh' : '/company/auth/refresh';
}

let pendingRefresh: Promise<boolean> | null = null;

/**
 * Calls the refresh endpoint matching the current session kind, exchanging the refresh
 * cookie for a fresh access token. Concurrent 401s dedupe into a single in-flight call.
 */
function refreshSession(): Promise<boolean> {
  const kind = currentSessionKind();
  if (!kind) return Promise.resolve(false);

  if (!pendingRefresh) {
    pendingRefresh = fetch(apiUrl(refreshPathFor(kind)), { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        pendingRefresh = null;
      });
  }
  return pendingRefresh;
}

/**
 * fetch() against the backend configured via VITE_API_BASE_URL, sending the httpOnly auth
 * cookie. The access token cookie is short-lived (15m); on a 401 this transparently retries
 * once via the refresh cookie before giving up. If the refresh also fails, it broadcasts
 * 'auth:session-expired' (auth-context.tsx listens and logs the user out).
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(apiUrl(path), { credentials: 'include', ...init });
  if (response.status !== 401) return response;

  const refreshed = await refreshSession();
  if (!refreshed) {
    window.dispatchEvent(new Event('auth:session-expired'));
    return response;
  }
  return fetch(apiUrl(path), { credentials: 'include', ...init });
}

/** apiFetch() + JSON parsing. */
export async function fetchJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}

/**
 * Extracts the backend's own error message from a failed Response (the
 * ApiError envelope is `{ success: false, error: { code, message, details } }`),
 * falling back to a generic message if the body isn't in that shape — e.g. a
 * network-level failure with no JSON body, or an upstream proxy's own error
 * page. Never throws.
 */
export async function extractApiErrorMessage(response: Response, fallback = 'Something went wrong. Please try again.'): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}
