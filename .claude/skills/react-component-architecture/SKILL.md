---
name: react-component-architecture
description: Use when creating a new component, splitting up a large component file, deciding whether to extract a reusable piece of UI, dealing with prop drilling, or reasoning about re-renders / memoization / global state. Trigger on "new component", "this file is getting huge", "should I extract this", "prop drilling", "should I memoize this", "should this be in context/Zustand", "derived state in useEffect".
---

# Component Architecture

## Component Design

Components should have one clear responsibility.

Bad:

```text
ExtruderPage
  ├── API calls
  ├── Form logic
  ├── Table logic
  ├── Modal logic
  ├── Validation
  ├── Calculations
  └── Permission logic
```

Prefer:

```text
ExtruderPage
├── ExtruderFilters
├── ExtruderTable
├── ExtruderForm
├── ExtruderDetails
├── ApprovalDialog
└── RejectDialog
```

Keep page components responsible mainly for composition.

## Reusable Components

Create reusable components for common UI.

Examples:

```text
DataTable
StatusBadge
ConfirmDialog
DeleteConfirmDialog
FormField
DatePicker
NumberInput
Loader
EmptyState
ErrorState
LoadingState
PageHeader
FilterBar
Pagination
ApprovalDialog
RejectDialog
```

Do not duplicate the same UI across Extruder, Looms, Wastage, and Fabric Checking.

Before adding a new button, input, card, dialog, or badge, check `src/components/ui/`
and the feature's existing components first — compose or extend what exists rather
than hand-rolling a near-duplicate. One button variant, one dialog pattern, one status
badge — never two components doing the same job with slightly different markup.

## Avoid Large Component Files

If a component becomes very large:

```text
ExtruderPage.tsx
1000+ lines
```

split it.

For example:

```text
ExtruderPage.tsx
ExtruderFilters.tsx
ExtruderTable.tsx
ExtruderForm.tsx
ExtruderDetails.tsx
ExtruderActions.tsx
ApprovalDialog.tsx
RejectDialog.tsx
```

## Avoid Prop Drilling

Bad:

```text
Page
 ↓
Component
 ↓
Table
 ↓
Row
 ↓
Button
```

passing many unrelated props.

Use:

- Composition
- Context where appropriate
- Feature hooks
- Query hooks

Don't create global context for every piece of state.

## Keep Utility Functions Pure

Good:

```ts
export const calculateWastage = (
  inputKg: number,
  outputKg: number
) => inputKg - outputKg;
```

Avoid utility functions that secretly:

- modify global state
- call APIs
- manipulate DOM
- depend on hidden variables

Pure functions are easier to test.

## Avoid Unnecessary Re-renders

Use React optimization only when it provides value.

Useful tools:

```text
React.memo
useMemo
useCallback
```

But do not use them everywhere.

Bad optimization:

```tsx
const value = useMemo(() => 10 + 20, []);
```

Good optimization:

```tsx
const filteredRows = useMemo(
  () => expensiveFilter(rows, filters),
  [rows, filters]
);
```

First make the component correct and simple, then optimize measured bottlenecks.

## Avoid `useEffect` for Derived State

Bad:

```tsx
const [total, setTotal] = useState(0);

useEffect(() => {
  setTotal(input + output);
}, [input, output]);
```

Prefer:

```tsx
const total = input + output;
```

or:

```tsx
const total = useMemo(
  () => expensiveCalculation(input, output),
  [input, output]
);
```

Do not create state for values that can be derived. This also applies to
clamping/deriving a value from other state (e.g. a paginated `page` clamped to
`totalPages`) — derive it inline (`const currentPage = Math.min(page, totalPages)`)
rather than calling `setPage` from inside a `useEffect`, which triggers a
cascading extra render and trips the `react-hooks/set-state-in-effect` lint rule.

## Avoid Unnecessary Global State

Do not put everything into Redux/Context.

Before creating global state, ask:

```text
Does multiple unrelated parts of the application need this?
```

If no:

```tsx
useState()
```

If it is server data:

```tsx
TanStack Query
```

If it is truly global application state:

```text
Context / Zustand / Redux
```

Choose the simplest appropriate solution.
