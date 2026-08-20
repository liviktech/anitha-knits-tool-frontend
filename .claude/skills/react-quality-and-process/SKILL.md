---
name: react-quality-and-process
description: Use when handling logging, security-sensitive code (tokens, dangerouslySetInnerHTML, file uploads), writing tests, or wrapping up work before a commit/PR. Trigger on "add logging", "is this secure", "file upload", "write a test", "before I commit/PR", "PR checklist".
---

# Logging, Security, Testing & Process

## Logging

Avoid production logs such as:

```ts
console.log(response);
console.log(token);
console.log(user);
```

Especially never log:

- Access tokens
- Refresh tokens
- Passwords
- Sensitive production data

Use a controlled logging strategy.

## Security

Frontend security rules:

- Never store secrets in frontend code.
- Never trust frontend permissions.
- Never trust frontend calculations.
- Never expose tokens unnecessarily.
- Sanitize unsafe HTML.
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary.
- Validate uploaded files.
- Handle authentication expiration properly.

## File Uploads

If documents/images are introduced later:

Validate:

```text
File type
File size
Upload state
Upload failure
Retry
```

Show:

```text
Uploading...
Uploaded
Failed
Retry
```

Do not assume a file upload succeeded just because the UI started the request.

## Testing

Recommended test layers:

### Unit Tests

Test:

```text
Calculations
Formatters
Validation schemas
Utility functions
```

### Component Tests

Test:

```text
Form validation
Button states
Status rendering
Dialogs
Empty states
```

### Integration Tests

Test:

```text
Create → Submit
Submit → Approve
Submit → Reject
Filters → API
Approval → Cache refresh
```

Critical production workflows should receive priority.

## Code Quality

Before committing code:

```bash
npm run lint
npm run build
```

Both must pass with zero errors before a task is considered done — do not report
work as complete if either fails.

Also check:

```text
No unused imports
No any
No console logs
No commented-out old code
No duplicated components
No hard-coded API URLs
No hard-coded business rules
```

## Git Practices

Use meaningful commits.

Good:

```text
feat: add extruder production form
feat: add extruder approval workflow
fix: prevent duplicate production submission
refactor: extract production table
```

Avoid:

```text
update
changes
final
final2
new code
```

Keep commits focused.

## Pull Request Checklist

Before raising a PR:

- [ ] TypeScript passes
- [ ] ESLint passes
- [ ] Production build passes
- [ ] API errors are handled
- [ ] Loading state exists
- [ ] Empty state exists
- [ ] Form validation exists
- [ ] Permission checks exist
- [ ] Critical actions have confirmation
- [ ] Duplicate submission is prevented
- [ ] Approved records cannot be silently edited
- [ ] No business rules are incorrectly hard-coded
- [ ] No sensitive information is logged
- [ ] Responsive UI checked
- [ ] Accessibility checked
- [ ] Relevant tests added
