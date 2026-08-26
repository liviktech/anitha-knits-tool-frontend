import { useQuery } from '@tanstack/react-query';
import { fetchJson } from './api-client';

export interface LookupItem {
  id: string;
  name: string;
}

export interface Lookups {
  brands: LookupItem[];
  colors: LookupItem[];
  chemicals: LookupItem[];
  sizes: LookupItem[];
}

export const lookupsKeys = {
  all: ['lookups'] as const,
};

export function useLookups() {
  return useQuery<Lookups>({
    queryKey: lookupsKeys.all,
    queryFn: async () => {
      const res = await fetchJson<any>('/lookups');
      return res.data ?? res;
    },
  });
}

/** Resolves a display name (e.g. "White", "160mm") to its master-data id. */
export function findIdByName(items: LookupItem[], value: string): string | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalize(value);
  return items.find((item) => normalize(item.name) === target || normalize(item.name).startsWith(target))?.id;
}
