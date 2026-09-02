/** Current calendar month as "YYYY-MM" — caps month-picker inputs so future months are disabled until they start. */
export function currentMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}
