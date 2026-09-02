import { useQuery } from '@tanstack/react-query';
import { apiFetch, fetchJson } from '@/lib/api-client';
import { useApiMutation } from '@/lib/use-api-mutation';

export type PlatformRightAction = 'VIEW' | 'ADD' | 'EDIT' | 'DELETE';

export interface PlatformModuleRecord {
  id: string;
  moduleCode: string;
  moduleName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformTabRecord {
  id: string;
  moduleId: string;
  moduleName: string;
  tabCode: string;
  tabName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformRightRecord {
  id: string;
  moduleId: string;
  moduleName: string;
  /** null = this right covers the whole module, not one specific tab. */
  tabId: string | null;
  tabName: string | null;
  action: PlatformRightAction;
  /** Server-derived, e.g. "companies_all_edit" — never admin-typed. */
  rightName: string;
  /** Server-derived, e.g. "Companies – Edit" — never admin-typed. */
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformRoleAccessRecord {
  id: string;
  roleName: string;
  description: string | null;
  effectiveDate?: string;
  rightIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** One Livik employee's current LK Space grant (or lack of one) — backs the "current role" badge in the Assign Role dialog. */
export interface PlatformEmployeeAccessRecord {
  livikEmpId: string;
  roleAccessId: string | null;
  roleName: string | null;
  isActive: boolean;
}

async function fetchList<T>(path: string): Promise<T[]> {
  const res = await fetchJson<{ data: T[] }>(path);
  return res.data;
}

export const platformModuleKeys = { all: ['platform-modules'] as const };
export const platformTabKeys = { all: ['platform-tabs'] as const };
export const platformRightKeys = { all: ['platform-rights'] as const };
export const platformRoleAccessKeys = { all: ['platform-role-access'] as const };
export const platformEmployeeAccessKeys = { all: ['platform-employee-access'] as const };

export function usePlatformModules() {
  return useQuery({
    queryKey: platformModuleKeys.all,
    queryFn: () => fetchList<PlatformModuleRecord>('/platform/admin/modules?limit=100'),
  });
}

export function usePlatformTabs() {
  return useQuery({
    queryKey: platformTabKeys.all,
    queryFn: () => fetchList<PlatformTabRecord>('/platform/admin/tabs?limit=100'),
  });
}

export function usePlatformRights() {
  return useQuery({
    queryKey: platformRightKeys.all,
    queryFn: () => fetchList<PlatformRightRecord>('/platform/admin/rights?limit=100'),
  });
}

export function usePlatformRoleAccesses() {
  return useQuery({
    queryKey: platformRoleAccessKeys.all,
    queryFn: () => fetchList<PlatformRoleAccessRecord>('/platform/admin/role-access?limit=100'),
  });
}

export function usePlatformEmployeeAccess() {
  return useQuery({
    queryKey: platformEmployeeAccessKeys.all,
    queryFn: () => fetchList<PlatformEmployeeAccessRecord>('/platform/admin/role-access/employee-access'),
  });
}

function postJson(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchJson(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export interface PlatformRightFormInput {
  moduleId: string;
  tabId: string | null;
  action: PlatformRightAction;
}

export function useCreatePlatformRight() {
  return useApiMutation<PlatformRightFormInput>(
    (data) => postJson('/platform/admin/rights', data),
    [platformRightKeys.all],
  );
}

export function useUpdatePlatformRight() {
  return useApiMutation<{ id: string } & PlatformRightFormInput>(
    ({ id, ...data }) => patchJson(`/platform/admin/rights/${id}`, data),
    [platformRightKeys.all],
  );
}

export function useDeletePlatformRight() {
  return useApiMutation<string>(
    (id) => apiFetch(`/platform/admin/rights/${id}`, { method: 'DELETE' }),
    [platformRightKeys.all, platformRoleAccessKeys.all],
  );
}

export interface PlatformRoleAccessFormInput {
  roleName: string;
  description: string;
  effectiveDate?: string;
  rightIds: string[];
}

export function useCreatePlatformRoleAccess() {
  return useApiMutation<PlatformRoleAccessFormInput>(
    (data) => postJson('/platform/admin/role-access', data),
    [platformRoleAccessKeys.all],
  );
}

export function useUpdatePlatformRoleAccess() {
  return useApiMutation<{ id: string } & PlatformRoleAccessFormInput>(
    ({ id, ...data }) => patchJson(`/platform/admin/role-access/${id}`, data),
    [platformRoleAccessKeys.all],
  );
}

export function useDeletePlatformRoleAccess() {
  return useApiMutation<string>(
    (id) => apiFetch(`/platform/admin/role-access/${id}`, { method: 'DELETE' }),
    [platformRoleAccessKeys.all, platformEmployeeAccessKeys.all],
  );
}

export function useAssignPlatformRoleAccess() {
  return useApiMutation<{ roleAccessId: string; livikEmpIds: string[] }>(
    ({ roleAccessId, livikEmpIds }) => postJson(`/platform/admin/role-access/${roleAccessId}/assign`, { livikEmpIds }),
    [platformRoleAccessKeys.all, platformEmployeeAccessKeys.all],
  );
}
