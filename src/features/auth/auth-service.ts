import { apiUrl } from '@/lib/api-client';

export type PlatformAdminRole = 'SUPER_ADMIN';
export type CompanyUserRole = 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'EMPLOYEE';

export interface PlatformAdminProfile {
  kind: 'platform-admin';
  id: string;
  name: string;
  mobile: string;
  role: PlatformAdminRole;
}

export interface CompanyUserProfile {
  kind: 'company-user';
  id: string;
  name: string | null;
  mobile: string;
  role: CompanyUserRole;
  companyId: string;
  company: { id: string; name: string; companyCode: string };
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
    const { admin } = await postJson<{ admin: Omit<PlatformAdminProfile, 'kind'> }>(
      '/platform/admin/login',
      { mobile, password },
    );
    return { kind: 'platform-admin', ...admin };
  } catch {
    const { user, company } = await postJson<{
      user: Omit<CompanyUserProfile, 'kind' | 'company'>;
      company: CompanyUserProfile['company'];
    }>('/company/auth/login', { mobile, password });
    return { kind: 'company-user', ...user, company };
  }
}
