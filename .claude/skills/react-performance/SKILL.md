---
name: react-performance
description: Use when addressing bundle size, slow renders, large tables, route-level code splitting, image/asset optimization, or cleaning up subscriptions/timers/event listeners. Trigger on "this is slow", "reduce bundle size", "lazy load this route", "large image/asset", "memory leak", "cleanup event listener".
---

# Performance Optimization

## Optimization Order

Optimize in this order:

```text
1. Avoid unnecessary API requests
2. Use server-side pagination/filtering
3. Cache server state
4. Avoid unnecessary re-renders
5. Lazy-load large routes
6. Optimize large tables
7. Optimize expensive calculations
8. Optimize bundle size
```

Do not prematurely optimize tiny components.

## Route Lazy Loading

Large modules can be lazy-loaded.

```tsx
const ExtruderPage = lazy(
  () => import("@/features/extruder/pages/ExtruderPage")
);
```

Use:

```tsx
<Suspense fallback={<PageSkeleton />}>
  <ExtruderPage />
</Suspense>
```

This helps reduce the initial bundle.

## Avoid Huge Imports

Prefer importing only what is needed.

Avoid unnecessarily importing an entire large library when a smaller import is available.

Also remove unused dependencies.

## Images and Assets

For images:

- Use appropriate dimensions.
- Compress large assets.
- Prefer modern formats when possible.
- Avoid loading images that are not visible.
- Use lazy loading for non-critical images.

## Prevent Memory Leaks

When using subscriptions, timers, or event listeners, clean them up.

Example:

```tsx
useEffect(() => {
  const handler = () => {
    // ...
  };

  window.addEventListener("resize", handler);

  return () => {
    window.removeEventListener("resize", handler);
  };
}, []);
```

Prefer libraries that manage cleanup automatically where appropriate.
