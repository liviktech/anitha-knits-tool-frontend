import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { MasterDataRef, PaginationMeta, WastageRecordSummary } from '@/lib/api-types';
import { useLookups, findIdByName, type Lookups, type LookupItem } from '@/lib/lookups';

export { useLookups, findIdByName, type Lookups, type LookupItem };

export type ExtruderStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface ExtruderDetail {
  brand: MasterDataRef;
  rawMaterialKg: number;
  chemical: MasterDataRef;
  chemicalKg: number;
  colorConsumedKg: number;
  yarnOutputKg: number;
  isRecipeOverridden: boolean;
  overrideReason: string | null;
  bagCount: number | null;
  bagWeightKg: number | null;
  looseWeightKg: number | null;
  totalWeightKg: number | null;
}

/**
 * Matches the real API's ExtruderProduction schema (see /api/docs). Note
 * lumpsKg/yarnWasteKg are NOT fields on `extruder` — the backend stores them
 * as separate WastageRecords in `wastages` (codes LUMPS / YARN_WASTE).
 */
export interface ExtruderProductionItem {
  id: string;
  stage: 'EXTRUDER';
  productionDate: string;
  status: ExtruderStatus;
  statusChangedAt: string;
  remarks: string | null;
  color: MasterDataRef;
  size: MasterDataRef;
  extruder: ExtruderDetail;
  wastages: WastageRecordSummary[];
  isApproved: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ExtruderProductionsResponse {
  success: boolean;
  data: ExtruderProductionItem[];
  meta: PaginationMeta;
}

/** Matches ExtruderCreateRequest — additionalProperties: false, so send exactly this shape. */
export interface ExtruderCreatePayload {
  productionDate: string; // date, e.g. "2026-08-19"
  colorId: string;
  sizeId: string;
  brandId: string;
  chemicalId: string;
  rawMaterialKg: number;
  chemicalKg: number;
  colorConsumedKg?: number;
  yarnOutputKg: number;
  lumpsKg: number;
  yarnWasteKg: number;
  type?: 'PRODUCTION' | 'SAMPLE';
  remarks?: string;
  overrideReason?: string;
  bagCount?: number;
  bagWeightKg?: number;
  looseWeightKg?: number;
  totalWeightKg?: number;
}

/**
 * Matches ExtruderUpdateRequest — every field optional, only allowed while
 * PENDING_APPROVAL. Unlike create, the update endpoint does not accept
 * lumpsKg/yarnWasteKg at all (additionalProperties: false rejects them).
 */
/** lumpsKg/yarnWasteKg: omit to leave unchanged, 0 to clear, positive to set/replace. */
export type ExtruderUpdatePayload = Partial<ExtruderCreatePayload>;

export const extruderKeys = {
  all: ['extruder-productions'] as const,
  list: (query: string) => [...extruderKeys.all, 'list', query] as const,
};

/** Matches the real API's ColorConsumptionStandard record (see GET /color-consumption-standard/latest). Numeric fields come back as strings. */
export interface ColorConsumptionStandard {
  id: string;
  companyId: string;
  basisWeightKg: string;
  hdpematerialbag: number;
  whiteKgBasis: string;
  blueKgBasis: string;
  greenKgBasis: string;
  chemicalWeight: string;
  date: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

interface ColorConsumptionStandardResponse {
  success: boolean;
  data: ColorConsumptionStandard;
}

export const colorConsumptionStandardKeys = {
  latest: ['color-consumption-standard', 'latest'] as const,
};

export function useColorConsumptionStandard(date?: string | Date) {
  return useQuery({
    queryKey: [...colorConsumptionStandardKeys.latest, date],
    queryFn: () => fetchJson<ColorConsumptionStandardResponse>('/color-consumption-standard/latest?' + (date ? `date=${encodeURIComponent(date.toString())}` : '')),
  });
}

/** Returns the raw backend value for a colour's per-basis consumption field. */
export function colorGramsPerBasis(standard: ColorConsumptionStandard | undefined, colorName: string): number | undefined {
  if (!standard || !colorName) return undefined;
  // API fields are named {color}KgBasis (e.g. whiteKgBasis, blueKgBasis, greenKgBasis)
  const key = `${colorName.toLowerCase()}KgBasis` as keyof ColorConsumptionStandard;
  const raw = standard[key];
  // API may return as string or number — handle both
  const value = typeof raw === 'string' ? parseFloat(raw) : typeof raw === 'number' ? raw : NaN;
  return isNaN(value) ? undefined : value;
}

export function useExtruderProductions(query: string = '', enabled: boolean = true) {
  return useQuery({
    queryKey: extruderKeys.list(query),
    queryFn: () => fetchJson<ExtruderProductionsResponse>(`/production/extruder${query}`),
    enabled,
  });
}


export interface ExtruderSummary {
  input: number;
  output: number;
  wastage: number;
}

/**
 * Aggregates extruder production totals across a list query. The API
 * doesn't track wastage directly — it's derived here as rawMaterialKg minus
 * yarnOutputKg, a display-only convenience, not a value sent to the backend.
 */
export function useExtruderSummary(query: string = '?limit=100') {
  const { data, isLoading } = useExtruderProductions(query);

  const summary = useMemo<ExtruderSummary>(() => {
    const items = data?.data ?? [];
    return items.reduce(
      (acc, item) => {
        const raw = item.extruder?.rawMaterialKg ?? 0;
        const output = item.extruder?.yarnOutputKg ?? 0;
        acc.input += raw;
        acc.output += output;
        acc.wastage += Math.max(raw - output, 0);
        return acc;
      },
      { input: 0, output: 0, wastage: 0 },
    );
  }, [data]);

  return { summary, isLoading };
}
