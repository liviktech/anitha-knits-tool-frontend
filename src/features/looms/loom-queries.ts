import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { MasterDataRef, PaginationMeta, WastageRecordSummary } from '@/lib/api-types';

export type LoomsStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface LoomDetail {
  yarnInputKg: number;
  fabricOutputKg: number;
}

/**
 * Matches the real API's LoomsProduction schema (see /api/docs). loomsWasteKg
 * is NOT a field on `loom` — it's stored as a separate WastageRecord in
 * `wastages` (code LOOMS_WASTE). isApproved/approvedAt/approvedBy back the
 * ADMIN-only approve action (PATCH /production/looms/:id/approve).
 */
export interface LoomsProductionItem {
  id: string;
  stage: 'LOOMS';
  productionDate: string;
  status: LoomsStatus;
  statusChangedAt: string;
  remarks: string | null;
  color: MasterDataRef;
  size: MasterDataRef;
  chemical: MasterDataRef | null;
  loom: LoomDetail;
  wastages: WastageRecordSummary[];
  isApproved: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface LoomsProductionsResponse {
  success: boolean;
  data: LoomsProductionItem[];
  meta: PaginationMeta;
}

/** Matches LoomsCreateRequest — additionalProperties: false, so send exactly this shape. */
export interface LoomsCreatePayload {
  productionDate: string; // date, e.g. "2026-08-19"
  colorId: string;
  sizeId: string;
  chemicalId: string;
  yarnInputKg: number;
  fabricOutputKg: number;
  loomsWasteKg: number;
  type?: 'PRODUCTION' | 'SAMPLE';
  remarks?: string;
}

export type LoomsUpdatePayload = Partial<LoomsCreatePayload>;

export const loomsKeys = {
  all: ['looms-productions'] as const,
  list: (query: string) => [...loomsKeys.all, 'list', query] as const,
};

export function useLoomsProductions(query: string = '', enabled: boolean = true) {
  return useQuery({
    queryKey: loomsKeys.list(query),
    queryFn: () => fetchJson<LoomsProductionsResponse>(`/production/looms${query}`),
    enabled,
  });
}

interface AvailableYarnResponse {
  success: boolean;
  data: { colorId: string; sizeId: string; chemicalId: string; availableKg: number };
}

// Deliberately not nested under loomsKeys.all — invalidateQueries prefix-matches, so if this
// shared that root, every looms list/save invalidation elsewhere would also refetch this while
// the entry dialog is still open, causing a visible balance flicker right before it closes.
// Keep this key its own root; it only needs to load once per colour+size+chemical selection (a
// fresh dialog mount always fetches fresh data on its own).
export const availableYarnKeys = {
  variant: (colorId?: string, sizeId?: string, chemicalId?: string) => ['looms-available', colorId, sizeId, chemicalId] as const,
};

/**
 * Cumulative, all-time yarn available for Looms to consume for a colour+size+chemical variant —
 * total Extruder yarnOutputKg ever recorded for it, minus total Looms yarnInputKg already
 * recorded against it. Backs GET /production/looms/available, the same figure the
 * backend's create/update guard (YARN_INPUT_EXCEEDS_AVAILABLE) enforces, so the UI can't
 * disagree with the server about what's allowed.
 */
export function useAvailableYarnKg(colorId?: string, sizeId?: string, chemicalId?: string) {
  const enabled = !!colorId && !!sizeId && !!chemicalId;
  const { data, isLoading, isFetching } = useQuery({
    queryKey: availableYarnKeys.variant(colorId, sizeId, chemicalId),
    queryFn: () => fetchJson<AvailableYarnResponse>(`/production/looms/available?colorId=${colorId}&sizeId=${sizeId}&chemicalId=${chemicalId}`),
    enabled,
  });

  return {
    availableKg: enabled ? data?.data.availableKg : undefined,
    isChecking: enabled && (isLoading || isFetching),
  };
}

export interface LoomsSummary {
  input: number;
  output: number;
  wastage: number;
}

/**
 * Aggregates looms production totals across a list query. The API doesn't
 * track wastage directly — it's derived here as yarnInputKg minus
 * fabricOutputKg, a display-only convenience, not sent to the backend.
 */
export function useLoomsSummary(query: string = '?limit=100') {
  const { data, isLoading } = useLoomsProductions(query);

  const summary = useMemo<LoomsSummary>(() => {
    const items = data?.data ?? [];
    return items.reduce(
      (acc, item) => {
        const input = item.loom?.yarnInputKg ?? 0;
        const output = item.loom?.fabricOutputKg ?? 0;
        acc.input += input;
        acc.output += output;
        acc.wastage += Math.max(input - output, 0);
        return acc;
      },
      { input: 0, output: 0, wastage: 0 },
    );
  }, [data]);

  return { summary, isLoading };
}
