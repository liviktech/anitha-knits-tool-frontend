---
name: responsive-design
description: Use whenever creating a new component or changing an existing one in this project — every screen must work on laptop, tablet, and mobile. Defines the project's three-tier breakpoint convention, layout patterns (sidebar/nav, grids, tables, forms, dialogs), and a per-viewport verification checklist. Trigger on "add a component", "new page/section", "build a form/table/dialog", "before I commit/PR", "does this work on mobile".
---

# Responsive Design — Laptop, Tablet, Mobile

Every component built or changed in this app must work at three viewport
tiers: **laptop**, **tablet**, and **mobile**. This is not optional polish —
it's part of the definition of done for any UI change (see the
`react-best-practices` skill's Definition of Done).

## The three tiers

This project uses Tailwind's default breakpoints, mapped to three tiers:

| Tier   | Breakpoint            | Typical viewport   |
|--------|------------------------|---------------------|
| Mobile | base (no prefix)       | < 768px             |
| Tablet | `md:` (≥ 768px)        | 768px – 1023px      |
| Laptop | `lg:` (≥ 1024px)       | ≥ 1024px            |

Write mobile-first: base classes target mobile, `md:` overrides for tablet,
`lg:` overrides for laptop. `sm:` (640px) is available as an optional extra
step inside the mobile range (e.g. 2-up on a large phone) but the three
tiers above are the mandatory check for every component — verify all three,
not just laptop.

```tsx
// mobile: 1 column, tablet: 2 columns, laptop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

Never hardcode a fixed pixel width on a layout container (`w-[960px]`,
`w-64` on something that should flex) without a smaller-viewport fallback —
use `max-w-*` with `w-full`, or a responsive `w-*`/`hidden`/`flex` combo.

## Navigation / sidebar

A persistent sidebar (like this app's) is a laptop-only pattern. On tablet
and mobile it must collapse behind a trigger instead of squeezing the
content area:

```tsx
{/* Laptop: persistent sidebar */}
<aside className="hidden lg:flex w-64 border-r bg-white flex-col">
  {/* nav content */}
</aside>

{/* Tablet + mobile: same nav content inside a Sheet, opened by a trigger in the top bar */}
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="lg:hidden">
      <Menu className="w-5 h-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-64 p-0">
    {/* same nav content */}
  </SheetContent>
</Sheet>
```

Use shadcn's `Sheet` component for this (`npx shadcn@latest add sheet` — see
the `shadcn-ui` skill). Don't hand-roll a slide-in drawer with raw
`position: fixed` and manual animation classes.

## Grids and summary cards

Step column counts up across all three tiers, don't jump straight from 1 to
the laptop count:

```tsx
{/* Bad: tablet users get the same single column as mobile */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">

{/* Good: 1 → 2 → 4 across mobile → tablet → laptop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

## Tables

A data table's columns don't compress — they need to scroll horizontally on
narrow viewports instead of clipping or squeezing unreadably. **Every**
table must be wrapped in a horizontal-scroll container:

```tsx
<div className="overflow-x-auto">
  <Table>...</Table>
</div>
```

Do not wrap a `<Table>` in a plain `overflow-hidden` container — that clips
columns instead of letting the user scroll to them, silently hiding data on
mobile and tablet.

## Forms

Use `flex flex-wrap` with a `min-w-[Npx] flex-1` on each field wrapper (the
pattern already used in this app's entry forms) so fields naturally reflow
from a multi-column row on laptop down to a single column on mobile without
a separate mobile-specific layout:

```tsx
<div className="flex flex-wrap gap-4 items-end">
  <div className="space-y-1 flex-1 min-w-[140px]">
    <label>...</label>
    <Input />
  </div>
  {/* more fields */}
</div>
```

## Headers and action rows

A header with a title on the left and buttons on the right must stack on
mobile instead of squeezing:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h1 className="text-2xl font-bold">Title</h1>
    <p className="text-sm text-gray-500">Subtitle</p>
  </div>
  <div className="flex flex-wrap items-center gap-3">
    {/* buttons */}
  </div>
</div>
```

## Dialogs and modals

shadcn's `Dialog`/`AlertDialog` primitives already cap width responsively
(`max-w-xs sm:max-w-sm`, etc.) — don't override with a fixed `w-[500px]`
that would overflow a mobile viewport.

## Touch targets

On mobile, interactive elements need at least a ~40px (≈`size-10`/`h-10`)
tap target. Icon-only buttons using `size="icon-sm"`/`icon-xs` are fine on
laptop (mouse precision) but consider bumping to `size="icon"` on mobile for
primary actions (e.g. row delete/edit) if they're a frequent tap target.

## Verification checklist

Before calling a UI change done, check it at all three tiers:

- [ ] Laptop (≥1024px): full layout, persistent sidebar, multi-column grids
- [ ] Tablet (768–1023px): sidebar collapses behind a trigger, grids step
      down to 2 columns, no horizontal page scroll
- [ ] Mobile (<768px): single column, forms/fields stack, tables scroll
      horizontally inside their own container (not the whole page), header
      rows stack, nothing is clipped or requires zooming to read

Resize the browser (or use devtools device emulation) and actually look at
all three — don't assume a `flex-wrap`/`grid-cols-1` base class is enough
without checking the in-between tablet state too.
