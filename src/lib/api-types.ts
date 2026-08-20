/** A resolved reference to a master-data record — shared shape across production stages. */
export interface MasterDataRef {
  id: string;
  name: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type WastageStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

/**
 * A WastageRecord created alongside its parent production record. Wastage
 * quantities (lumps, yarn waste, looms waste, FW, BW, ...) are never fields
 * on the stage's own detail object (ExtruderDetail/LoomDetail/...) — they
 * only ever appear here, on the record's `wastages` array, keyed by
 * `wastageType.code`.
 */
export interface WastageRecordSummary {
  id: string;
  wastageType: {
    id: string;
    code: string;
    name: string;
  };
  color: MasterDataRef | null;
  quantityKg: number;
  status: WastageStatus;
}

/** Sums the quantityKg of every wastage entry matching a given wastageType code (e.g. "LUMPS", "YARN_WASTE"). */
export function sumWastageByCode(wastages: WastageRecordSummary[] | undefined, code: string): number {
  return (wastages ?? [])
    .filter((w) => w.wastageType.code === code)
    .reduce((sum, w) => sum + w.quantityKg, 0);
}
