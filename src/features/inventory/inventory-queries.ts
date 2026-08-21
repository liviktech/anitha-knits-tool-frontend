import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { PaginationMeta } from '@/lib/api-types';

/**
 * The live /api/docs.json still advertises RAW_MATERIAL/CHEMICAL/YARN/FABRIC
 * for this field — that's a stale doc. Confirmed against the real backend
 * (POST validation error message) that the actual accepted values are these
 * three; YARN/FABRIC now reject with a 400.
 */
export type InventoryType = 'RAW_MATERIAL' | 'CHEMICAL' | 'COLOR';

export const inventoryTypeLabels: Record<InventoryType, string> = {
  RAW_MATERIAL: 'Raw Material',
  CHEMICAL: 'Chemical',
  COLOR:'Color',
};

/** Matches the real API's InventoryRecord schema (see /api/docs). */
export interface InventoryRecord {
  id: string;
  date: string;
  type: InventoryType;
  name: string;
  weightKg: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface InventoryListResponse {
  success: boolean;
  data: InventoryRecord[];
  meta: PaginationMeta;
}

/** Matches InventoryCreateRequest — additionalProperties: false, so send exactly this shape. */
export interface InventoryCreatePayload {
  date?: string; // date, e.g. "2026-08-20" — optional, defaults to now server-side
  type: InventoryType;
  name: string;
  weightKg: number;
}

/** Matches InventoryUpdateRequest — every field optional, at least one required. */
export type InventoryUpdatePayload = Partial<InventoryCreatePayload>;

export const inventoryKeys = {
  all: ['inventory-records'] as const,
  list: (query: string) => [...inventoryKeys.all, 'list', query] as const,
};

export function useInventoryRecords(query: string = '', enabled: boolean = true) {
  return useQuery({
    queryKey: inventoryKeys.list(query),
    queryFn: () => fetchJson<InventoryListResponse>(`/inventory${query}`),
    enabled,
  });
}

/** Sums weightKg across inventory records matching a type (and optionally an exact, case-insensitive name). */
export function sumInventoryWeight(records: InventoryRecord[], type: InventoryType, name?: string): number {
  return records
    .filter((r) => r.type === type && (name === undefined || r.name.toLowerCase() === name.toLowerCase()))
    .reduce((sum, r) => sum + r.weightKg, 0);
}
