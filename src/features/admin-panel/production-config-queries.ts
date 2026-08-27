import { useQuery } from '@tanstack/react-query';
import { apiFetch, fetchJson } from '@/lib/api-client';
import { useApiMutation } from '@/lib/use-api-mutation';
import type { PaginationMeta } from '@/lib/api-types';

/**
 * Matches the backend's ColorConsumptionStandard (see anitha-knits-tool-backend
 * src/routes/adminConfig.ts) — one record covers every colour (white/blue/green)
 * at once, not one row per colour. companyId/isActive/audit columns are never
 * exposed by the API.
 */
export interface ColorConsumptionStandard {
  id: string;
  date: string | null;
  basisWeightKg: number;
  hdpematerialbag: number;
  whiteKgBasis: number;
  blueKgBasis: number;
  greenKgBasis: number;
  chemicalWeight: number | null;
}

export interface ColorConsumptionStandardListResponse {
  success: boolean;
  data: ColorConsumptionStandard[];
  meta: PaginationMeta;
}

/** Matches POST/PATCH's body — additionalProperties: false. white/blue/greenKgBasis are required on create. */
export interface ColorConsumptionStandardPayload {
  date?: string;
  basisWeightKg?: number;
  hdpematerialbag?: number;
  whiteKgBasis: number;
  blueKgBasis: number;
  greenKgBasis: number;
  chemicalWeight?: number;
}

export const productionConfigKeys = {
  all: ['color-consumption-standard'] as const,
  latest: () => [...productionConfigKeys.all, 'latest'] as const,
  list: (query: string) => [...productionConfigKeys.all, 'list', query] as const,
};

export function useLatestProductionConfig() {
  return useQuery({
    queryKey: productionConfigKeys.latest(),
    queryFn: async () => {
      const res = await fetchJson<{ data: ColorConsumptionStandard | null }>('/color-consumption-standard/latest');
      return res.data;
    },
  });
}

export function useProductionConfigHistory(query: string = '') {
  return useQuery({
    queryKey: productionConfigKeys.list(query),
    queryFn: () => fetchJson<ColorConsumptionStandardListResponse>(`/color-consumption-standard${query}`),
  });
}

function postProductionConfig(payload: ColorConsumptionStandardPayload) {
  return apiFetch('/color-consumption-standard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function patchProductionConfig(id: string, payload: Partial<ColorConsumptionStandardPayload>) {
  return apiFetch(`/color-consumption-standard/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function deleteProductionConfig(id: string) {
  return apiFetch(`/color-consumption-standard/${id}`, { method: 'DELETE' });
}

/** Creates a configuration. It becomes "latest" once its effective date is the most recent as of today — not automatically on creation. */
export function useCreateProductionConfig() {
  return useApiMutation<ColorConsumptionStandardPayload>(postProductionConfig, [productionConfigKeys.all]);
}

export function useUpdateProductionConfig() {
  return useApiMutation<{ id: string; payload: Partial<ColorConsumptionStandardPayload> }>(
    ({ id, payload }) => patchProductionConfig(id, payload),
    [productionConfigKeys.all],
  );
}

export function useDeleteProductionConfig() {
  return useApiMutation<string>(deleteProductionConfig, [productionConfigKeys.all]);
}
