import type { AuthUser } from '@/features/auth/auth-service';
import { can } from './access';
import { RIGHTS } from './permissions';

function companyRole(user: AuthUser | null | undefined) {
  return user?.kind === 'company-user' ? user.role : null;
}

/**
 * Mirrors the backend's productionCeilings.ts assertCanCreateProductionRecord exactly — these
 * hard ceilings are layered on top of (not replaced by) the plain Right/RoleAccess grant system,
 * so the frontend must reproduce them rather than gating create on can(RIGHTS.production.add) alone:
 *
 *   ADMIN      always.
 *   MANAGER    never — hard block, regardless of any right assigned.
 *   SUPERVISOR only with the ADD right on Production Details.
 */
export function canCreateProductionRecord(user: AuthUser | null | undefined): boolean {
  const role = companyRole(user);
  if (role === 'ADMIN') return true;
  if (role === 'MANAGER') return false;
  if (role === 'SUPERVISOR') return can(user, RIGHTS.production.add);
  return false;
}

/**
 * Mirrors assertCanUpdateProductionRecord: ADMIN always (even on an approved record);
 * SUPERVISOR never; MANAGER only on a not-yet-approved record and only with the EDIT right.
 */
export function canEditProductionRecord(user: AuthUser | null | undefined, isApproved: boolean): boolean {
  const role = companyRole(user);
  if (role === 'ADMIN') return true;
  if (role === 'SUPERVISOR') return false;
  if (role === 'MANAGER') return !isApproved && can(user, RIGHTS.production.edit);
  return false;
}

/**
 * Mirrors assertCanDeleteProductionRecord: ADMIN-only, unconditionally — not gated by the
 * Right/RoleAccess system at all, and (unlike edit) not blocked by isApproved either.
 */
export function canDeleteProductionRecord(user: AuthUser | null | undefined): boolean {
  return companyRole(user) === 'ADMIN';
}
