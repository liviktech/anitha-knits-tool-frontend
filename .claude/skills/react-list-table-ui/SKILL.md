---
name: react-list-table-ui
description: Use when building or editing a list/table screen — loading/error/empty states, filters, pagination, or the data table itself. Trigger on "build a table/list", "add filters", "add pagination", "handle loading/error/empty state", "showing X of Y entries".
---

# Lists, Tables, Filters & Pagination

## Loading States

Every async UI should have a loading state.

Use:

- Skeletons for pages/tables
- Spinners for buttons
- Disabled mutation buttons
- Loading placeholders for cards

Avoid displaying a blank screen while data is loading.

Use the shared `Loader` component (`src/components/shared/loader.tsx`) for every
spinner in the app — inline button spinners, table loading rows, page/section
loading states — instead of importing `Loader2` from `lucide-react` directly in
a feature component.

```tsx
import { Loader } from '@/components/shared/loader';

<Loader size="sm" />      {/* inline icon inside a small action button */}
<Loader className="mr-2" />   {/* default size, inline before button text */}
<Loader size="lg" />      {/* table loading row */}
<Loader size="xl" />      {/* full page/section loading state */}
```

Do not write `<Loader2 className="... animate-spin" />` directly in a
component — that duplicates the same spinner styling everywhere. If a new
size is genuinely needed, add it to `loaderSizeClasses` in `loader.tsx`
rather than reaching for an inline `className` override.

## Error States

Every API-driven screen should handle:

```text
Loading
Success
Empty
Error
```

Example:

```text
Unable to load Extruder Production.

Please try again.

[Retry]
```

Do not silently swallow errors.

## Empty States

Avoid empty tables.

Use a meaningful message:

```text
No Extruder Production Found

No records match the selected filters.

[Clear Filters]
```

## Server-Side Filtering

Use backend filters instead of filtering large datasets in React.

Supported filters include:

```text
date_from
date_to
stage
color_id
size
status
wastage_type
```

Example:

```text
GET /production/extruder
    ?date_from=2026-08-01
    &date_to=2026-08-19
    &status=APPROVED
```

## URL-Based Filters

Prefer URL query parameters for list filters.

Example:

```text
/production/extruder?status=APPROVED&size=160
```

Benefits:

- Refresh-safe
- Shareable URLs
- Browser back/forward support
- Easier debugging
- Better navigation

## Pagination

Do not load thousands of records into the browser unnecessarily.

Use server-side pagination where the backend supports `page`/`limit` (or
similar) query params. When a screen aggregates across endpoints that don't
offer a combined server-side page (e.g. rolling multiple stages up by date),
client-side pagination over the fetched set is an acceptable fallback — but
make the footer text and page controls reflect the real row count, never a
placeholder number.

```text
Showing 1–25 of 1,250

< 1 2 3 4 5 ... >
```

## Data Tables

Use one reusable table component.

```tsx
<DataTable
  columns={columns}
  data={data}
  loading={isLoading}
  pagination={pagination}
/>
```

Features should ideally include:

- Sorting
- Pagination
- Loading state
- Empty state
- Row actions
- Responsive behavior
- Column visibility where useful
