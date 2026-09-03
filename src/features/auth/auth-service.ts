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

async function postJson<T = void>(path: string, body: unknown, fallback = 'Request failed'): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  // A rate-limit response may not carry the usual JSON envelope (e.g. a proxy-level 429), so
  // .json() is allowed to fail here — the message below still falls back to something sane.
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    if (response.status === 429) {
      throw new Error(payload?.error?.message ?? 'Too many requests. Please try again later.');
    }
    throw new Error(payload?.error?.message ?? fallback);
  }
  // Some endpoints (OTP request, password reset) intentionally return `{ success: true }` with
  // no `data` payload — those callers pass T = void and never look at the return value.
  return (payload.data as T) ?? (undefined as T);
}

/**
 * The backend keeps platform admins (super admin, `platform_admins` table) and company users
 * (`users` table) as separate login endpoints — each of the two login pages (/admin-login,
 * /login) knows which kind of account it's authenticating and calls the matching endpoint
 * directly, rather than guessing via a try-then-fallback request.
 */
export async function loginPlatformAdmin(mobile: string, password: string): Promise<PlatformAdminProfile> {
  const { admin, access } = await postJson<{ admin: Omit<PlatformAdminProfile, 'kind' | 'access'>; access: UserAccess | null }>(
    '/platform/admin/login',
    { mobile, password },
    'Login failed',
  );
  return { kind: 'platform-admin', ...admin, access };
}

export async function loginCompanyUser(mobile: string, password: string): Promise<CompanyUserProfile> {
  const { user, company, access } = await postJson<{
    user: Omit<CompanyUserProfile, 'kind' | 'company' | 'access'>;
    company: CompanyUserProfile['company'];
    access: UserAccess | null;
  }>('/company/auth/login', { mobile, password }, 'Login failed');
  return { kind: 'company-user', ...user, company, access };
}

/**
 * Which account family an OTP/reset request targets — picks the URL prefix, matching the
 * split between the company-user and platform-admin login endpoints above.
 */
export type ActorKind = 'company' | 'platform-admin';

function authBasePath(actorKind: ActorKind): string {
  return actorKind === 'platform-admin' ? '/platform/admin' : '/company/auth';
}

/**
 * OTP-login flow, step 1: requests an OTP be sent to `mobile`. Always resolves on a 2xx —
 * the backend deliberately returns a generic success whether or not the mobile number is
 * registered, so this can never be used to enumerate accounts.
 */
export async function requestOtpForLogin(mobile: string, actorKind: ActorKind): Promise<void> {
  await postJson<void>(`${authBasePath(actorKind)}/otp/request-login`, { mobile }, 'Failed to send OTP. Please try again.');
}

/**
 * OTP-login flow, step 2: verifies the OTP and, on success, establishes the same session
 * cookies as the password login endpoints — the response is AuthUser-shaped exactly like
 * loginCompanyUser/loginPlatformAdmin. Throws with error.code one of OTP_INVALID | OTP_EXPIRED |
 * OTP_MAX_ATTEMPTS | AMBIGUOUS_LOGIN | ACCOUNT_INACTIVE on failure (surfaced via the message).
 */
export async function loginWithOtp(mobile: string, otp: string, actorKind: ActorKind): Promise<AuthUser> {
  const path = `${authBasePath(actorKind)}/otp/login`;
  if (actorKind === 'platform-admin') {
    const { admin, access } = await postJson<{ admin: Omit<PlatformAdminProfile, 'kind' | 'access'>; access: UserAccess | null }>(
      path,
      { mobile, otp },
      'Invalid or expired OTP.',
    );
    return { kind: 'platform-admin', ...admin, access };
  }
  const { user, company, access } = await postJson<{
    user: Omit<CompanyUserProfile, 'kind' | 'company' | 'access'>;
    company: CompanyUserProfile['company'];
    access: UserAccess | null;
  }>(path, { mobile, otp }, 'Invalid or expired OTP.');
  return { kind: 'company-user', ...user, company, access };
}

/**
 * Forgot-password flow, step 1: requests an OTP to prove ownership of `mobile` before allowing
 * a reset. Same generic-success/no-account-enumeration behavior as requestOtpForLogin.
 */
export async function requestPasswordResetOtp(mobile: string, actorKind: ActorKind): Promise<void> {
  await postJson<void>(`${authBasePath(actorKind)}/password/otp/request`, { mobile }, 'Failed to send OTP. Please try again.');
}

/**
 * Forgot-password flow, step 2: verifies the OTP and exchanges it for a short-lived resetToken
 * that step 3 (resetPassword) must present. Same failure error.codes as loginWithOtp.
 */
export async function verifyPasswordResetOtp(mobile: string, otp: string, actorKind: ActorKind): Promise<string> {
  const { resetToken } = await postJson<{ resetToken: string }>(
    `${authBasePath(actorKind)}/password/otp/verify`,
    { mobile, otp },
    'Invalid or expired OTP.',
  );
  return resetToken;
}

/**
 * Forgot-password flow, step 3: sets the new password using the resetToken from
 * verifyPasswordResetOtp. Does not establish a session — the user signs in fresh afterward.
 */
export async function resetPassword(mobile: string, resetToken: string, newPassword: string, actorKind: ActorKind): Promise<void> {
  await postJson<void>(
    `${authBasePath(actorKind)}/password/reset`,
    { mobile, resetToken, newPassword },
    'Failed to reset password. Please try again.',
  );
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
