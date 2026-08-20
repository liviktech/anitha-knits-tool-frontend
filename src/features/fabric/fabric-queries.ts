import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { MasterDataRef, PaginationMeta } from '@/lib/api-types';

export type FabricCheckingStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface FabricCheckDetail {
  fabricInputKg: number;
  pieceCount: number;
  firstGradeKg: number;
  secondGradeKg: number;
}

/**
 * Matches the real API's FabricChecking schema (see /api/docs). This stage
 * lives at /fabric-checking, not nested under /production like Extruder and
 * Looms, and — like Looms — only has create/list/get, no edit yet.
 */
export interface FabricCheckingRecord {
  id: string;
  stage: 'FABRIC_CHECKING';
  productionDate: string;
  status: FabricCheckingStatus;
  statusChangedAt: string;
  remarks: string | null;
  color: MasterDataRef;
  size: MasterDataRef;
  fabricCheck: FabricCheckDetail;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface FabricCheckingListResponse {
  success: boolean;
  data: FabricCheckingRecord[];
  meta: PaginationMeta;
}

/** Matches FabricCheckingCreateRequest — additionalProperties: false, so send exactly this shape. */
export interface FabricCheckingCreatePayload {
  productionDate: string; // date, e.g. "2026-08-19"
  colorId: string;
  sizeId: string;
  fabricInputKg: number;
  pieceCount: number;
  firstGradeKg: number;
  secondGradeKg: number;
  remarks?: string;
}

export const fabricCheckingKeys = {
  all: ['fabric-checking'] as const,
  list: (query: string) => [...fabricCheckingKeys.all, 'list', query] as const,
};

export function useFabricCheckingRecords(query: string = '') {
  return useQuery({
    queryKey: fabricCheckingKeys.list(query),
    queryFn: () => fetchJson<FabricCheckingListResponse>(`/fabric-checking${query}`),
  });
}

export interface FabricCheckingSummary {
  input: number;
  checked: number;
  wastage: number;
}

/**
 * Aggregates fabric-checking totals across a list query. "Checked" is
 * firstGradeKg + secondGradeKg (the two graded outputs); wastage is derived
 * as fabricInputKg minus that sum — a display-only convenience, not a value
 * the backend tracks or expects back.
 */
export function useFabricCheckingSummary(query: string = '?limit=100') {
  const { data, isLoading } = useFabricCheckingRecords(query);

  const summary = useMemo<FabricCheckingSummary>(() => {
    const items = data?.data ?? [];
    return items.reduce(
      (acc, item) => {
        const input = item.fabricCheck?.fabricInputKg ?? 0;
        const checked = (item.fabricCheck?.firstGradeKg ?? 0) + (item.fabricCheck?.secondGradeKg ?? 0);
        acc.input += input;
        acc.checked += checked;
        acc.wastage += Math.max(input - checked, 0);
        return acc;
      },
      { input: 0, checked: 0, wastage: 0 },
    );
  }, [data]);

  return { summary, isLoading };
}
