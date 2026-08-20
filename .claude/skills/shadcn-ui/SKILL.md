---
name: shadcn-ui
description: Use whenever building, adding, or changing ANY UI in this project — a button, form, dialog, dropdown, card, nav, table, page section, etc. This project standardizes all UI on shadcn/ui (Radix primitives + Tailwind v4); no hand-rolled markup or custom CSS components should be created when a shadcn equivalent exists. Trigger on "add a component", "build a page/section", "create a modal/form/menu/card", "improve the UI", "new screen".
---

# shadcn/ui in this project

This project is initialized with shadcn/ui. **Every new UI element must be built from
shadcn components first** — never hand-roll markup + custom CSS for something shadcn
already provides (buttons, inputs, dialogs, dropdowns, tabs, cards, tooltips, forms,
tables, navigation menus, sheets/drawers, toasts, etc.).

## Project setup (already configured — do not re-init)

- `components.json`: style `radix-nova`, base color `neutral`, CSS variables on, icon
  library `lucide`, alias `@/*` → `src/*`.
- Primitives live in `src/components/ui/` and are owned/editable project code (not a
  black-box dependency) — it's fine to tweak them, but keep changes minimal and
  consistent with the rest of the design system.
- Shared non-primitive helpers: `src/lib/utils.ts` (`cn()` for merging class names).
- Theming lives in `src/index.css` as CSS variables (`--background`, `--foreground`,
  `--primary`, `--border`, `--radius`, etc.) under `:root` / `.dark`. Never hardcode
  hex/rgb colors or one-off spacing values in a component — use the existing Tailwind
  tokens (`bg-background`, `text-muted-foreground`, `border-border`, `rounded-lg`, …)
  so light/dark theming and consistency stay intact.

## Workflow for new UI work

1. **Check if the primitive already exists** in `src/components/ui/`. If it does, import
   and compose it — don't duplicate it.
2. **If it doesn't exist yet**, add it via the CLI instead of writing it by hand:
   ```
   npx shadcn@latest add <component-name>
   ```
   e.g. `npx shadcn@latest add dialog input form select`. This scaffolds the primitive
   into `src/components/ui/` following the project's existing style/config and installs
   any Radix/utility deps it needs.
3. **Compose, don't fork.** Build feature UI (e.g. a "product card", "contact form",
   "hero section") as a new component under `src/components/<feature>/` that imports
   and composes primitives from `src/components/ui/` — keep the primitives themselves
   generic and reusable.
4. Use `cn(...)` from `@/lib/utils` whenever a component needs conditional or
   overridable class names, instead of template-string concatenation.
5. Use `class-variance-authority` (`cva`) for components that need style variants
   (matching the pattern already used in `src/components/ui/button.tsx`), rather than
   ad hoc conditional class strings.
6. Prefer Lucide icons (`lucide-react`, already installed) over inline SVGs or other
   icon sets, for consistency with the configured icon library.

## Reusable Variants Over Custom Class Strings

Prefer reusable variants:

```tsx
<Button variant="destructive">
  Reject
</Button>
```

instead of repeatedly writing custom class strings. Create consistent design
tokens for spacing, typography, radius, status states, and form controls —
avoid random one-off styling values across pages.

## Font Family and Font Size — Single Source of Truth

`font-family` and `font-size` must be controlled from `src/index.css` only, not
redeclared per component.

- `font-family` is already centralized: the `@theme` block in `src/index.css`
  defines `--font-sans: 'Inter Variable', sans-serif;` (and `--font-heading`
  aliased to it), loaded via `@import "@fontsource-variable/inter";`, and
  `html { @apply font-sans; }` applies it globally. The whole app — body
  text, headings, buttons, table cells — uses Inter through this one token;
  never set a `font-family` / `font-[...]` on an individual component.
- To change the app's font in the future, swap it in exactly two places in
  `src/index.css`: the `@import` line and the `--font-sans` value (plus
  `npm install`/`uninstall` the matching `@fontsource-variable/<font>`
  package) — that's the single source of truth, not a per-component change.
- `font-size` should come from Tailwind's standard scale (`text-xs`, `text-sm`,
  `text-base`, `text-xl`, `text-3xl`, …) so every screen shares the same steps.
  Do not reach for an arbitrary value like `text-[10px]` or `text-[0.8rem]`
  inside a feature component.
- If a genuinely new size is needed (e.g. a recurring small "eyebrow" label),
  add it as a token in the `@theme` block of `src/index.css` (alongside the
  existing `--radius-*` tokens) — e.g. `--text-2xs: 0.625rem;` — and reuse that
  token everywhere that size is needed, instead of copy-pasting the same
  arbitrary value into multiple components.

## Useful CLI commands

- `npx shadcn@latest add <name...>` — scaffold one or more components.
- `npx shadcn@latest search` / `list` — discover available registry components.
- `npx shadcn@latest view <name>` — preview a component's source/docs before adding.
- `npx shadcn@latest add <name> --diff` — see what would change for an existing file
  before overwriting it (never blindly re-add over local edits).

## Guardrails

- Don't introduce a different component/UI library (MUI, Chakra, Bootstrap, Ant, etc.)
  — shadcn + Tailwind is the single source of truth for this project's UI.
- Don't write raw `<button>`, `<input>`, `<dialog>`, etc. with custom CSS when
  `Button`, `Input`, `Dialog`, … already exist or can be added via the CLI.
- Keep components accessible: rely on the Radix-based primitives' built-in
  keyboard/ARIA behavior rather than reimplementing it.
