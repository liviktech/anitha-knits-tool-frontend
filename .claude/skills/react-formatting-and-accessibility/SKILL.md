---
name: react-formatting-and-accessibility
description: Use when formatting dates/numbers/currency/KG values for display, or reviewing a UI for accessibility (semantic HTML, keyboard nav, focus, labels, contrast). Trigger on "format this date/number", "format as currency/KG", "accessibility review", "is this accessible", "add a label to this input".
---

# Formatting & Accessibility

## Date and Number Formatting

Centralize formatting.

```ts
formatDate(date)
formatDateTime(date)
formatKg(value)
formatCurrency(value)
formatGsm(value)
```

Do not format dates differently on different screens.

## KG Handling

KG is the canonical production/inventory quantity unit.

Use numeric values consistently.

Avoid:

```ts
quantity: "100 KG"
```

Prefer:

```ts
quantityKg: 100
```

Display:

```text
100 KG
```

at the UI layer.

Do not mix display strings with numeric business values.

## Accessibility

Use semantic HTML.

Prefer:

```html
<button>
```

instead of:

```html
<div onClick={...}>
```

Ensure:

- Keyboard navigation
- Focus management
- Labels for inputs
- Accessible dialogs
- Accessible tables
- Sufficient contrast
- Meaningful error messages

Do not rely on color alone to communicate status.
