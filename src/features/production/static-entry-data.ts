/**
 * Static stand-in data for the production entry screens.
 *
 * The real API calls in `day-wise-queries.ts`, `new-entry.tsx` and
 * `day-entry-sections.tsx` are commented out for now and read from here
 * instead. To restore the backend, delete the `STATIC …` blocks at each call
 * site and uncomment the original query/mutation code directly above them.
 */
import type { Lookups } from '@/lib/lookups';

export const staticLookups: Lookups = {
  brands: [
    { id: 'brand-grail', name: 'Grail' },
    { id: 'brand-iraldis', name: 'Iraldis' },
    { id: 'brand-opal', name: 'Opal' },
    { id: 'brand-reliance', name: 'Reliance' },
  ],
  chemicals: [
    { id: 'chem-acm', name: 'ACM' },
    { id: 'chem-dnmb', name: 'DN-MB' },
  ],
  colors: [
    { id: 'color-blue', name: 'Blue' },
    { id: 'color-green', name: 'Green' },
    { id: 'color-white', name: 'White' },
  ],
  sizes: [
    { id: 'size-40', name: '40"' },
    { id: 'size-30', name: '30"' },
    { id: 'size-20', name: '20"' },
  ],
};

/** Inventory balance panel — keyed by master-data name. */
export const staticHdpeBalances: Record<string, string> = {
  Grail: '1500.00',
  Iraldis: '1500.00',
  Opal: '1500.00',
  Reliance: '1500.00',
};

export const staticChemicalBalances: Record<string, string> = {
  ACM: '150.00',
  'DN-MB': '150.00',
};

export const staticColorBalances: Record<string, string> = {
  Blue: '60.00',
  Green: '60.00',
  White: '60.00',
};

export const staticExtruderRows = [
  {
    id: 'static-ext-1',
    size: '40"',
    color: 'Blue',
    brand: 'Grail',
    chemical: 'ACM',
    raw: 1250,
    chemicalKg: 25,
    output: 1235,
    colorConsumedKg: 12.5,
    lumpsKg: 18,
    yarnWasteKg: 34.5,
  },
  {
    id: 'static-ext-2',
    size: '30"',
    color: 'Green',
    brand: 'Iraldis',
    chemical: 'DN-MB',
    raw: 1100,
    chemicalKg: 22,
    output: 1088,
    colorConsumedKg: 11,
    lumpsKg: 15,
    yarnWasteKg: 30,
  },
  {
    id: 'static-ext-3',
    size: '20"',
    color: 'White',
    brand: 'Opal',
    chemical: 'ACM',
    raw: 980,
    chemicalKg: 19.6,
    output: 968,
    colorConsumedKg: 9.8,
    lumpsKg: 12,
    yarnWasteKg: 29.4,
  },
];

export const staticLoomRows = [
  { id: 'static-loom-1', size: '40"', color: 'Blue', input: 1235, output: 1210, loomsWasteKg: 25 },
  { id: 'static-loom-2', size: '30"', color: 'Green', input: 1088, output: 1065, loomsWasteKg: 23 },
  { id: 'static-loom-3', size: '20"', color: 'White', input: 968, output: 948, loomsWasteKg: 20 },
];

export const staticFabricRows = [
  {
    id: 'static-fab-1',
    size: '40"',
    color: 'Blue',
    input: 1250,
    output: 1210,
    pieceCount: 12,
    firstGrade: 0,
    secondGrade: 0,
    fwKg: 15,
    bwKg: 25,
  },
  {
    id: 'static-fab-2',
    size: '30"',
    color: 'Green',
    input: 1250,
    output: 1210,
    pieceCount: 12,
    firstGrade: 0,
    secondGrade: 0,
    fwKg: 15,
    bwKg: 25,
  },
  {
    id: 'static-fab-3',
    size: '20"',
    color: 'White',
    input: 1250,
    output: 1210,
    pieceCount: 12,
    firstGrade: 0,
    secondGrade: 0,
    fwKg: 15,
    bwKg: 25,
  },
];

export const staticDeliveredRows = [
  { id: 'static-del-1', size: '40"', color: 'Blue', delivered: 1210 },
  { id: 'static-del-2', size: '30"', color: 'Green', delivered: 1065 },
  { id: 'static-del-3', size: '20"', color: 'White', delivered: 948 },
];

/** Day-wise production list (most recent first). */
export const staticDayWiseRows = [
  {
    date: '2026-08-25',
    extruder: { input: 3330, output: 3291, wastage: 139, wastePct: 4.17 },
    looms: { input: 3291, output: 3223, wastage: 68, wastePct: 2.07 },
    fabric: { input: 3750, output: 3630, wastage: 120, wastePct: 3.2 },
  },
  {
    date: '2026-08-24',
    extruder: { input: 3180, output: 3142, wastage: 132, wastePct: 4.15 },
    looms: { input: 3142, output: 3078, wastage: 64, wastePct: 2.04 },
    fabric: { input: 3600, output: 3487, wastage: 113, wastePct: 3.14 },
  },
  {
    date: '2026-08-23',
    extruder: { input: 2950, output: 2914, wastage: 121, wastePct: 4.1 },
    looms: { input: 2914, output: 2855, wastage: 59, wastePct: 2.02 },
    fabric: { input: 3400, output: 3295, wastage: 105, wastePct: 3.09 },
  },
];

export const staticDayWiseTotals = {
  extruder: { input: 9460, output: 9347, wastage: 392, wastePct: 4.14 },
  looms: { input: 9347, output: 9156, wastage: 191, wastePct: 2.04 },
  fabric: { input: 10750, output: 10412, wastage: 338, wastePct: 3.14 },
};

export const staticDayWiseSummary = {
  extruder: { inputKg: 9460, outputKg: 9347, wastageKg: 392, wastePct: 4.14, efficiencyPct: 98.8 },
  looms: { inputKg: 9347, outputKg: 9156, wastageKg: 191, wastePct: 2.04, efficiencyPct: 97.9 },
  fabricChecking: { inputKg: 10750, outputKg: 10412, wastageKg: 338, wastePct: 3.14, efficiencyPct: 96.9 },
};
