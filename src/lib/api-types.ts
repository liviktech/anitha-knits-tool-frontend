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
