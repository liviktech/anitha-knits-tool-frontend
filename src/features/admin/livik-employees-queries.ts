import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { PaginationMeta } from '@/lib/api-types';

/** Sourced read-only from the Livik internal tool's own database (see backend's livikEmployeeService.ts). */
export interface LivikEmployee {
  id: string;
  empId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  designation: string | null;
  department: string | null;
  dateOfJoining: string | null;
  status: string;
  isActive: boolean;
  photo: string | null;
  createdAt: string;
}

export interface LivikEmployeeListResponse {
  success: boolean;
  data: LivikEmployee[];
  meta: PaginationMeta;
}

export const livikEmployeesKeys = {
  all: ['livik-employees'] as const,
  list: (query: string) => [...livikEmployeesKeys.all, 'list', query] as const,
};

export function useLivikEmployees(query: string = '') {
  return useQuery({
    queryKey: livikEmployeesKeys.list(query),
    queryFn: () => fetchJson<LivikEmployeeListResponse>(`/platform/admin/livik-employees${query}`),
  });
}
