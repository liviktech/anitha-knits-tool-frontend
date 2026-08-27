import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { MasterDataRef, PaginationMeta } from '@/lib/api-types';

export type InventoryType = 'HDPE' | 'CHEMICAL' | 'COLOR';

export const inventoryTypeLabels: Record<InventoryType, string> = {
  HDPE: 'HDPE',
  CHEMICAL: 'Chemical',
  COLOR:'Color',
};

/**
 * Matches the real API's InventoryRecord schema (see /api/docs). This is the
 * current standing balance for one item (one type + brand/chemical/color),
 * updated in place by POST — not a per-transaction log entry. `name` is
 * auto-filled server-side from whichever of brand/chemical/color is linked.
 */
export interface InventoryRecord {
  id: string;
  date: string;
  type: InventoryType;
  name: string;
  weightKg: number;
  DC_NUMBER: string;
  brand: MasterDataRef | null;
  chemical: MasterDataRef | null;
  color: MasterDataRef | null;
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

/**
 * Matches InventoryCreateRequest — additionalProperties: false, so send
 * exactly this shape. quantityKg is ADDED to the item's current balance, not
 * set as the new total. Send exactly one of brandId/chemicalId/colorId,
 * matching type.
 */
export interface InventoryCreatePayload {
  date?: string; // date, e.g. "2026-08-20" — optional, defaults to now server-side
  type: InventoryType;
  brandId?: string;
  chemicalId?: string;
  colorId?: string;
  quantityKg: number;
  DC: string;
}

/**
 * Matches InventoryUpdateRequest — a manual correction of the balance
 * already on file. Item identity (type/brandId/chemicalId/colorId) cannot
 * be changed here; weightKg SETS the balance directly (unlike create's
 * additive quantityKg).
 */
export interface InventoryUpdatePayload {
  date?: string;
  weightKg?: number;
  DC?: string;
}

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
