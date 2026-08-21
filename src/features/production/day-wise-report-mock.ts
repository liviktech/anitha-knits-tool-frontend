// Illustrative monthly report data — the report shows the same color-coded
// spreadsheet layout as the real report will, but the numbers here are
// generated (not fetched), since the backend has no monthly color/size
// breakdown endpoint yet. Values are deterministic per date so the report
// looks stable across re-renders and month switches.

export interface DayWiseReportRow {
  date: string; // yyyy-MM-dd
  isHighlighted: boolean; // Sundays render in red, matching the reference sheet
  extruder: { dnPlus: number; waste: number; lums: number };
  loomsProduction: { c180A: number; dnPlus180: number; c180B: number; total: number };
  loomsWaste: { white: number; blue: number; total: number };
  fabricChecking: { white: number; blue: number; total: number };
  fabricWaste: { fwWhite180: number; fwBlue180: number; white: number; blue: number; total: number };
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateDayRow(date: Date): DayWiseReportRow {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const rand = mulberry32(date.getTime() / 1000);
  const isHighlighted = date.getDay() === 0; // Sunday

  const dnPlus = round2(1000 + rand() * 2000);
  const extruderWaste = round2(isHighlighted ? 12 + rand() * 15 : rand() * 12);
  const lums = round2(isHighlighted && rand() > 0.4 ? 5 + rand() * 10 : 0);

  const c180A = round2(rand() > 0.75 ? 300 + rand() * 500 : 0);
  const dnPlus180 = round2(50 + rand() * 750);
  const c180B = round2(400 + rand() * 2400);
  const loomsProdTotal = round2(c180A + dnPlus180 + c180B);

  const loomsWasteWhite = round2(1 + rand() * 34);
  const loomsWasteBlue = round2(rand() * 170);
  const loomsWasteTotal = round2(loomsWasteWhite + loomsWasteBlue);

  const fabricWhite = round2(rand() > 0.1 ? 1500 + rand() * 1800 : 0);
  const fabricBlue = round2(rand() > 0.85 ? rand() * 300 : 0);
  const fabricTotal = round2(fabricWhite + fabricBlue);

  const fwWhite180 = round2(rand() * 110);
  const fwBlue180 = round2(rand() > 0.85 ? rand() * 10 : 0);
  const fwWhite = round2(rand() > 0.5 ? rand() * 10 : 0);
  const fwBlue = round2(rand() > 0.5 ? rand() * 10 : 0);
  const fabricWasteTotal = round2(fwWhite180 + fwBlue180 + fwWhite + fwBlue);

  return {
    date: dateStr,
    isHighlighted,
    extruder: { dnPlus, waste: extruderWaste, lums },
    loomsProduction: { c180A, dnPlus180, c180B, total: loomsProdTotal },
    loomsWaste: { white: loomsWasteWhite, blue: loomsWasteBlue, total: loomsWasteTotal },
    fabricChecking: { white: fabricWhite, blue: fabricBlue, total: fabricTotal },
    fabricWaste: { fwWhite180, fwBlue180, white: fwWhite, blue: fwBlue, total: fabricWasteTotal },
  };
}

export function generateMonthReport(year: number, monthIndex: number): DayWiseReportRow[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => generateDayRow(new Date(year, monthIndex, i + 1)));
}

export function sumReportRows(rows: DayWiseReportRow[]): Omit<DayWiseReportRow, 'date' | 'isHighlighted'> {
  const sum = (fn: (r: DayWiseReportRow) => number) => round2(rows.reduce((acc, r) => acc + fn(r), 0));
  return {
    extruder: {
      dnPlus: sum((r) => r.extruder.dnPlus),
      waste: sum((r) => r.extruder.waste),
      lums: sum((r) => r.extruder.lums),
    },
    loomsProduction: {
      c180A: sum((r) => r.loomsProduction.c180A),
      dnPlus180: sum((r) => r.loomsProduction.dnPlus180),
      c180B: sum((r) => r.loomsProduction.c180B),
      total: sum((r) => r.loomsProduction.total),
    },
    loomsWaste: {
      white: sum((r) => r.loomsWaste.white),
      blue: sum((r) => r.loomsWaste.blue),
      total: sum((r) => r.loomsWaste.total),
    },
    fabricChecking: {
      white: sum((r) => r.fabricChecking.white),
      blue: sum((r) => r.fabricChecking.blue),
      total: sum((r) => r.fabricChecking.total),
    },
    fabricWaste: {
      fwWhite180: sum((r) => r.fabricWaste.fwWhite180),
      fwBlue180: sum((r) => r.fabricWaste.fwBlue180),
      white: sum((r) => r.fabricWaste.white),
      blue: sum((r) => r.fabricWaste.blue),
      total: sum((r) => r.fabricWaste.total),
    },
  };
}

export function monthOptions(count = 12): { year: number; monthIndex: number; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  });
}
