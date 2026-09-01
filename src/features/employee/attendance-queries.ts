import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson, apiFetch } from '@/lib/api-client';

export interface EmployeeData {
  id: string;
  name: string;
  employeeDetails?: {
    customUserId: string;
    designation: string;
  };
}

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  date: string;
  status: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'ABSENT' | 'HALF_DAY' | 'COMPANY_HOLIDAY';
  remarks?: string;
  employee: EmployeeData;
}

export function useAttendanceRecords(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['attendance', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await fetchJson<{ data: AttendanceRecord[] }>(
        `/company/attendance${queryStr}`
      );
      return response.data;
    },
  });
}

export interface BulkAttendancePayload {
  date: string;
  records: {
    employeeId: string;
    status: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'ABSENT' | 'HALF_DAY' | 'COMPANY_HOLIDAY';
    remarks?: string;
  }[];
}

export function useUpsertAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkAttendancePayload) => {
      const response = await apiFetch('/company/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to save attendance');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
