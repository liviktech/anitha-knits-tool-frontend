import type { AuthUser } from '@/features/auth/auth-service';
import { can } from './access';
import { RIGHTS } from './permissions';

function companyRole(user: AuthUser | null | undefined) {
  return user?.kind === 'company-user' ? user.role : null;
}

/**
 * Mirrors the backend's productionCeilings.ts assertCanCreateProductionRecord exactly — per the
 * PRD ("Manager — create, manage, review, approve, or reject production entries"; "Supervisor —
 * create and edit production entries"), both MANAGER and SUPERVISOR can create with the ADD right
 * on Production Details; only ADMIN is unconditional.
 */
export function canCreateProductionRecord(user: AuthUser | null | undefined): boolean {
  const role = companyRole(user);
  if (role === 'ADMIN') return true;
  if (role === 'MANAGER' || role === 'SUPERVISOR') return can(user, RIGHTS.production.add);
  return false;
}

/**
 * Mirrors assertCanUpdateProductionRecord: ADMIN always (even on an approved record); MANAGER and
 * SUPERVISOR can edit a not-yet-approved record with the EDIT right on Production Details.
 */
export function canEditProductionRecord(user: AuthUser | null | undefined, isApproved: boolean): boolean {
  const role = companyRole(user);
  if (role === 'ADMIN') return true;
  if (role === 'MANAGER' || role === 'SUPERVISOR') return !isApproved && can(user, RIGHTS.production.edit);
  return false;
}

/**
 * Mirrors assertCanDeleteProductionRecord: ADMIN-only, unconditionally — not gated by the
 * Right/RoleAccess system at all, and (unlike edit) not blocked by isApproved either.
 */
export function canDeleteProductionRecord(user: AuthUser | null | undefined): boolean {
  return companyRole(user) === 'ADMIN';
}
