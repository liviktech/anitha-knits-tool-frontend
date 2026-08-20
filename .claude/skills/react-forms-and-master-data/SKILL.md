---
name: react-forms-and-master-data
description: Use when building or editing a form, adding field validation, wiring a dropdown/select to backend-configured values (colours, sizes, recipes, chemicals, brands, etc.), or deciding whether a calculation belongs on the frontend or backend. Trigger on "add a form", "validate this field", "add a dropdown for colours/sizes/...", "should this calculation live in the frontend".
---

# Forms, Validation & Master Data

## Forms

Use a consistent form library and schema validation.

Recommended combination:

```text
React Hook Form
+
Zod
```

Example:

```ts
const extruderSchema = z.object({
  date: z.string().min(1, "Date is required"),
  colourId: z.string().min(1, "Colour is required"),
  size: z.string().min(1, "Size is required"),
  inputKg: z.number().positive("Input KG must be positive"),
  outputKg: z.number().positive("Output KG must be positive"),
});
```

Use the same schema for predictable validation.

## Validation Rules

Frontend validation should improve user experience.

Example:

```text
Input KG
[ 1000 ]

Output KG
[ 900 ]

Wastage KG
[ 100 ]
```

If a field is invalid:

```text
Output KG
[ -50 ]

Output KG must be greater than 0.
```

But remember:

> Frontend validation is not a security boundary.

The backend must validate business rules.

## Business Rules

Do not move backend business logic into the frontend as the source of truth.

Frontend can provide:

- Preview calculations
- User guidance
- Field validation
- Disabled actions
- Warnings

Backend must remain authoritative for:

- Inventory
- Kora ledger
- Approval
- Authorization
- Final calculations
- Recipe validity
- Stock availability
- Audit records

## Never Hard-Code Master Data

Avoid:

```ts
const colours = ["White", "Blue", "Green"];
```

if these values are configurable.

Fetch configurable values from APIs.

Examples:

```text
Colours
Sizes
Recipes
Wastage Types
GSM Rules
Products
Product Grades
```

Use query hooks:

```tsx
const { data: colours } = useColours();
const { data: sizes } = useSizes();
const { data: recipes } = useRecipes();
```

This keeps the frontend compatible with future configuration changes. In this
project the equivalent is the shared `/lookups` endpoint and its
`useLookups()` / `findIdByName()` helpers in `src/lib/lookups.ts` — resolve a
selected display name back to its master-data id through that, never a
hand-maintained local list.
