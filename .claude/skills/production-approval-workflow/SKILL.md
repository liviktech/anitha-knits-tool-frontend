---
name: production-approval-workflow
description: Use when building UI for the Production Module's domain workflows — status badges, approve/reject actions, delete confirmations, duplicate-submission guards, rejection reason capture, Kora balance/ledger, GSM penalty display, recipe override, or permission-gated actions. Trigger on "approve/reject button", "status badge", "delete confirmation", "Kora balance/ledger", "GSM penalty", "recipe override UI", "permission check", "production module checklist".
---

# Production Module — Approval & Domain Workflow UI

Production records follow this status lifecycle:

```text
DRAFT
   ↓
SUBMITTED
   ↓
PENDING_APPROVAL
   ↓
APPROVED
   OR
REJECTED
```

## Status Badge

Create a reusable status badge:

```tsx
<ProductionStatusBadge status={production.status} />
```

Do not duplicate status labels and styling throughout the project.

## Approved Records

Approved production must not be silently edited.

UI should reflect the status:

```text
DRAFT
[Edit] [Submit]

SUBMITTED
[View]

PENDING_APPROVAL
[Approve] [Reject]

APPROVED
[View] [Adjustment]

REJECTED
[View] [Edit] [Resubmit]
```

Do not rely only on hiding the button. The backend must enforce the rule too.
When a stage's API genuinely has no edit/approve/reject endpoint yet (check
the OpenAPI spec — don't assume), don't build UI for it; ship create/list/get
only and leave those actions out, same as this project did for Looms and
Fabric Checking until their endpoints exist.

## Critical Actions

Use confirmation dialogs for:

- Delete
- Submit
- Approve
- Reject
- Recipe Override
- Adjustment
- Other irreversible actions

Example:

```text
Approve Production?

Production: EXT-00125
Output: 950 KG

Approval may finalize inventory/Kora effects.

[Cancel] [Approve]
```

Disable the action while the request is running.

### Delete Confirmation

Every delete action — a row, a record, an attachment, a saved filter, anything —
must go through a confirmation dialog before the request fires. Never wire a
delete button directly to the mutation. And never build delete UI at all for a
resource whose API has no delete endpoint — confirm against the OpenAPI spec first.

Use **one reusable `DeleteConfirmDialog` (or shared `ConfirmDialog` with a
destructive preset)** for this across the whole app — do not build a bespoke
modal per feature. It should accept props like `title`, `description`,
`onConfirm`, and `isPending`, so Extruder, Looms, Kora, Wastage, Fabric
Checking, etc. all render the same dialog with different content.

```tsx
<DeleteConfirmDialog
  open={isDeleteOpen}
  onOpenChange={setIsDeleteOpen}
  title="Delete Extruder Production?"
  description={`Production ${record.code} — this action cannot be undone.`}
  isPending={isDeleting}
  onConfirm={() => deleteMutation.mutate(record.id)}
/>
```

- Use a destructive button variant (`variant="destructive"`) for the confirm action.
- Disable the confirm button while the delete request is in flight.
- For bulk delete, state the count being removed ("Delete 5 records?").
- After a successful delete, invalidate the affected queries so the UI reflects it.
- If a one-off delete dialog already exists somewhere in the codebase, extract it
  into the shared component instead of copying it again for the next feature.

## Prevent Duplicate Submissions

Bad:

```tsx
<Button onClick={handleSubmit}>
  Submit
</Button>
```

Better:

```tsx
<Button
  disabled={isSubmitting}
  onClick={handleSubmit}
>
  {isSubmitting ? "Submitting..." : "Submit"}
</Button>
```

Apply this to:

- Create
- Update
- Submit
- Approve
- Reject
- Recipe Override
- Load Sent

## Rejection Reason

Reject actions should capture a reason.

```text
Reject Production

Reason
[____________________________]

[Cancel] [Reject]
```

Send the reason to the backend as part of the rejection payload.

## Kora UI

Kora is not just another CRUD table.

Display:

```text
Current Kora Balance
1,250 KG

Extruder Output
+1,500 KG

Looms Consumption
-250 KG
```

Also provide:

```text
Kora Ledger
Reconciliation
```

The UI should not allow arbitrary balance editing.

## Reconciliation

Show reconciliation clearly.

```text
Extruder Output       1,500 KG
Looms Input             250 KG
Expected Kora         1,250 KG

Actual Kora           1,200 KG

Variance                 50 KG
Status                   ⚠ Review
```

Use visual emphasis for discrepancies.

## GSM UI

Display:

```text
Actual GSM
520

Allowed GSM
500

Variance
+20 GSM

Penalty
₹250
```

If the actual GSM exceeds the configured limit:

```text
⚠ GSM exceeds allowed limit
```

The backend should remain the authority for the final penalty calculation.

## Recipe Override UI

Recipe overrides should clearly distinguish the original recipe from the overridden values.

```text
Standard Recipe
----------------
HDPE       20 KG
DN+MB       2 KG
Colour    150 g

[Override Recipe]

Override
----------------
HDPE       [20]
DN+MB      [2.5]
Colour     [160]

Reason
[_____________________]

[Cancel] [Save Override]
```

The UI should clearly indicate that an override occurred.

## Permissions

Use permission-based rendering.

Example:

```tsx
<Can permission="production.approve">
  <ApproveButton />
</Can>
```

Possible permissions:

```text
production.create
production.edit
production.submit
production.approve
production.reject
production.adjust
recipe.manage
wastage.approve
gsm.manage
reports.view
```

Frontend permissions are for UX only.

Backend authorization remains mandatory.

## Production Module Specific Checklist

### Extruder

- [ ] Date
- [ ] Colour
- [ ] Size
- [ ] Input KG
- [ ] Output KG
- [ ] Wastage
- [ ] Chemical selection
- [ ] Recipe selection
- [ ] Recipe override
- [ ] Status
- [ ] Submit
- [ ] Approve
- [ ] Reject
- [ ] Loading/error/empty states

### Looms

- [ ] Date
- [ ] Colour
- [ ] Yarn input KG
- [ ] Fabric output KG
- [ ] Wastage
- [ ] Kora availability
- [ ] Status
- [ ] Approve/reject workflow

### Kora

- [ ] Current balance
- [ ] Extruder contribution
- [ ] Looms consumption
- [ ] Ledger
- [ ] Reconciliation
- [ ] Variance indication
- [ ] No arbitrary balance editing

### Wastage

- [ ] Source
- [ ] Type
- [ ] Quantity
- [ ] Colour where applicable
- [ ] Reason
- [ ] Status
- [ ] Submit
- [ ] Approve
- [ ] Reject

### Fabric Checking

- [ ] Date
- [ ] Colour
- [ ] Piece count
- [ ] Total weight
- [ ] First Grade
- [ ] Second Grade
- [ ] FW
- [ ] BW
- [ ] Approval

### GSM

- [ ] Actual GSM
- [ ] Allowed GSM
- [ ] Variance
- [ ] Penalty
- [ ] Warning state
- [ ] Backend result displayed

### Load Sent

- [ ] Date
- [ ] Product
- [ ] Grade
- [ ] Colour
- [ ] Quantity/weight
- [ ] Reference
- [ ] Finalization rules
