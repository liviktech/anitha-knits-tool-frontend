import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { MasterDataRef, PaginationMeta } from '@/lib/api-types';

/** Matches the real API's LoadSentRecord schema (see /api/docs). */
export interface LoadSentRecord {
  id: string;
  date: string;
  productionDate?: string;
  color: MasterDataRef;
  size: MasterDataRef;
  pieceCount: number;
  weightKg: number;
  fabricWeight?: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface LoadSentListResponse {
  success: boolean;
  data: LoadSentRecord[];
  meta: PaginationMeta;
}

/** Matches LoadSentCreateRequest — additionalProperties: false, so send exactly this shape. */
export interface LoadSentCreatePayload {
  date?: string; // date, e.g. "2026-08-20" — optional, defaults to now server-side
  colorId: string;
  sizeId: string;
  pieceCount: number;
  weightKg: number;
}

/** Matches LoadSentUpdateRequest — every field optional, at least one required. */
export type LoadSentUpdatePayload = Partial<LoadSentCreatePayload>;

export const loadSentKeys = {
  all: ['load-sent-records'] as const,
  list: (query: string) => [...loadSentKeys.all, 'list', query] as const,
};

export function useLoadSentRecords(query: string = '', enabled = true) {
  return useQuery({
    queryKey: loadSentKeys.list(query),
    queryFn: () => fetchJson<LoadSentListResponse>(`/load-sent${query}`),
    enabled,
  });
}
