import { apiUrl, fetchJson } from '@/lib/api-client';

/**
 * `SUPER_ADMIN` is the one seeded platform admin (unrestricted). `EMPLOYEE` is a Livik employee
 * logging into LK Space with their own Livik credentials — their access is whatever their
 * assigned PlatformRoleAccess resolves to (see backend's resolvePlatformAccess), never
 * unrestricted by default.
 */
export type PlatformAdminRole = 'SUPER_ADMIN' | 'EMPLOYEE';
export type CompanyUserRole = 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'EMPLOYEE';

export interface PlatformAdminProfile {
  kind: 'platform-admin';
  id: string;
  name: string;
  mobile: string;
  role: PlatformAdminRole;
  /** null = unrestricted (SUPER_ADMIN, always) — an EMPLOYEE session is gated by this exactly like a CompanyUserProfile's access. */
  access: UserAccess | null;
}

export interface AccessGrant {
  moduleCode: string;
  /** null = this grant covers the whole module, not one specific tab. */
  tabCode: string | null;
}

/**
 * What this user can see and do, resolved from their assigned RoleAccess.
 * `null` = unrestricted (sees every module/tab, can do everything) — always true for ADMIN, and
 * also true for any other role with no RoleAccess assigned yet.
 */
export interface UserAccess {
  grants: AccessGrant[];
  moduleCodes: string[];
  /** Every rightName this user's RoleAccess grants, e.g. "productiondetails_all_edit". Empty (not missing) when no RoleAccess is assigned. */
  rights: string[];
  /** LK Space (platform-admin) sessions only — the assigned PlatformRoleAccess's display name (e.g. "Manager"), or null if none assigned. Absent/undefined for company-user sessions. */
  roleName?: string | null;
}

export interface CompanyUserProfile {
  kind: 'company-user';
  id: string;
  name: string | null;
  mobile: string;
  role: CompanyUserRole;
  companyId: string;
  company: { id: string; name: string; companyCode: string };
  access: UserAccess | null;
}

export type AuthUser = PlatformAdminProfile | CompanyUserProfile;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? 'Login failed');
  }
  return payload.data;
}

/**
 * The backend keeps platform admins (super admin, `platform_admins` table)
 * and company users (`users` table) as separate login endpoints with no
 * shared "who am I" call — a single mobile+password form tries the
 * platform-admin login first and falls back to the company login on
 * invalid credentials, since only one platform admin can ever exist.
 */
export async function login(mobile: string, password: string): Promise<AuthUser> {
  try {
    const { admin, access } = await postJson<{ admin: Omit<PlatformAdminProfile, 'kind' | 'access'>; access: UserAccess | null }>(
      '/platform/admin/login',
      { mobile, password },
    );
    return { kind: 'platform-admin', ...admin, access };
  } catch {
    const { user, company, access } = await postJson<{
      user: Omit<CompanyUserProfile, 'kind' | 'company' | 'access'>;
      company: CompanyUserProfile['company'];
      access: UserAccess | null;
    }>('/company/auth/login', { mobile, password });
    return { kind: 'company-user', ...user, company, access };
  }
}

/**
 * Re-resolves the current session's profile + access from the server (GET /me) — used to pick
 * up a RoleAccess change an admin made after this session's last login, without re-authenticating.
 * Returns null if the session cookie is missing/expired (apiFetch's own 401 handling already
 * logs the user out in that case via the 'auth:session-expired' event).
 */
export async function fetchCurrentUser(): Promise<CompanyUserProfile | null> {
  try {
    const { data } = await fetchJson<{
      data: {
        user: Omit<CompanyUserProfile, 'kind' | 'company' | 'access'>;
        company: CompanyUserProfile['company'];
        access: UserAccess | null;
      };
    }>('/company/auth/me');
    return { kind: 'company-user', ...data.user, company: data.company, access: data.access };
  } catch (err) {
    // Swallowed deliberately (offline, expired session, etc. are all fine to ignore here) —
    // logged so a genuine bug doesn't look identical to "nothing happened" in devtools.
    console.error('fetchCurrentUser failed:', err);
    return null;
  }
}

/**
 * Re-resolves the current LK Space session's profile + access from the server (GET
 * /platform/admin/me) — the platform-admin mirror of fetchCurrentUser, so an already-logged-in
 * Livik employee picks up a role change without re-authenticating. Returns null on failure
 * (expired session, offline, etc.) — same convention as fetchCurrentUser.
 */
export async function fetchCurrentPlatformAdmin(): Promise<PlatformAdminProfile | null> {
  try {
    const { data } = await fetchJson<{ data: { admin: Omit<PlatformAdminProfile, 'kind' | 'access'>; access: UserAccess | null } }>(
      '/platform/admin/me',
    );
    return { kind: 'platform-admin', ...data.admin, access: data.access };
  } catch (err) {
    console.error('fetchCurrentPlatformAdmin failed:', err);
    return null;
  }
}

/**
 * Clears the httpOnly cookies for both company users and platform admins.
 */
export async function logoutRequest(): Promise<void> {
  try {
    await Promise.allSettled([
      postJson('/company/auth/logout', {}),
      postJson('/platform/admin/logout', {}),
    ]);
  } catch {
    // Ignore errors (e.g., if one session wasn't active anyway)
  }
}
