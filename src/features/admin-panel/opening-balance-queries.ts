import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { MasterDataRef, PaginationMeta } from '@/lib/api-types';

/* ---------------------------------------------------------------------- */
/* Raw Materials (HDPE / Chemicals / Colors) — /opening-balance/raw-materials */
/* ---------------------------------------------------------------------- */

export type OpeningBalanceRawMaterialType = 'HDPE' | 'CHEMICAL' | 'COLOR';

export interface OpeningBalanceRawMaterialRecord {
  id: string;
  groupId: string;
  date: string;
  type: OpeningBalanceRawMaterialType;
  name: string;
  weightKg: number;
  bagCount: number | null;
  brand: MasterDataRef | null;
  chemical: MasterDataRef | null;
  color: MasterDataRef | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface OpeningBalanceRawMaterialListResponse {
  success: boolean;
  data: OpeningBalanceRawMaterialRecord[];
  meta: PaginationMeta;
}

export interface OpeningBalanceRawMaterialItemPayload {
  type: OpeningBalanceRawMaterialType;
  brandId?: string;
  chemicalId?: string;
  colorId?: string;
  weightKg: number;
  bagCount?: number;
}

/** Matches the create/replace request shape — POST creates a new group, PATCH /:groupId replaces it. */
export interface OpeningBalanceRawMaterialGroupPayload {
  date: string;
  items: OpeningBalanceRawMaterialItemPayload[];
}

export const openingBalanceRawMaterialKeys = {
  all: ['opening-balance-raw-materials'] as const,
  list: (query: string) => [...openingBalanceRawMaterialKeys.all, 'list', query] as const,
};

export function useOpeningBalanceRawMaterials(query: string = '', enabled: boolean = true) {
  return useQuery({
    queryKey: openingBalanceRawMaterialKeys.list(query),
    queryFn: () => fetchJson<OpeningBalanceRawMaterialListResponse>(`/opening-balance/raw-materials${query}`),
    enabled,
  });
}

/* ---------------------------------------------------------------------- */
/* Wastage — /opening-balance/wastage                                      */
/* ---------------------------------------------------------------------- */

export interface OpeningBalanceWastageRecord {
  id: string;
  date: string;
  color: MasterDataRef | null;
  size: MasterDataRef | null;
  chemical: MasterDataRef | null;
  extruderLumpsKg: number;
  extruderLoomsWasteKg: number;
  loomsYarnWasteKg: number;
  fabricWasteKg: number;
  fabricBitwasteKg: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface OpeningBalanceWastageListResponse {
  success: boolean;
  data: OpeningBalanceWastageRecord[];
  meta: PaginationMeta;
}

export interface OpeningBalanceWastagePayload {
  date: string;
  colorId?: string;
  sizeId?: string;
  chemicalId?: string;
  extruderLumpsKg: number;
  extruderLoomsWasteKg: number;
  loomsYarnWasteKg: number;
  fabricWasteKg: number;
  fabricBitwasteKg: number;
}

export const openingBalanceWastageKeys = {
  all: ['opening-balance-wastage'] as const,
  list: (query: string) => [...openingBalanceWastageKeys.all, 'list', query] as const,
};

export function useOpeningBalanceWastage(query: string = '') {
  return useQuery({
    queryKey: openingBalanceWastageKeys.list(query),
    queryFn: () => fetchJson<OpeningBalanceWastageListResponse>(`/opening-balance/wastage${query}`),
  });
}

/* ---------------------------------------------------------------------- */
/* Fabric Stock — /opening-balance/fabric-stock                            */
/* ---------------------------------------------------------------------- */

export interface OpeningBalanceFabricStockRecord {
  id: string;
  date: string;
  color: MasterDataRef | null;
  size: MasterDataRef | null;
  chemical: MasterDataRef | null;
  koraBalanceKg: number;
  fabricStockKg: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface OpeningBalanceFabricStockListResponse {
  success: boolean;
  data: OpeningBalanceFabricStockRecord[];
  meta: PaginationMeta;
}

export interface OpeningBalanceFabricStockPayload {
  date: string;
  colorId?: string;
  sizeId?: string;
  chemicalId?: string;
  koraBalanceKg: number;
  fabricStockKg: number;
}

export const openingBalanceFabricStockKeys = {
  all: ['opening-balance-fabric-stock'] as const,
  list: (query: string) => [...openingBalanceFabricStockKeys.all, 'list', query] as const,
};

export function useOpeningBalanceFabricStock(query: string = '') {
  return useQuery({
    queryKey: openingBalanceFabricStockKeys.list(query),
    queryFn: () => fetchJson<OpeningBalanceFabricStockListResponse>(`/opening-balance/fabric-stock${query}`),
  });
}
