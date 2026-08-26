export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso: string) {
  return iso.slice(0, 10);
}

export function formatDateDisplay(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
}
