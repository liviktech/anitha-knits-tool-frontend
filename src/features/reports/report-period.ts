import { useState } from 'react';

export type PeriodMode = 'month' | 'date';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function lastDayOfMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthStr}-${pad2(lastDay)}`;
}

function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export interface ReportPeriod {
  mode: PeriodMode;
  setMode: (mode: PeriodMode) => void;
  fromMonthStr: string;
  toMonthStr: string;
  setFromMonthStr: (v: string) => void;
  setToMonthStr: (v: string) => void;
  fromDateStr: string;
  toDateStr: string;
  setFromDateStr: (v: string) => void;
  setToDateStr: (v: string) => void;
  /** Always-resolved exact YYYY-MM-DD range, regardless of mode — use this for querying/filtering. */
  effectiveFrom: string;
  effectiveTo: string;
  /** Human-readable period text for headers and PDF/XLSX titles. */
  label: string;
  /** Filename-safe fragment, e.g. "2026-09" or "2026-09-05_to_2026-09-20". */
  fileSuffix: string;
}

/**
 * Shared period-picker state for the Reports module. Every report supports a Month range by
 * default; some (e.g. Payroll, which the backend only aggregates per calendar month) never
 * offer Date mode — those views just never call setMode('date') / never render the toggle.
 */
export function useReportPeriod(): ReportPeriod {
  const [mode, setMode] = useState<PeriodMode>('month');
  const [fromMonthStr, setFromMonthStr] = useState(currentMonthStr());
  const [toMonthStr, setToMonthStr] = useState(currentMonthStr());
  const [fromDateStr, setFromDateStr] = useState(todayStr());
  const [toDateStr, setToDateStr] = useState(todayStr());

  const effectiveFrom = mode === 'month' ? `${fromMonthStr}-01` : fromDateStr;
  const effectiveTo = mode === 'month' ? lastDayOfMonth(toMonthStr) : toDateStr;

  const label = mode === 'month'
    ? (fromMonthStr === toMonthStr ? getMonthName(fromMonthStr) : `${getMonthName(fromMonthStr)} — ${getMonthName(toMonthStr)}`)
    : (fromDateStr === toDateStr ? formatDateDisplay(fromDateStr) : `${formatDateDisplay(fromDateStr)} — ${formatDateDisplay(toDateStr)}`);

  const fileSuffix = mode === 'month'
    ? (fromMonthStr === toMonthStr ? fromMonthStr : `${fromMonthStr}_to_${toMonthStr}`)
    : (fromDateStr === toDateStr ? fromDateStr : `${fromDateStr}_to_${toDateStr}`);

  return {
    mode, setMode,
    fromMonthStr, toMonthStr, setFromMonthStr, setToMonthStr,
    fromDateStr, toDateStr, setFromDateStr, setToDateStr,
    effectiveFrom, effectiveTo,
    label, fileSuffix,
  };
}
