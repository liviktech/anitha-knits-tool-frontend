import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, fetchJson } from '@/lib/api-client';
import type { CompanyUserRole } from '@/features/auth/auth-service';

export type ManagedRole = Extract<CompanyUserRole, 'EMPLOYEE' | 'MANAGER' | 'SUPERVISOR'>;

export interface EmployeeDetails {
  customUserId?: string | null;
  designation?: string | null;
  address?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  salary?: number | null;
  aadhaarNumber?: string | null;
  joiningDate?: string | null;
  photoUrl?: string | null;
  aadhaarDocumentUrl?: string | null;
  documentName?: string | null;
  aadhaarDocumentUploadedAt?: string | null;
}

export interface Employee {
  id: string;
  companyId: string;
  name?: string | null;
  mobile: string;
  role: ManagedRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employeeDetails?: EmployeeDetails | null;
  roleAccessId?: string | null;
  roleAccess?: { id: string; roleName: string } | null;
}

export interface ListEmployeesResponse {
  data: Employee[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: string) => [...employeeKeys.lists(), { filters }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};

export function useEmployees(query: string = '') {
  return useQuery({
    queryKey: employeeKeys.list(query),
    queryFn: async () => {
      const response = await fetchJson<{ data: Employee[] }>(
        `/company/employee${query ? `?${query}` : ''}`,
      );
      return response.data;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => {
      const response = await fetchJson<{ data: Employee }>(
        `/company/employee/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

/** Appends every non-undefined value as a string field, plus the photo/aadhaarFile files when present. */
function buildEmployeeFormData(
  fields: Record<string, string | number | boolean | null | undefined>,
  files?: { photo?: File | null; aadhaarFile?: File | null },
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    formData.append(key, String(value));
  }
  if (files?.photo) formData.append('photo', files.photo);
  if (files?.aadhaarFile) formData.append('aadhaarFile', files.aadhaarFile);
  return formData;
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Partial<Employee> & {
        password: string;
        employeeDetails?: Partial<EmployeeDetails>;
      } & { photo?: File | null; aadhaarFile?: File | null },
    ) => {
      const { name, mobile, role, password, employeeDetails, photo, aadhaarFile } = data;
      const formData = buildEmployeeFormData(
        {
          name,
          mobile,
          role,
          password,
          designation: employeeDetails?.designation ?? undefined,
          address: employeeDetails?.address ?? undefined,
          gender: employeeDetails?.gender ?? undefined,
          salary: employeeDetails?.salary ?? undefined,
          aadhaarNumber: employeeDetails?.aadhaarNumber ?? undefined,
          joiningDate: employeeDetails?.joiningDate ?? undefined,
        },
        { photo, aadhaarFile },
      );
      const response = await apiFetch('/company/employee', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to create employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Employee> & {
        employeeDetails?: Partial<EmployeeDetails>;
      } & { photo?: File | null; aadhaarFile?: File | null };
    }) => {
      const { name, mobile, isActive, employeeDetails, photo, aadhaarFile } =
        data;
      const formData = buildEmployeeFormData(
        {
          name,
          mobile,
          isActive,
          designation: employeeDetails?.designation ?? undefined,
          address: employeeDetails?.address ?? undefined,
          gender: employeeDetails?.gender ?? undefined,
          salary: employeeDetails?.salary ?? undefined,
          aadhaarNumber: employeeDetails?.aadhaarNumber ?? undefined,
          joiningDate: employeeDetails?.joiningDate ?? undefined,
        },
        { photo, aadhaarFile },
      );

      const response = await apiFetch(`/company/employee/${id}`, {
        method: 'PATCH',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to update employee');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/company/employee/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to delete employee');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}
