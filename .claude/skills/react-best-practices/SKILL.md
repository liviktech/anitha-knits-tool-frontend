---
name: react-best-practices
description: Use whenever writing, editing, or reviewing React/TypeScript code in this project — creating a component, adding a button/form/dialog, wiring an API call, or finishing any frontend task before it's considered done. Entry point for the Production Module's frontend standards; points to focused sibling skills for API/data-fetching, forms, tables, approval workflow, performance, and process — load this one first, then follow its pointers to the specific skill(s) the task needs. Trigger on "add a component", "new page/section", "call the API", "fix lint", "before I commit/PR", "why is the build failing".
---

# React Frontend Best Practices — Entry Point

## Production Module — Anitha Knits

This guide defines the frontend standards for building the Production Module with React and TypeScript.

The project covers:

- Extruder Production
- Looms Production
- Kora Balance
- Wastage
- Fabric Checking
- GSM & GSM Penalty
- Load Sent
- Recipes and Master Data
- Reports and Dashboard
- Approval workflows
- Audit-related UI

The backend is the source of truth for production, inventory, Kora, approval, and business rules.

This file is deliberately short — it's the always-loaded entry point. Everything
topic-specific lives in a sibling skill; load the one(s) that match what you're
doing (see **Sibling Skills** below) instead of expecting it here.

---

## Core Frontend Principles

1. Use TypeScript strictly.
2. Keep components small and focused.
3. Prefer feature-based architecture.
4. Keep API calls outside UI components.
5. Use reusable components instead of duplicating UI.
6. Keep server state separate from local UI state.
7. Validate forms before submitting.
8. Never trust frontend validation as security.
9. Do not hard-code configurable business data.
10. Respect backend approval and authorization rules.
11. Avoid unnecessary re-renders.
12. Avoid unnecessary API requests.
13. Handle loading, error, empty, and success states.
14. Make critical actions explicit and confirmable.
15. Keep the UI accessible and responsive.

## Folder Structure — One Folder Per Feature

Every feature owns a folder under `src/features/<feature-name>/`. When
implementing a new feature, its component(s), hooks, services, and types all
go under that one folder — never scattered flat inside a shared
`components/dashboard/`-style bucket. Avoid dumping feature-specific logic
into a single shared `utils.ts` / `api.ts` / `helpers.ts` — keep it inside the
feature.

```text
src/features/
  production/
    production-details.tsx   ← dashboard/router shell for the Production module
    day-details.tsx          ← cross-feature daily summary drill-down
  extruder/
    extruder-entry.tsx
    extruder-queries.ts
  looms/
    loom-entry.tsx
    loom-queries.ts
  fabric/
    fabric-entry.tsx
    fabric-queries.ts
```

- `src/components/ui/` stays reserved for shadcn primitives (see the
  `shadcn-ui` skill) — not feature-specific.
- `src/components/shared/` stays reserved for cross-feature reusable
  components (`Loader`, `DeleteConfirmDialog`, `DataTable`, `StatusBadge`,
  etc.) — anything used by two or more features.
- A screen that only makes sense inside one feature belongs inside that
  feature's folder, even if it currently has just one file. Don't wait until
  a feature "grows" to give it its own folder — create it when the feature
  is created.
- If a component starts as feature-local but a second feature needs it,
  promote it into `src/components/shared/` at that point rather than
  duplicating it.

## TypeScript Standards

Avoid `any`.

Bad:

```ts
const production: any = response.data;
```

Good:

```ts
export type ProductionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export interface ExtruderProduction {
  id: string;
  date: string;
  colourId: string;
  size: string;
  inputKg: number;
  outputKg: number;
  wastageKg: number;
  status: ProductionStatus;
}
```

Use explicit types for API responses, request payloads, forms, component
props, table rows, query parameters, status values, and error responses.
Enable strict TypeScript configuration.

---

## Sibling Skills

Load whichever of these match the task at hand — don't pull them in speculatively:

| Skill | Load it for |
|---|---|
| `api-data-fetching` | Any backend call, TanStack Query wiring, query keys, cache invalidation, auth/401 handling |
| `react-component-architecture` | New components, splitting large files, prop drilling, memoization, derived state, global state |
| `react-forms-and-master-data` | Forms, validation schemas, business-rule placement, master-data dropdowns |
| `production-approval-workflow` | Status badges, approve/reject, delete confirmation, duplicate-submission guards, Kora/GSM/recipe-override UI, permissions |
| `react-list-table-ui` | Tables/lists, loading/error/empty states, filters, pagination |
| `react-performance` | Bundle size, route lazy-loading, large tables, image/asset optimization, memory leak cleanup |
| `react-quality-and-process` | Logging, security-sensitive code, file uploads, tests, commit/PR checklist |
| `react-formatting-and-accessibility` | Date/number/KG formatting, accessibility review |
| `responsive-design` | Any UI work — every component must work on laptop, tablet, and mobile |
| `shadcn-ui` | Adding/using a UI primitive — check `src/components/ui/` before hand-rolling markup |

---

## Recommended Technology Stack

```text
React
TypeScript
Vite
React Router
Tailwind CSS
shadcn/ui
React Hook Form
Zod
TanStack Query
Axios
ESLint
Prettier
Vitest
React Testing Library
```

Optional depending on project requirements:

```text
Zustand
date-fns
TanStack Table
```

Do not add a library simply because it is popular. Add it when it solves a real project requirement.

## Recommended Frontend Architecture

```text
                     React UI
                         │
              ┌──────────┴──────────┐
              │                     │
        Reusable UI            Feature UI
        Components             Components
              │                     │
              └──────────┬──────────┘
                         │
                   Custom Hooks
                         │
              ┌──────────▼──────────┐
              │   TanStack Query    │
              │    Server State     │
              └──────────┬──────────┘
                         │
                  Service Layer
                         │
                  API Client
                         │
                  Backend API
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
   Inventory           Kora              Audit
    Service            Ledger            Service
```

---

## Golden Rules

```text
1. Backend is the source of truth.
2. Frontend is responsible for UX, not security.
3. Never hard-code configurable business data.
4. Keep API calls outside components.
5. Keep server state separate from UI state.
6. Prefer reusable components.
7. Validate forms before submission.
8. Never silently edit approved production.
9. Protect critical actions with confirmation.
10. Prevent duplicate submissions.
11. Every delete requires a confirmation dialog — no exceptions.
12. Handle loading, error, and empty states.
13. Use server-side filtering and pagination.
14. Cache server data appropriately.
15. Invalidate related queries after mutations.
16. Use TypeScript instead of any.
17. Optimize only after identifying the bottleneck.
18. Keep components small and focused.
19. Make the UI accessible.
20. Never store business truth in localStorage/sessionStorage.
21. Test critical production workflows.
```

## Definition of Done — Frontend

A feature is not complete merely because the API is connected.

A feature is complete when:

```text
API integration
        +
TypeScript types
        +
Validation
        +
Loading state
        +
Error state
        +
Empty state
        +
Permissions
        +
Approval workflow
        +
Confirmation
        +
Duplicate-request protection
        +
Responsive UI
        +
Accessibility
        +
Tests
        +
Lint/build passing
```

This should be the standard used when implementing every Production Module feature —
but not every feature touches every row above (e.g. a stage with no approve/reject
endpoint yet has no approval-workflow row to satisfy). Use judgment against what the
backend actually exposes, per the `production-approval-workflow` skill.
