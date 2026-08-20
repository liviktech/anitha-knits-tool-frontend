import { QueryClient } from '@tanstack/react-query';

// Cached server data is reused across route changes instead of refetching
// every time a screen remounts (e.g. leaving Extruder and returning to the
// Production dashboard). staleTime controls how long cached data is served
// without a background refetch; gcTime controls how long it survives after
// the last component using it unmounts.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
