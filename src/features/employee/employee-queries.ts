import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, fetchJson } from '@/lib/api-client';

export interface EmployeeDetails {
  customUserId: string;
  designation?: string | null;
  address?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  salary?: number | null;
  aadhaarNumber?: string | null;
  joiningDate?: string | null;
}

export interface Employee {
  id: string;
  companyId: string;
  name?: string | null;
  mobile: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employeeDetails?: EmployeeDetails | null;
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
      const response = await fetchJson<{ data: Employee[] }>(`/company/employee${query ? `?${query}` : ''}`);
      return response.data;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => {
      const response = await fetchJson<{ data: Employee }>(`/company/employee/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Employee> & { employeeDetails?: Partial<EmployeeDetails> }) => {
      const { name, mobile, employeeDetails } = data;
      const payload = {
        name,
        mobile,
        designation: employeeDetails?.designation,
        address: employeeDetails?.address,
        gender: employeeDetails?.gender,
        salary: employeeDetails?.salary,
        aadhaarNumber: employeeDetails?.aadhaarNumber,
        joiningDate: employeeDetails?.joiningDate,
      };
      const response = await apiFetch('/company/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> & { employeeDetails?: Partial<EmployeeDetails> } }) => {
      const { name, mobile, isActive, employeeDetails } = data;
      const payload = {
        name,
        mobile,
        isActive,
        designation: employeeDetails?.designation,
        address: employeeDetails?.address,
        gender: employeeDetails?.gender,
        salary: employeeDetails?.salary,
        aadhaarNumber: employeeDetails?.aadhaarNumber,
        joiningDate: employeeDetails?.joiningDate,
      };
      // Remove undefined values
      const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

      const response = await apiFetch(`/company/employee/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to update employee');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
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
