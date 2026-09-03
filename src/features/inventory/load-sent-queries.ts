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
  fabricWeight?: number;
  fwWeight?: number;
  bwWeight?: number;
  loadSent?: {
    fabricWeight?: number;
    vehicleNo?: string;
    driverName?: string;
  };
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
  date: string; // e.g. "2026-08-20"
  colorId: string;
  sizeId: string;
  fabricWeight: number;
  fwWeight?: number;
  bwWeight?: number;
  vehicleNo?: string;
  driverName?: string;
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

/** LoadSentRecord's weight can come back nested under `loadSent` or top-level, depending on the endpoint. */
export function getLoadSentWeight(record: LoadSentRecord): number {
  return record.loadSent?.fabricWeight ?? record.fabricWeight ?? 0;
}
