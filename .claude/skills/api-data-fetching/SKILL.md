---
name: api-data-fetching
description: Use whenever calling a backend API, fetching or caching server data, or building a create/update/delete mutation in this project. Covers the API layer/client conventions, TanStack Query wiring (this project's actual QueryClient setup — not just the pattern), query key factories, cache invalidation, auth/401 handling, error normalization, and API URL configuration. Trigger on "call the API", "fetch data", "add a mutation", "cache the response", "why does this refetch every time", "handle a 401/error".
---

# API & Data Fetching

This project's server-state rule: **never** a raw `fetch` inside a
`useEffect` + `useState` triplet in a component. That pattern refetches from
scratch on every mount, so a user who navigates away from a screen and back
(e.g. Production dashboard → Extruder entry → back to the dashboard) sees a
full loading state again even though nothing changed. Use TanStack Query —
it caches by query key so a remounted screen renders cached data instantly
and only refetches in the background if it's actually stale.

## The project's QueryClient

Already wired up — don't recreate it:

- `src/lib/query-client.ts` creates a single `QueryClient` with project-wide
  defaults: `staleTime: 60_000`, `gcTime: 5 * 60_000`,
  `refetchOnWindowFocus: false`, `retry: 1`.
- `src/main.tsx` provides it once at the root via `QueryClientProvider`,
  wrapping `<App />` (which contains the router) — so the cache survives
  route navigation, which is the entire point.

Never instantiate a second `QueryClient` inside a feature or component.
Always reach the shared one implicitly through `useQuery` / `useMutation` /
`useQueryClient()`.

## Co-locate queries per feature

For each feature that talks to an API, put its query keys, fetcher
functions, and `useQuery`/`useMutation` hooks in one `<feature>-queries.ts`
file next to the feature's component(s). Reference implementation:
`src/features/extruder/extruder-queries.ts`.

```ts
// src/features/extruder/extruder-queries.ts
export const extruderKeys = {
  all: ['extruder-productions'] as const,
  list: (query: string) => [...extruderKeys.all, 'list', query] as const,
};

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return response.json();
}

export function useExtruderProductions(query: string = '') {
  return useQuery({
    queryKey: extruderKeys.list(query),
    queryFn: () => fetchJson(`/api/v1/extruder-productions${query}`),
  });
}
```

```tsx
// in the component
const { data, isLoading, isError } = useExtruderProductions(filters);
```

Never call `fetch` directly inside a component body or event handler for
data that should be cached — route it through a query hook like the one
above.

## Query keys

Use a predictable key factory per resource, structured so a broad
invalidation (`extruderKeys.all`) catches every variant (list, filtered
list, detail) of that resource:

```ts
export const extruderKeys = {
  all: ['extruder-productions'] as const,
  list: (query: string) => [...extruderKeys.all, 'list', query] as const,
  detail: (id: string) => [...extruderKeys.all, 'detail', id] as const,
};
```

This is why a dashboard summary query (`?limit=100`) and a plain list query
(no params) for the same resource should share the same `extruderKeys.all`
prefix — invalidating one key refreshes both.

## Cache invalidation after mutations

Get `queryClient` from `useQueryClient()` inside the component and call
`invalidateQueries` after a create/update/delete mutation succeeds — don't
manually re-call the fetch function (e.g. a leftover `fetchEntries()`) to
refresh a list:

```tsx
const queryClient = useQueryClient();

const handleDeleteEntry = async (id: string) => {
  const response = await fetch(`/api/v1/extruder-productions/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete entry');
  await queryClient.invalidateQueries({ queryKey: extruderKeys.all });
};
```

A mutation can affect more than one screen — e.g. approving a production
record can affect Extruder, Kora, and the dashboard summary. Invalidate
every affected key, don't assume updating one table refreshes everything:

```ts
await approveProduction(id);

queryClient.invalidateQueries({ queryKey: extruderKeys.all });
queryClient.invalidateQueries({ queryKey: ['kora'] });
queryClient.invalidateQueries({ queryKey: ['dashboard', 'production'] });
```

## API layer / service functions

Even with TanStack Query handling caching, don't scatter raw `fetch` calls
with inline URLs across components. Keep endpoint definitions in one place
per feature (the `<feature>-queries.ts` file's fetcher functions, or a
`<feature>Service` object for more complex features):

```ts
export const extruderService = {
  getAll: (params: ExtruderFilters) => apiClient.get('/production/extruder', { params }),
  create: (data: CreateExtruderPayload) => apiClient.post('/production/extruder', data),
  approve: (id: string) => apiClient.post(`/production/extruder/${id}/approve`),
};
```

## Central API client

If/when this project introduces a shared HTTP client (axios or similar),
create exactly one instance responsible for base URL, auth headers, request
timeout, and error normalization — don't duplicate that configuration in
every feature:

```ts
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});
```

## API URL configuration

Never hard-code an API base URL. Use an environment variable:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Anything exposed through a Vite `VITE_*` variable is public at build time —
never put a secret in one.

## Authentication / 401 handling

Handle auth centrally rather than inside every feature: on a `401`, attempt
a token refresh if applicable, retry the original request once, and fall
back to logout/login if the refresh fails. This belongs in the shared API
client's response interceptor, not duplicated per fetcher.

## Error normalization

Normalize API errors at the fetch/API-client layer so components can render
a consistent error state instead of each parsing a different backend error
shape:

```ts
interface ApiError {
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}
```

## Avoiding unnecessary requests

- Prefer server-side filtering/pagination over fetching everything and
  filtering client-side.
- Don't poll or refetch on window focus unless the data genuinely needs
  near-real-time freshness (the project default has
  `refetchOnWindowFocus: false` for this reason).
- Reuse an existing query hook instead of adding a near-duplicate fetch for
  data another feature already queries — check for an existing
  `<feature>-queries.ts` before writing a new fetcher.
