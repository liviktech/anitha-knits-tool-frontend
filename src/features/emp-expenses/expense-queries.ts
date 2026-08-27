import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { PaginationMeta } from '@/lib/api-types';

/** Matches the real API's ExpenseRecord schema (see /api/docs). expenseId (e.g. "EXP-001") is generated server-side — never client-supplied. */
export interface ExpenseRecord {
  id: string;
  expenseId: string;
  date: string;
  expenseName: string;
  amount: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ExpenseListResponse {
  success: boolean;
  data: ExpenseRecord[];
  meta: PaginationMeta;
}

/** Matches ExpenseCreateRequest — additionalProperties: false. Omit expenseId; the server assigns it. */
export interface ExpenseCreatePayload {
  date?: string; // "YYYY-MM-DD" — optional, defaults to now server-side
  expenseName: string;
  amount: number;
}

/** Matches ExpenseUpdateRequest — every field optional, at least one required. expenseId is immutable. */
export interface ExpenseUpdatePayload {
  date?: string;
  expenseName?: string;
  amount?: number;
}

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (query: string) => [...expenseKeys.all, 'list', query] as const,
};

export function useExpenses(query: string = '') {
  return useQuery({
    queryKey: expenseKeys.list(query),
    queryFn: () => fetchJson<ExpenseListResponse>(`/expenses${query}`),
  });
}
