import { useMemo } from 'react';
import {
  useMonthlyDashboard,
  type ExtruderProductionVariantChemicalSummary,
  type LoomsProductionVariantChemicalSummary,
  type FabricProductionVariantChemicalSummary,
} from '@/features/dashboard/dashboard-queries';
import { useOpeningBalanceWastage, useOpeningBalanceFabricStock } from '@/features/admin-panel/opening-balance-queries';

// One row per size+color+chemical combination that actually has data — zero/absent
// combinations are filtered out at build time, never rendered as zero rows.
export interface VariantRow {
  size: string;
  color: string;
  chemical: string;
  value: number;
}

export interface ExtruderWasteVariantRow {
  size: string;
  color: string;
  chemical: string;
  lums: number;
  yarnWaste: number;
}

export interface LoomsWasteVariantRow {
  size: string;
  color: string;
  chemical: string;
  loomsWaste: number;
}

export interface FabricWasteVariantRow {
  size: string;
  color: string;
  chemical: string;
  fabricWaste: number;
  bitWaste: number;
}

function normalizeColor(raw: string): string {
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function sortVariants<T extends { size: string; color: string; chemical: string }>(rows: T[]): T[] {
  return rows.sort((a, b) => a.size.localeCompare(b.size) || a.color.localeCompare(b.color) || a.chemical.localeCompare(b.chemical));
}

function buildProductionVariantRows<T extends { color: { name: string }; size: { name: string }; chemical: { name: string } }>(
  rows: T[],
  getValue: (r: T) => number,
): VariantRow[] {
  const out = rows
    .map((r) => ({ size: r.size.name, color: r.color.name, chemical: r.chemical.name, value: getValue(r) }))
    .filter((r) => r.value > 0);
  return sortVariants(out);
}

function buildExtruderWasteVariantRows(rows: ExtruderProductionVariantChemicalSummary[]): ExtruderWasteVariantRow[] {
  const out = rows
    .filter((r) => r.lumsKg > 0 || r.yarnWasteKg > 0)
    .map((r) => ({ size: r.size.name, color: r.color.name, chemical: r.chemical.name, lums: r.lumsKg, yarnWaste: r.yarnWasteKg }));
  return sortVariants(out);
}

function buildLoomsWasteVariantRows(rows: LoomsProductionVariantChemicalSummary[]): LoomsWasteVariantRow[] {
  const out = rows
    .filter((r) => r.waste > 0)
    .map((r) => ({ size: r.size.name, color: r.color.name, chemical: r.chemical.name, loomsWaste: r.waste }));
  return sortVariants(out);
}

function buildFabricWasteVariantRows(rows: FabricProductionVariantChemicalSummary[]): FabricWasteVariantRow[] {
  const out = rows
    .filter((r) => r.fwWasteKg > 0 || r.bwWasteKg > 0)
    .map((r) => ({ size: r.size.name, color: r.color.name, chemical: r.chemical.name, fabricWaste: r.fwWasteKg, bitWaste: r.bwWasteKg }));
  return sortVariants(out);
}

/** Yarn Balance: extruder yarn produced minus looms yarn consumed (yarnInputKg only — wastage is NOT subtracted), per size+color+chemical. */
function buildYarnBalanceVariantRows(
  extruderRows: ExtruderProductionVariantChemicalSummary[],
  loomsRows: LoomsProductionVariantChemicalSummary[],
): VariantRow[] {
  const map = new Map<string, VariantRow>();
  const bump = (size: string, color: string, chemical: string, delta: number) => {
    const key = `${size}|${color}|${chemical}`;
    const entry = map.get(key) ?? { size, color, chemical, value: 0 };
    entry.value += delta;
    map.set(key, entry);
  };
  extruderRows.forEach((r) => bump(r.size.name, r.color.name, r.chemical.name, r.production));
  // Yarn Balance = Extruder yarn produced minus Looms yarn consumed (yarnInputKg only).
  // Wastage is NOT subtracted — waste is a separate tracking concern and does not
  // reduce the available yarn balance (matches the backend's YARN_INPUT_EXCEEDS_AVAILABLE logic).
  loomsRows.forEach((r) => bump(r.size.name, r.color.name, r.chemical.name, -(r.production)));

  const out = Array.from(map.values())
    .map((r) => ({ ...r, value: Math.max(0, r.value) }))
    .filter((r) => r.value > 0);
  return sortVariants(out);
}

/** Kora Balance: opening-balance kora + looms output minus fabric input, per size+color+chemical. */
function buildKoraBalanceVariantRows(
  obFabricStock: { color: { id: string; name: string } | null; size: { id: string; name: string } | null; chemical: { id: string; name: string } | null; koraBalanceKg: number }[],
  loomsRows: LoomsProductionVariantChemicalSummary[],
  fabricRows: FabricProductionVariantChemicalSummary[],
  isSample: boolean,
): VariantRow[] {
  const map = new Map<string, VariantRow>();
  const bump = (size: string, color: string, chemical: string, delta: number) => {
    const key = `${size}|${color}|${chemical}`;
    const entry = map.get(key) ?? { size, color, chemical, value: 0 };
    entry.value += delta;
    map.set(key, entry);
  };
  if (!isSample) {
    obFabricStock.forEach((r) => {
      if (!r.color?.name || !r.size?.name) return;
      const color = normalizeColor(r.color.name.trim());
      const chemical = r.chemical?.name || 'Unknown';
      bump(r.size.name, color, chemical, r.koraBalanceKg || 0);
    });
  }
  loomsRows.forEach((r) => bump(r.size.name, r.color.name, r.chemical.name, r.production));
  fabricRows.forEach((r) => bump(r.size.name, r.color.name, r.chemical.name, -(r.fabricInputKg || 0)));

  const out = Array.from(map.values())
    .map((r) => ({ ...r, value: Math.max(0, r.value) }))
    .filter((r) => r.value > 0);
  return sortVariants(out);
}

function buildFabricStockVariantRows(
  stockBalance: { color: { name: string }; size: { name: string }; chemical: { name: string } | null; availableFabricStockKg: number }[],
): VariantRow[] {
  const map = new Map<string, VariantRow>();
  stockBalance.forEach((r) => {
    const chemical = r.chemical?.name ?? 'Unknown';
    const key = `${r.size.name}|${r.color.name}|${chemical}`;
    const entry = map.get(key) ?? { size: r.size.name, color: r.color.name, chemical, value: 0 };
    entry.value += r.availableFabricStockKg || 0;
    map.set(key, entry);
  });
  const out = Array.from(map.values()).filter((r) => r.value > 0);
  return sortVariants(out);
}

function buildFabricDeliveredVariantRows(
  items: { color: { name: string }; size: { name: string }; chemical: { name: string } | null; loadSent: { fabricWeight: number } | null }[],
): VariantRow[] {
  const map = new Map<string, VariantRow>();
  items.forEach((item) => {
    const chemical = item.chemical?.name ?? 'Unknown';
    const key = `${item.size.name}|${item.color.name}|${chemical}`;
    const entry = map.get(key) ?? { size: item.size.name, color: item.color.name, chemical, value: 0 };
    entry.value += item.loadSent?.fabricWeight ?? 0;
    map.set(key, entry);
  });
  const out = Array.from(map.values()).filter((r) => r.value > 0);
  return sortVariants(out);
}

export function useDashboardReportData(fromMonthStr: string, toMonthStr: string, isSample: boolean = false) {
  const { dashboardData } = useMonthlyDashboard(fromMonthStr, toMonthStr, isSample ? 'SAMPLE' : undefined);
  const { data: obWastageRes } = useOpeningBalanceWastage('?limit=100');
  const obWastage = obWastageRes?.data || [];

  const { data: obFabricStockRes } = useOpeningBalanceFabricStock('?limit=100');
  const obFabricStock = obFabricStockRes?.data || [];

  return useMemo(() => {
    if (!dashboardData) return null;

    const extruderByVariantChemical = dashboardData.extruderProduction?.byVariantChemical ?? [];
    const loomsByVariantChemical = dashboardData.loomsProduction?.byVariantChemical ?? [];
    const fabricByVariantChemical = dashboardData.fabricProduction?.byVariantChemical ?? [];

    const extruderVariantRows = buildProductionVariantRows(extruderByVariantChemical, (r) => r.production);
    const extruderTotal = dashboardData.extruderProduction?.overall.production || 0;

    const loomsVariantRows = buildProductionVariantRows(loomsByVariantChemical, (r) => r.production);
    const loomsTotal = dashboardData.loomsProduction?.overall.production || 0;

    const fabricVariantRows = buildProductionVariantRows(fabricByVariantChemical, (r) => r.outputKg);
    const fabricTotal = dashboardData.fabricProduction.overall.outputKg || 0;

    const yarnBalanceVariantRows = buildYarnBalanceVariantRows(extruderByVariantChemical, loomsByVariantChemical);
    const koraBalanceVariantRows = buildKoraBalanceVariantRows(obFabricStock, loomsByVariantChemical, fabricByVariantChemical, isSample);

    const fabricStockVariantRows = buildFabricStockVariantRows(dashboardData.stockBalance || []);
    const obFabricStockTotal = isSample ? 0 : obFabricStock.reduce((sum, r) => sum + (r.fabricStockKg || 0), 0);
    const totalFabricStock = fabricStockVariantRows.reduce((sum, r) => sum + r.value, 0) + obFabricStockTotal;

    const fabricDeliveredVariantRows = buildFabricDeliveredVariantRows(dashboardData.loadSent.items || []);
    const totalDelivered = dashboardData.loadSent.totals.fabricWeightKg || 0;

    // Wastage data — KPI totals fold in opening-balance wastage (not itemised by variant); the
    // Size/Color/Chemical breakdown tables cover this period's recorded production only.
    let totalObLums = 0;
    let totalObLoose = 0;
    if (!isSample) {
      obWastage.forEach((r) => {
        totalObLums += r.extruderLumpsKg || 0;
        totalObLoose += r.extruderLoomsWasteKg || 0;
      });
    }
    const looseWasteKg = (dashboardData.wastage.byType.find((w) => w.code === 'YARN_WASTE')?.quantityKg || 0) + totalObLoose;
    const lumsWasteKg = (dashboardData.wastage.byType.find((w) => w.code === 'LUMPS')?.quantityKg || 0) + totalObLums;

    const extruderWasteVariantRows = buildExtruderWasteVariantRows(extruderByVariantChemical);
    const extruderWasteTotal = extruderWasteVariantRows.reduce((sum, r) => sum + r.lums + r.yarnWaste, 0);

    const loomsWasteVariantRows = buildLoomsWasteVariantRows(loomsByVariantChemical);
    const loomsWasteTotal = loomsWasteVariantRows.reduce((sum, r) => sum + r.loomsWaste, 0);

    const fabricWasteVariantRows = buildFabricWasteVariantRows(fabricByVariantChemical);
    const fabricWasteTotal = fabricWasteVariantRows.reduce((sum, r) => sum + r.fabricWaste + r.bitWaste, 0);

    return {
      extruderVariantRows,
      extruderTotal,
      loomsVariantRows,
      loomsTotal,
      fabricVariantRows,
      fabricTotal,
      yarnBalanceVariantRows,
      koraBalanceVariantRows,
      fabricStockVariantRows,
      totalFabricStock,
      fabricDeliveredVariantRows,
      totalDelivered,
      // Wastage specific
      extruderWasteVariantRows,
      extruderWasteTotal,
      loomsWasteVariantRows,
      loomsWasteTotal,
      fabricWasteVariantRows,
      fabricWasteTotal,
      looseWasteKg,
      lumsWasteKg,
    };
  }, [dashboardData, obFabricStock, obWastage, isSample]);
}
