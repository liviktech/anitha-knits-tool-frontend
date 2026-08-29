import type { AuthUser } from '@/features/auth/auth-service';

/**
 * Whether `user` can see `moduleCode`. `user.access === null` means unrestricted (ADMIN, or any
 * other role that hasn't been assigned a RoleAccess yet) — everyone else is limited to exactly
 * what their assigned RoleAccess's rights grant. moduleCode values match the seeded
 * Module.moduleCode catalog (see the backend's defaultAccessCatalog.ts).
 */
export function hasModuleAccess(user: AuthUser | null | undefined, moduleCode: string): boolean {
  if (!user || user.kind !== 'company-user') return false;
  if (!user.access) return true;
  return user.access.moduleCodes.includes(moduleCode);
}

/**
 * Whether `user` can see the given tab within `moduleCode`. A module-wide grant (tabCode
 * null — a right created with no specific tab) counts as access to every tab in that module.
 */
export function hasTabAccess(user: AuthUser | null | undefined, moduleCode: string, tabCode: string): boolean {
  if (!user || user.kind !== 'company-user') return false;
  if (!user.access) return true;
  return user.access.grants.some((g) => g.moduleCode === moduleCode && (g.tabCode === tabCode || g.tabCode === null));
}

/**
 * Whether `user` holds the given stable rightName (e.g. "employees_directory_edit"), as
 * resolved server-side from their assigned RoleAccess — see roleAccessService.resolveUserAccess
 * on the backend, the single source of truth this mirrors. `user.access === null` means
 * unrestricted (ADMIN, or any other role with no RoleAccess assigned yet), matching
 * hasModuleAccess/hasTabAccess above.
 *
 * This only reflects plain Right grants. Some modules (Production Details) layer additional
 * hard-coded business rules on top (approval locks, admin-only delete, etc.) — see
 * production-permissions.ts for those instead of calling can() directly for Production actions.
 */
export function can(user: AuthUser | null | undefined, rightName: string): boolean {
  if (!user || user.kind !== 'company-user') return false;
  if (!user.access) return true;
  return user.access.rights.includes(rightName);
}
