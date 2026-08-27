import { useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { extractApiErrorMessage } from './api-client';

/**
 * Shared create/update/delete pattern used across this app's admin dialogs
 * (see company-form-dialog.tsx): fire a request, track pending/error state,
 * invalidate the affected query keys on success. Not TanStack's `useMutation`
 * — this project fetches via `apiFetch`/`fetchJson` with local component
 * state rather than the query-mutation cache, so this hook packages that
 * existing pattern for reuse instead of introducing a second one.
 */
export function useApiMutation<TInput>(request: (input: TInput) => Promise<Response>, invalidateKeys: QueryKey[]) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (input: TInput): Promise<boolean> => {
    setIsPending(true);
    setError(null);
    try {
      const response = await request(input);
      if (!response.ok) {
        setError(await extractApiErrorMessage(response));
        return false;
      }
      await Promise.all(invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      return true;
    } catch {
      setError('Something went wrong. Please try again.');
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, error, resetError: () => setError(null) };
}
