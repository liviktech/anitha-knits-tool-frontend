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
      const { name, mobile, password, employeeDetails, photo, aadhaarFile } = data;
      const formData = buildEmployeeFormData(
        {
          name,
          mobile,
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

export function useDistributeMarketValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      marketValueDate: string;
      totalPool: number;
      allocations: Record<string, number>;
    }) => {
      const response = await fetchJson<{ data: any }>(
        '/company/payroll/market-value',
        {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function usePayrollSummary(month: number, year: number) {
  return useQuery({
    queryKey: [...employeeKeys.lists(), 'payroll-summary', month, year],
    queryFn: async () => {
      const response = await fetchJson<{ data: any[] }>(
        `/company/payroll/summary?month=${month}&year=${year}`,
      );
      return response.data;
    },
  });
}

export function useMarketValueAllocations(month: number, year: number) {
  return useQuery({
    queryKey: [...employeeKeys.lists(), 'market-value-allocations', month, year],
    queryFn: async () => {
      const response = await fetchJson<{ data: Record<string, number> }>(
        `/company/payroll/market-value?month=${month}&year=${year}`,
      );
      return response.data;
    },
  });
}

export function useGrantSalaryAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      employeeId: string;
      amount: number;
      effectiveDate: string;
      repaymentMethod: 'single' | 'emi';
      totalMonths?: number;
    }) => {
      const response = await fetchJson<{ data: any }>(
        '/company/payroll/advance',
        {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.lists(), 'salary-advances'] });
    }
  });
}

export function useGrantMarketValueDeduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      employeeId: string;
      amount: number;
      effectiveDate: string;
    }) => {
      const response = await fetchJson<{ data: any }>(
        '/company/payroll/market-value-deduction',
        {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function useGrantOtherDeduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      employeeId: string;
      amount: number;
      name: string;
      effectiveDate: string;
    }) => {
      const response = await fetchJson<{ data: any }>(
        '/company/payroll/other-deduction',
        {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export type SalaryAdvanceStatus = 'ACTIVE' | 'COMPLETED';

export interface SalaryAdvanceRecord {
  id: string;
  employeeId: string;
  employeeName: string | null;
  customUserId: string | null;
  amount: number;
  effectiveDate: string;
  repaymentMethod: 'single' | 'emi';
  totalMonths: number | null;
  emiAmount: number | null;
  monthsPaid: number;
  monthsRemaining: number;
  paidAmount: number;
  remainingAmount: number;
  status: SalaryAdvanceStatus;
}

/** Every salary advance for the company, with EMI progress (months paid/remaining, status) computed against today. */
export function useSalaryAdvances() {
  return useQuery({
    queryKey: [...employeeKeys.lists(), 'salary-advances'],
    queryFn: async () => {
      const response = await fetchJson<{ data: SalaryAdvanceRecord[] }>('/company/payroll/advance');
      return response.data;
    },
  });
}

export function useSavePayrollRecords() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      month: number;
      year: number;
    }) => {
      const response = await fetchJson<{ data: any }>(
        '/company/payroll/records',
        {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    }
  });
}

export function useUpdatePayrollRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: {
        month: number;
        year: number;
        baseSalary: number;
        daysWorked: number;
        advanceDeduction: number;
        marketValueBonus: number;
        marketValueDeduction: number;
      };
    }) => {
      const response = await fetchJson<{ data: any }>(
        `/company/payroll/records/${employeeId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

/** Clears one employee's payroll record for one month — backs the Payroll tab's Actions > Delete. */
export function useDeletePayrollRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, month, year }: { employeeId: string; month: number; year: number }) => {
      const response = await apiFetch(`/company/payroll/records/${employeeId}?month=${month}&year=${year}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to delete payroll record');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function useSavedPayrollRecords(month: number, year: number) {
  return useQuery({
    queryKey: [...employeeKeys.lists(), 'saved-payroll-records', month, year],
    queryFn: async () => {
      const response = await fetchJson<{ data: any[] }>(
        `/company/payroll/records?month=${month}&year=${year}`,
      );
      return response.data;
    },
  });
}
