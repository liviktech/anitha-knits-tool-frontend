import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
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

export function formatCompanyDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
