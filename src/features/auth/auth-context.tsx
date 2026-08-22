import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { login as loginRequest, type AuthUser } from './auth-service';
import { AUTH_STORAGE_KEY as STORAGE_KEY } from '@/lib/api-client';

interface AuthContextValue {
  user: AuthUser | null;
  login: (mobile: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  // The session itself lives in an httpOnly cookie the backend sets; this just
  // remembers which shell/role that cookie belongs to across page reloads.
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // api-client.ts broadcasts this when a request 401s and the refresh-cookie retry also fails
  // (refresh token itself expired/missing) — the only recovery left is a fresh login.
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
    }
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  async function login(mobile: string, password: string) {
    const nextUser = await loginRequest(mobile, password);
    setUser(nextUser);
    return nextUser;
  }

  function logout() {
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/**
 * Where a freshly authenticated user should land. The platform's super admin
 * (PlatformAdminRole.SUPER_ADMIN) owns onboarding new companies, so they land
 * in Livik Admin by default; every other role works from the production
 * dashboard.
 */
export function defaultRouteFor(user: AuthUser): string {
  if (user.kind === 'platform-admin') return '/admin';
  if (user.role === 'ADMIN') return '/production';
  return '/dashboard';
}
