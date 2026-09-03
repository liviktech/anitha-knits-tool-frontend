import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { MasterDataRef, PaginationMeta, WastageRecordSummary } from '@/lib/api-types';

export type FabricCheckingStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface FabricCheckDetail {
  fabricInputKg: number;
  outputKg: number | null;
}

/**
 * Matches the real API's FabricChecking schema (see /api/docs). This stage
 * lives at /fabric-checking, not nested under /production like Extruder and
 * Looms. fwKg/bwKg are NOT fields on `fabricCheck` — they're separate
 * WastageRecords in `wastages` (codes FW / BW). isApproved/approvedAt/
 * approvedBy back the ADMIN-only approve action (PATCH /fabric-checking/:id/approve).
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
  wastages: WastageRecordSummary[];
  isApproved: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
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
  outputKg: number;
  fwKg: number;
  bwKg: number;
  type?: 'PRODUCTION' | 'SAMPLE';
  remarks?: string;
}

export type FabricCheckingUpdatePayload = Partial<FabricCheckingCreatePayload>;

export const fabricCheckingKeys = {
  all: ['fabric-checking'] as const,
  list: (query: string) => [...fabricCheckingKeys.all, 'list', query] as const,
};

export function useFabricCheckingRecords(query: string = '', enabled: boolean = true) {
  return useQuery({
    queryKey: fabricCheckingKeys.list(query),
    queryFn: () => fetchJson<FabricCheckingListResponse>(`/fabric-checking${query}`),
    enabled,
  });
}

/**
 * Matches the real API's KoraBalanceEntry schema (see GET /kora-balance).
 * Kora balance = fabric stock (Looms output − Fabric Checking input) per
 * color+size variant — not a field stored on the fabric-checking record itself.
 */
export interface KoraBalanceEntry {
  id: string;
  color: MasterDataRef;
  size: MasterDataRef;
  balanceKg: number;
  updatedAt: string;
}

export interface KoraBalanceListResponse {
  success: boolean;
  data: KoraBalanceEntry[];
}

export const koraBalanceKeys = {
  all: ['kora-balance'] as const,
};

/** Lists the current kora balance for every color+size variant (not paginated — one call returns all). */
export function useKoraBalances(enabled: boolean = true) {
  return useQuery({
    queryKey: koraBalanceKeys.all,
    queryFn: () => fetchJson<KoraBalanceListResponse>('/kora-balance'),
    enabled,
  });
}

/** Looks up the current kora balance (kg) for a size+color variant by name. Undefined if the variant has no balance yet. */
export function findKoraBalanceKg(balances: KoraBalanceEntry[] | undefined, sizeName: string, colorName: string): number | undefined {
  return balances?.find((b) => b.size.name === sizeName && b.color.name === colorName)?.balanceKg;
}

interface AvailableFabricResponse {
  success: boolean;
  data: { colorId: string; sizeId: string; availableKg: number };
}

export const availableFabricKeys = {
  variant: (colorId?: string, sizeId?: string) => ['fabric-checking', 'available', colorId, sizeId] as const,
};

/**
 * Cumulative, all-time fabric available to check for a colour+size variant — total Looms
 * fabricOutputKg ever recorded for it, minus total Fabric Checking fabricInputKg already
 * recorded against it. Backs GET /fabric-checking/available, the same figure the backend's
 * create/update guard (FABRIC_INPUT_EXCEEDS_AVAILABLE) enforces, so the UI can't disagree
 * with the server about what's allowed. Distinct from the Kora Balance ledger above, which
 * tracks a different, looser running total.
 */
export function useAvailableFabricKg(colorId?: string, sizeId?: string) {
  const enabled = !!colorId && !!sizeId;
  const { data, isLoading, isFetching } = useQuery({
    queryKey: availableFabricKeys.variant(colorId, sizeId),
    queryFn: () => fetchJson<AvailableFabricResponse>(`/fabric-checking/available?colorId=${colorId}&sizeId=${sizeId}`),
    enabled,
  });

  return {
    availableKg: enabled ? data?.data.availableKg : undefined,
    isChecking: enabled && (isLoading || isFetching),
  };
}

export interface FabricCheckingSummary {
  input: number;
  checked: number;
  wastage: number;
}

/**
 * Aggregates fabric-checking totals across a list query. "Checked" is
 * outputKg (the entry screen's single Final Stock/Output figure); records
 * created before that field existed fall back to firstGradeKg + secondGradeKg
 * so old data still summarizes sensibly. Wastage is derived as fabricInputKg
 * minus that sum — a display-only convenience, not a value the backend
 * tracks or expects back.
 */
export function useFabricCheckingSummary(query: string = '?limit=100') {
  const { data, isLoading } = useFabricCheckingRecords(query);

  const summary = useMemo<FabricCheckingSummary>(() => {
    const items = data?.data ?? [];
    return items.reduce(
      (acc, item) => {
        const input = item.fabricCheck?.fabricInputKg ?? 0;
        const checked = item.fabricCheck?.outputKg ?? 0;
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
