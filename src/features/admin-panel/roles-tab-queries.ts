import { useQuery } from '@tanstack/react-query';
import { apiFetch, fetchJson } from '@/lib/api-client';
import { useApiMutation } from '@/lib/use-api-mutation';

export type RightAction = 'VIEW' | 'ADD' | 'EDIT' | 'DELETE';

export interface ModuleRecord {
  id: string;
  moduleCode: string;
  moduleName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TabRecord {
  id: string;
  moduleId: string;
  moduleName: string;
  tabCode: string;
  tabName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RightRecord {
  id: string;
  moduleId: string;
  moduleName: string;
  /** null = this right covers the whole module, not one specific tab. */
  tabId: string | null;
  tabName: string | null;
  action: RightAction;
  /** Server-derived, e.g. "productiondetails_all_edit" — never admin-typed. */
  rightName: string;
  /** Server-derived, e.g. "Production Details – Edit" — never admin-typed. */
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleAccessRecord {
  id: string;
  roleName: string;
  description: string | null;
  effectiveDate?: string;
  rightIds: string[];
  createdAt: string;
  updatedAt: string;
}

async function fetchList<T>(path: string): Promise<T[]> {
  const res = await fetchJson<{ data: T[] }>(path);
  return res.data;
}

export const moduleKeys = { all: ['modules'] as const };
export const tabKeys = { all: ['tabs'] as const };
export const rightKeys = { all: ['rights'] as const };
export const roleAccessKeys = { all: ['role-access'] as const };

export function useModules() {
  return useQuery({
    queryKey: moduleKeys.all,
    queryFn: () => fetchList<ModuleRecord>('/modules?limit=100'),
  });
}

export function useTabs() {
  return useQuery({
    queryKey: tabKeys.all,
    queryFn: () => fetchList<TabRecord>('/tabs?limit=100'),
  });
}

export function useRights() {
  return useQuery({
    queryKey: rightKeys.all,
    queryFn: () => fetchList<RightRecord>('/rights?limit=100'),
  });
}

export function useRoleAccesses() {
  return useQuery({
    queryKey: roleAccessKeys.all,
    queryFn: () => fetchList<RoleAccessRecord>('/role-access?limit=100'),
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

export interface RightFormInput {
  moduleId: string;
  tabId: string | null;
  action: RightAction;
}

export function useCreateRight() {
  return useApiMutation<RightFormInput>(
    (data) => postJson('/rights', data),
    [rightKeys.all],
  );
}

export function useUpdateRight() {
  return useApiMutation<{ id: string } & RightFormInput>(
    ({ id, ...data }) => patchJson(`/rights/${id}`, data),
    [rightKeys.all],
  );
}

export function useDeleteRight() {
  return useApiMutation<string>(
    (id) => apiFetch(`/rights/${id}`, { method: 'DELETE' }),
    [rightKeys.all, roleAccessKeys.all],
  );
}

export interface RoleAccessFormInput {
  roleName: string;
  description: string;
  rightIds: string[];
}

export function useCreateRoleAccess() {
  return useApiMutation<RoleAccessFormInput>(
    (data) => postJson('/role-access', data),
    [roleAccessKeys.all],
  );
}

export function useUpdateRoleAccess() {
  return useApiMutation<{ id: string } & RoleAccessFormInput>(
    ({ id, ...data }) => patchJson(`/role-access/${id}`, data),
    [roleAccessKeys.all],
  );
}

export function useDeleteRoleAccess() {
  return useApiMutation<string>(
    (id) => apiFetch(`/role-access/${id}`, { method: 'DELETE' }),
    [roleAccessKeys.all, ['employees']],
  );
}

export function useAssignRoleAccess() {
  return useApiMutation<{ roleAccessId: string; employeeIds: string[] }>(
    ({ roleAccessId, employeeIds }) => postJson(`/role-access/${roleAccessId}/assign`, { employeeIds }),
    [roleAccessKeys.all, ['employees']],
  );
}
