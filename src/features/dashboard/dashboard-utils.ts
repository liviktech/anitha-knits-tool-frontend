// ─── Shared constants ────────────────────────────────────────────────────────

export const FABRIC_STOCK_SIZES = ['150cm', '160cm', '170cm', '180cm', '190cm'] as const;
export type FabricStockSize = (typeof FABRIC_STOCK_SIZES)[number];

export const FABRIC_COLORS = ['Blue', 'Green', 'White'] as const;
export type FabricColor = (typeof FABRIC_COLORS)[number];

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Color helpers ────────────────────────────────────────────────────────────

export function deliveryColorClass(color: string): string {
  const c = color.toLowerCase();
  if (c === 'blue') return 'text-[#0088CC]';
  if (c === 'green') return 'text-[#5BA300]';
  return 'text-gray-700';
}

export function fabricStockCardTheme(color: string): { bg: string; border: string; swatch: string } {
  const c = color.toLowerCase();
  if (c === 'blue') return { bg: 'bg-[#0088CC]/5', border: 'border-[#B8DCEF]', swatch: 'bg-[#0088CC]' };
  if (c === 'green') return { bg: 'bg-[#5BA300]/5', border: 'border-[#D2E6B8]', swatch: 'bg-[#5BA300]' };
  return { bg: 'bg-gray-100/60', border: 'border-gray-300', swatch: 'bg-gray-500' };
}

// ─── Table shape helpers ──────────────────────────────────────────────────────

/** Converts a color row (chemical × sizes) into DetailBreakdownCard's `table` shape. */
export function toChemicalTable(colorRow: {
  chemicals: { chemical: string; sizes: { size: string; production: number }[] }[];
}) {
  const columns = Array.from(
    new Set(colorRow.chemicals.flatMap((c) => c.sizes.map((s) => s.size))),
  ).sort((a, b) => a.localeCompare(b));

  const rows = colorRow.chemicals.map((c) => ({
    label: c.chemical,
    values: Object.fromEntries(c.sizes.map((s) => [s.size, s.production])),
  }));

  return { columns, rows };
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ColorChemicalRow {
  color: string;
  chemicals: {
    chemical: string;
    sizes: {
      size: string;
      lums: number;
      yarnWaste: number;
      loomsWaste: number;
      fabricWaste: number;
      bitWaste: number;
    }[];
  }[];
}

export interface ExtruderSummaryColorRow {
  color: string;
  production: number;
  uniqueSizeCount: number;
  chemicals: {
    chemical: string;
    production: number;
    sizes: { size: string; production: number }[];
  }[];
}

export interface BalanceColorRow {
  color: string;
  balance: number;
}

export interface BalanceVariantRow {
  color: string;
  sizes: { size: string; balance: number }[];
}

export interface WasteColorRow {
  color: string;
  loomsWaste?: number;
  fabricWaste?: number;
  bitWaste?: number;
}

export interface DeliveryItem {
  id: string;
  date: string;
  size: string;
  chemical: string;
  kg: number;
}

export interface DeliveryColorRow {
  color: string;
  deliveries: DeliveryItem[];
  total: number;
}

export interface FabricStockColorRow {
  color: string;
  colorClass: string;
  stockBySize: Record<string, number>;
}
