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
 * Matches the real API's LoomsProduction schema (see /api/docs). Unlike
 * Extruder, this stage has no edit/approve/reject endpoints yet — only
 * create/list/get — so there's no update payload type here. loomsWasteKg is
 * NOT a field on `loom` — it's stored as a separate WastageRecord in
 * `wastages` (code LOOMS_WASTE).
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
  loom: LoomDetail;
  wastages: WastageRecordSummary[];
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
  yarnInputKg: number;
  fabricOutputKg: number;
  loomsWasteKg: number;
  remarks?: string;
}

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
