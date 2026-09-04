import { apiFetch } from '@/lib/api-client';
import { useApiMutation } from '@/lib/use-api-mutation';
import { lookupsKeys, useLookups, type Lookups, type LookupItem } from '@/lib/lookups';

export { useLookups, lookupsKeys, type Lookups, type LookupItem };

/** The master-data categories managed on the Raw Materials admin screen — matches the /lookups/:resource route segments. */
export type LookupResource = 'colors' | 'sizes' | 'chemicals' | 'brands' | 'expense-names';

function postLookupItem(resource: LookupResource, name: string) {
  return apiFetch(`/lookups/${resource}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

function patchLookupItem(resource: LookupResource, id: string, name: string) {
  return apiFetch(`/lookups/${resource}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

function deleteLookupItem(resource: LookupResource, id: string) {
  return apiFetch(`/lookups/${resource}/${id}`, { method: 'DELETE' });
}

/** Creates a color/size/chemical/brand — itemCode is always server-generated. */
export function useCreateLookupItem(resource: LookupResource) {
  return useApiMutation<string>((name) => postLookupItem(resource, name), [lookupsKeys.all]);
}

/** Renames an existing color/size/chemical/brand — itemCode never changes. */
export function useUpdateLookupItem(resource: LookupResource) {
  return useApiMutation<{ id: string; name: string }>(({ id, name }) => patchLookupItem(resource, id, name), [lookupsKeys.all]);
}

export function useDeleteLookupItem(resource: LookupResource) {
  return useApiMutation<string>((id) => deleteLookupItem(resource, id), [lookupsKeys.all]);
}
