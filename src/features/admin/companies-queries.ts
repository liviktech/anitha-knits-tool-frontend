import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, fetchJson } from '@/lib/api-client';
import type { PaginationMeta } from '@/lib/api-types';

/** Matches the real API's CompanySummary schema (see /api/docs). */
export interface Company {
  id: string;
  name: string;
  address: string | null;
  gst: string | null;
  adminMobile: string;
  companyCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyListResponse {
  success: boolean;
  data: Company[];
  meta: PaginationMeta;
}

export interface CompanyResponse {
  success: boolean;
  data: Company;
}

export interface CompanyUser {
  id: string;
  mobile: string;
  name: string | null;
  role: 'ADMIN' | 'MANAGER' | 'SUPERVISOR';
  isActive: boolean;
  createdAt: string;
}

export interface CompanyUsersResponse {
  success: boolean;
  data: CompanyUser[];
}

/** Matches SignupRequest — additionalProperties: false, so send exactly this shape. */
export interface CompanyCreatePayload {
  companyName: string;
  companyAddress?: string;
  gst?: string;
  companyCode: string;
  adminMobile: string;
  adminPassword: string;
  adminName?: string;
}

/** Matches CompanyUpdateRequest — every field optional, at least one required. Excludes adminPasswordHash (resetting the admin password is a separate concern). */
export interface CompanyUpdatePayload {
  name?: string;
  address?: string | null;
  gst?: string | null;
  companyCode?: string;
  adminMobile?: string;
  isActive?: boolean;
}

export const companiesKeys = {
  all: ['platform-companies'] as const,
  list: (query: string) => [...companiesKeys.all, 'list', query] as const,
  detail: (id: string) => [...companiesKeys.all, 'detail', id] as const,
  users: (id: string) => [...companiesKeys.all, 'users', id] as const,
};

export function useCompanies(query: string = '', enabled: boolean = true) {
  return useQuery({
    queryKey: companiesKeys.list(query),
    queryFn: () => fetchJson<CompanyListResponse>(`/platform/admin/companies${query}`),
    enabled,
  });
}

export function useCompany(id: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: companiesKeys.detail(id ?? ''),
    queryFn: () => fetchJson<CompanyResponse>(`/platform/admin/companies/${id}`),
    enabled: enabled && !!id,
  });
}

export function useCompanyUsers(id: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: companiesKeys.users(id ?? ''),
    queryFn: () => fetchJson<CompanyUsersResponse>(`/platform/admin/companies/${id}/users`),
    enabled: enabled && !!id,
  });
}

/** Permanently deletes a company; cascades server-side to its users/employees/all other data. */
export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/platform/admin/companies/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to delete company');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });
    },
  });
}

/** Partially updates a company (PATCH). Use to toggle isActive or change any field. */
export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CompanyUpdatePayload }) => {
      const response = await apiFetch(`/platform/admin/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to update company');
      }
      return response.json() as Promise<CompanyResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });
    },
  });
}

export function formatCompanyDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
