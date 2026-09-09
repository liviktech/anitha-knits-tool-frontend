import { useMemo } from 'react';
import { useMonthlyDashboard } from './dashboard-queries';
import { useOpeningBalanceWastage, useOpeningBalanceFabricStock, useOpeningBalanceRawMaterials } from '@/features/admin-panel/opening-balance-queries';
import { useExtruderProductions } from '@/features/extruder/extruder-queries';
import { useLoomsProductions } from '@/features/looms/loom-queries';
import { useFabricCheckingRecords } from '@/features/fabric/fabric-queries';
import {
  FABRIC_COLORS,
  FABRIC_STOCK_SIZES,
  deliveryColorClass,
  type ExtruderSummaryColorRow,
  type BalanceColorRow,
  type BalanceVariantRow,
  type ColorChemicalRow,
  type DeliveryColorRow,
  type FabricStockColorRow,
} from './dashboard-utils';

// ─── Internal builder helpers ────────────────────────────────────────────────

function buildSummaryRows(
  records: any[],
  byColorSummary: any[],
  stage: 'extruder' | 'looms' | 'fabric',
  currentMonthStr: string,
): ExtruderSummaryColorRow[] {
  return FABRIC_COLORS.map((color) => {
    const stageRecords = records.filter(
      (r: any) =>
        r.color?.name?.toLowerCase() === color.toLowerCase() &&
        r.productionDate?.startsWith(currentMonthStr),
    );

    const uniqueSizes = new Set<string>();
    const chemMap = new Map<string, { total: number; sizes: Map<string, number> }>();

    stageRecords.forEach((r: any) => {
      const chemical = r.chemical?.name || r.extruder?.chemical?.name || 'Unknown';
      const size = r.size?.name;
      let output = 0;
      if (stage === 'extruder') output = r.extruder?.yarnOutputKg ?? 0;
      if (stage === 'looms') output = r.loom?.fabricOutputKg ?? 0;
      if (stage === 'fabric') output = r.fabricCheck?.outputKg ?? 0;
      if (!size) return;
      uniqueSizes.add(size);
      if (!chemMap.has(chemical)) chemMap.set(chemical, { total: 0, sizes: new Map() });
      const entry = chemMap.get(chemical)!;
      entry.total += output;
      entry.sizes.set(size, (entry.sizes.get(size) ?? 0) + output);
    });

    const chemicals = Array.from(chemMap.entries())
      .map(([chemical, entry]) => ({
        chemical,
        production: entry.total,
        sizes: Array.from(entry.sizes.entries())
          .map(([size, production]) => ({ size, production }))
          .sort((a, b) => a.size.localeCompare(b.size)),
      }))
      .sort((a, b) => a.chemical.localeCompare(b.chemical));

    const summaryRecord = byColorSummary.find((s: any) => s.color.name === color);
    return {
      color,
      production: summaryRecord?.production ?? 0,
      uniqueSizeCount: uniqueSizes.size,
      chemicals,
    };
  });
}

export function buildWastageChemicalRows(
  records: any[],
  stage: 'extruder' | 'looms' | 'fabric',
  currentMonthStr: string,
  obRecords: any[] = [],
): ColorChemicalRow[] {
  return FABRIC_COLORS.map((color) => {
    const stageRecords = records.filter(
      (r: any) =>
        r.color?.name?.toLowerCase() === color.toLowerCase() &&
        r.productionDate?.startsWith(currentMonthStr),
    );

    const chemMap = new Map<string, {
      lums: Map<string, number>;
      yarnWaste: Map<string, number>;
      loomsWaste: Map<string, number>;
      fabricWaste: Map<string, number>;
      bitWaste: Map<string, number>;
    }>();

    stageRecords.forEach((r: any) => {
      const chemical = r.chemical?.name || r.extruder?.chemical?.name || 'Unknown';
      const size = r.size?.name;
      if (!size) return;
      if (!chemMap.has(chemical)) {
        chemMap.set(chemical, {
          lums: new Map(), yarnWaste: new Map(),
          loomsWaste: new Map(), fabricWaste: new Map(), bitWaste: new Map(),
        });
      }
      const entry = chemMap.get(chemical)!;
      if (stage === 'extruder') {
        const lumsKg = r.wastages?.find((w: any) => w.wastageType?.code === 'LUMPS')?.quantityKg ?? 0;
        const yarnKg = r.wastages?.find((w: any) => w.wastageType?.code === 'YARN_WASTE')?.quantityKg ?? 0;
        entry.lums.set(size, (entry.lums.get(size) ?? 0) + lumsKg);
        entry.yarnWaste.set(size, (entry.yarnWaste.get(size) ?? 0) + yarnKg);
      } else if (stage === 'looms') {
        const lwKg = r.wastages?.find((w: any) => w.wastageType?.code === 'LOOMS_WASTE')?.quantityKg ?? 0;
        entry.loomsWaste.set(size, (entry.loomsWaste.get(size) ?? 0) + lwKg);
      } else {
        const fwKg = r.wastages?.find((w: any) => w.wastageType?.code === 'FW')?.quantityKg ?? 0;
        const bwKg = r.wastages?.find((w: any) => w.wastageType?.code === 'BW')?.quantityKg ?? 0;
        entry.fabricWaste.set(size, (entry.fabricWaste.get(size) ?? 0) + fwKg);
        entry.bitWaste.set(size, (entry.bitWaste.get(size) ?? 0) + bwKg);
      }
    });

    // Opening Balance wastage is a running baseline, not tied to a production
    // month, so it's merged in unfiltered — matching how looseWasteKg/lumsWasteKg
    // and loomsWasteByColor/fabricWasteByColor already fold it into their totals.
    obRecords
      .filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase())
      .forEach((r: any) => {
        const chemical = r.chemical?.name || 'Unknown';
        const size = r.size?.name;
        if (!size) return;
        if (!chemMap.has(chemical)) {
          chemMap.set(chemical, {
            lums: new Map(), yarnWaste: new Map(),
            loomsWaste: new Map(), fabricWaste: new Map(), bitWaste: new Map(),
          });
        }
        const entry = chemMap.get(chemical)!;
        if (stage === 'extruder') {
          entry.lums.set(size, (entry.lums.get(size) ?? 0) + (r.extruderLumpsKg || 0));
          entry.yarnWaste.set(size, (entry.yarnWaste.get(size) ?? 0) + (r.extruderLoomsWasteKg || 0));
        } else if (stage === 'looms') {
          entry.loomsWaste.set(size, (entry.loomsWaste.get(size) ?? 0) + (r.loomsYarnWasteKg || 0));
        } else {
          entry.fabricWaste.set(size, (entry.fabricWaste.get(size) ?? 0) + (r.fabricWasteKg || 0));
          entry.bitWaste.set(size, (entry.bitWaste.get(size) ?? 0) + (r.fabricBitwasteKg || 0));
        }
      });

    const chemicals = Array.from(chemMap.entries())
      .map(([chemical, entry]) => ({
        chemical,
        sizes: FABRIC_STOCK_SIZES.map((size) => ({
          size,
          lums: entry.lums.get(size) ?? 0,
          yarnWaste: entry.yarnWaste.get(size) ?? 0,
          loomsWaste: entry.loomsWaste.get(size) ?? 0,
          fabricWaste: entry.fabricWaste.get(size) ?? 0,
          bitWaste: entry.bitWaste.get(size) ?? 0,
        })),
      }))
      .sort((a, b) => a.chemical.localeCompare(b.chemical));

    return { color, chemicals };
  });
}

// Sample-side equivalent of looseWasteKg/lumsWasteKg/loomsWasteByColor/fabricWasteByColor —
// used both by the on-screen Wastage tab's Sample toggle and the Wastage Summary report, so the
// report can show the exact numbers the toggle is currently displaying.
export function buildSampleWastageTotals(
  sampleExtruderData: any[],
  sampleLoomsData: any[],
  sampleFabricData: any[],
  currentMonthStr: string,
) {
  const sampleLooseWaste = sampleExtruderData
    .filter((r: any) => r.productionDate?.startsWith(currentMonthStr))
    .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'YARN_WASTE')?.quantityKg ?? 0), 0);
  const sampleLums = sampleExtruderData
    .filter((r: any) => r.productionDate?.startsWith(currentMonthStr))
    .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'LUMPS')?.quantityKg ?? 0), 0);

  const sampleLoomsWasteByColor = FABRIC_COLORS.map((color) => ({
    color,
    loomsWaste: sampleLoomsData
      .filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase() && r.productionDate?.startsWith(currentMonthStr))
      .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'LOOMS_WASTE')?.quantityKg ?? 0), 0),
  }));

  const sampleFabricWasteByColor = FABRIC_COLORS.map((color) => ({
    color,
    fabricWaste: sampleFabricData
      .filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase() && r.productionDate?.startsWith(currentMonthStr))
      .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'FW')?.quantityKg ?? 0), 0),
    bitWaste: sampleFabricData
      .filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase() && r.productionDate?.startsWith(currentMonthStr))
      .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'BW')?.quantityKg ?? 0), 0),
  }));

  return { sampleLooseWaste, sampleLums, sampleLoomsWasteByColor, sampleFabricWasteByColor };
}

function buildExtruderSummaryRows(dataMap: Map<string, any>): ExtruderSummaryColorRow[] {
  return FABRIC_COLORS.map((color) => {
    let colorTotal = 0;
    const chemMap = new Map<string, { total: number; sizes: Map<string, number> }>();
    const uniqueSizes = new Set<string>();

    dataMap.forEach((entry, key) => {
      const parts = key.split('_');
      if (parts[0] !== color) return;
      const size = parts[1];
      const chemical = parts[2] && parts[2] !== 'null' ? parts[2] : 'Unknown';
      const output = entry.balance ?? entry.availableFabricStockKg ?? entry.kg ?? 0;
      if (output <= 0) return;
      colorTotal += output;
      uniqueSizes.add(size);
      if (!chemMap.has(chemical)) chemMap.set(chemical, { total: 0, sizes: new Map() });
      const chemEntry = chemMap.get(chemical)!;
      chemEntry.total += output;
      chemEntry.sizes.set(size, (chemEntry.sizes.get(size) ?? 0) + output);
    });

    const chemicals = Array.from(chemMap.entries())
      .map(([chem, entry]) => ({
        chemical: chem,
        production: entry.total,
        sizes: Array.from(entry.sizes.entries())
          .map(([s, p]) => ({ size: s, production: p }))
          .sort((a, b) => a.size.localeCompare(b.size)),
      }))
      .sort((a, b) => a.chemical.localeCompare(b.chemical));

    return { color, production: colorTotal, uniqueSizeCount: uniqueSizes.size, chemicals };
  });
}

function normalizeColor(raw: string): string {
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function toKey(c: string, s: string, ch: string): string {
  return `${c}_${s}_${ch}`;
}

// ─── Return type ─────────────────────────────────────────────────────────────

export interface DashboardDataResult {
  isLoading: boolean;

  // Raw materials inventory
  rawMaterials: { weight: number; items: { name: string; weight: number; bags: number }[] };
  chemicals: { weight: number; items: { name: string; weight: number; bags: number }[] };
  invColors: { weight: number; items: { name: string; weight: number; bags: number }[] };

  // Production tab
  extruderColorRows: ExtruderSummaryColorRow[];
  extruderGrandTotal: number;
  extruderBySizeRows: { label: string; production: number }[];
  extruderByChemicalRows: { label: string; production: number }[];
  extruderWasteBySize: { label: string; lums: number; yarnWaste: number }[];
  extruderWasteByChemical: { label: string; lums: number; yarnWaste: number }[];
  extruderWasteSummaryByColor: { color: string; lums: number; yarnWaste: number }[];

  loomsColorRows: ExtruderSummaryColorRow[];
  loomsGrandTotal: number;
  loomsBySizeRows: { label: string; production: number }[];
  loomsByChemicalRows: { label: string; production: number }[];
  loomsWasteBySize: { label: string; loomsWaste: number }[];
  loomsWasteByChemical: { label: string; loomsWaste: number }[];
  loomsWasteByColor: { color: string; loomsWaste: number }[];

  fabricColorRows: ExtruderSummaryColorRow[];
  fabricGrandTotal: number;
  fabricBySizeRows: { label: string; production: number }[];
  fabricByChemicalRows: { label: string; production: number }[];
  fabricWasteBySize: { label: string; fabricWaste: number; bitWaste: number }[];
  fabricWasteByChemical: { label: string; fabricWaste: number; bitWaste: number }[];
  fabricWasteByColor: { color: string; fabricWaste: number; bitWaste: number }[];

  yarnBalanceByColor: BalanceColorRow[];
  yarnBalanceByVariant: BalanceVariantRow[];
  yarnBalanceColorRows: ExtruderSummaryColorRow[];

  koraBalanceByColor: BalanceColorRow[];
  koraBalanceByVariant: BalanceVariantRow[];
  koraBalanceColorRows: ExtruderSummaryColorRow[];

  fabricStockColorRows: ExtruderSummaryColorRow[];
  fabricStockByColor: FabricStockColorRow[];
  totalFabricStockKg: number;

  fabricDeliveredColorRows: ExtruderSummaryColorRow[];
  monthDeliveriesByColor: DeliveryColorRow[];
  selectedMonthDeliveryTotal: number;

  looseWasteKg: number;
  lumsWasteKg: number;

  // Wastage raw records (passed to WastageTabContent)
  extruderProductionsData: any[];
  loomsProductionsData: any[];
  fabricCheckingData: any[];
  obWastage: any[];

  // Sample tab
  sampleExtruderColorRows: ExtruderSummaryColorRow[];
  sampleExtruderGrandTotal: number;
  sampleExtruderBySizeRows: { label: string; production: number }[];
  sampleExtruderByChemicalRows: { label: string; production: number }[];

  sampleLoomsColorRows: ExtruderSummaryColorRow[];
  sampleLoomsGrandTotal: number;
  sampleLoomsBySizeRows: { label: string; production: number }[];
  sampleLoomsByChemicalRows: { label: string; production: number }[];

  sampleFabricColorRows: ExtruderSummaryColorRow[];
  sampleFabricGrandTotal: number;
  sampleFabricBySizeRows: { label: string; production: number }[];
  sampleFabricByChemicalRows: { label: string; production: number }[];

  sampleYarnBalanceByColor: BalanceColorRow[];
  sampleYarnBalanceByVariant: BalanceVariantRow[];
  sampleYarnBalanceColorRows: ExtruderSummaryColorRow[];

  sampleKoraBalanceByColor: BalanceColorRow[];
  sampleKoraBalanceByVariant: BalanceVariantRow[];
  sampleKoraBalanceColorRows: ExtruderSummaryColorRow[];

  sampleFabricStockColorRows: ExtruderSummaryColorRow[];
  sampleFabricStockByColor: FabricStockColorRow[];
  sampleTotalFabricStockKg: number;

  sampleFabricDeliveredColorRows: ExtruderSummaryColorRow[];
  sampleDeliveriesByColor: DeliveryColorRow[];
  sampleSelectedMonthDeliveryTotal: number;

  // Sample wastage raw records
  sampleExtruderData: any[];
  sampleLoomsData: any[];
  sampleFabricData: any[];
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useDashboardData(currentMonthStr: string): DashboardDataResult {
  const { dashboardData, isLoading: loadingDashboard } = useMonthlyDashboard(currentMonthStr, currentMonthStr, 'PRODUCTION');
  const { dashboardData: sampleDashboardData, isLoading: loadingSampleDashboard } = useMonthlyDashboard(currentMonthStr, currentMonthStr, 'SAMPLE');

  const { data: extruderProductionsRes } = useExtruderProductions('?limit=100&type=PRODUCTION');
  const { data: sampleExtruderProductionsRes } = useExtruderProductions('?limit=100&type=SAMPLE');
  const { data: loomsProductionsRes } = useLoomsProductions('?limit=100&type=PRODUCTION');
  const { data: sampleLoomsProductionsRes } = useLoomsProductions('?limit=100&type=SAMPLE');
  const { data: fabricCheckingRes } = useFabricCheckingRecords('?limit=100&type=PRODUCTION');
  const { data: sampleFabricCheckingRes } = useFabricCheckingRecords('?limit=100&type=SAMPLE');

  const { data: obRawMaterialsRes } = useOpeningBalanceRawMaterials('?limit=100');
  const { data: obWastageRes } = useOpeningBalanceWastage('?limit=100');
  const { data: obFabricStockRes } = useOpeningBalanceFabricStock('?limit=100');

  const obRawMaterials = obRawMaterialsRes?.data ?? [];
  const obWastage = obWastageRes?.data ?? [];
  const obFabricStock = obFabricStockRes?.data ?? [];

  return useMemo(() => {
    const isLoading = loadingDashboard || loadingSampleDashboard;

    // ── Raw materials ──────────────────────────────────────────────────────
    const getObInvTotals = (type: string) => {
      const relevant = obRawMaterials.filter((r) => r.type === type);
      const weight = relevant.reduce((sum, r) => sum + r.weightKg, 0);
      const itemsMap = new Map<string, { weight: number; bags: number }>();
      relevant.forEach((r) => {
        const entry = itemsMap.get(r.name) ?? { weight: 0, bags: 0 };
        entry.weight += r.weightKg;
        entry.bags += r.bagCount || 0;
        itemsMap.set(r.name, entry);
      });
      return { weight, itemsMap };
    };

    const combineInvItems = (
      baseItems: { name: string; weight: number; bags: number }[],
      obMap: Map<string, { weight: number; bags: number }>,
    ) => {
      const combined = new Map(obMap);
      baseItems.forEach((item) => {
        const entry = combined.get(item.name) ?? { weight: 0, bags: 0 };
        combined.set(item.name, { weight: entry.weight + item.weight, bags: entry.bags + item.bags });
      });
      return Array.from(combined.entries()).map(([name, v]) => ({ name, weight: v.weight, bags: v.bags }));
    };

    const obHdpe = getObInvTotals('HDPE');
    const obChemical = getObInvTotals('CHEMICAL');
    const obColor = getObInvTotals('COLOR');

    const rawMaterials = {
      weight: (dashboardData?.inventory?.HDPE?.totalWeightKg || 0) + obHdpe.weight,
      items: combineInvItems(
        dashboardData?.inventory?.HDPE?.items?.map((i) => ({ name: i.name, weight: i.weightKg, bags: i.bagCount || 0 })) ?? [],
        obHdpe.itemsMap,
      ),
    };
    const chemicals = {
      weight: (dashboardData?.inventory?.CHEMICAL?.totalWeightKg || 0) + obChemical.weight,
      items: combineInvItems(
        dashboardData?.inventory?.CHEMICAL?.items?.map((i) => ({ name: i.name, weight: i.weightKg, bags: i.bagCount || 0 })) ?? [],
        obChemical.itemsMap,
      ),
    };
    const invColors = {
      weight: (dashboardData?.inventory?.COLOR?.totalWeightKg || 0) + obColor.weight,
      items: combineInvItems(
        dashboardData?.inventory?.COLOR?.items?.map((i) => ({ name: i.name, weight: i.weightKg, bags: i.bagCount || 0 })) ?? [],
        obColor.itemsMap,
      ),
    };

    // ── Opening balance wastage by color ───────────────────────────────────
    const obWastageByColor = new Map<string, { lums: number; loose: number; looms: number; fw: number; bw: number }>();
    obWastage.forEach((r) => {
      const color = normalizeColor(r.color?.name || 'Unknown');
      if (!obWastageByColor.has(color)) obWastageByColor.set(color, { lums: 0, loose: 0, looms: 0, fw: 0, bw: 0 });
      const cur = obWastageByColor.get(color)!;
      cur.lums += r.extruderLumpsKg || 0;
      cur.loose += r.extruderLoomsWasteKg || 0;
      cur.looms += r.loomsYarnWasteKg || 0;
      cur.fw += r.fabricWasteKg || 0;
      cur.bw += r.fabricBitwasteKg || 0;
    });

    let totalObLums = 0, totalObLoose = 0;
    obWastageByColor.forEach((v) => { totalObLums += v.lums; totalObLoose += v.loose; });

    const looseWasteKg = (dashboardData?.wastage.byType.find((w) => w.code === 'YARN_WASTE')?.quantityKg || 0) + totalObLoose;
    const lumsWasteKg  = (dashboardData?.wastage.byType.find((w) => w.code === 'LUMPS')?.quantityKg || 0) + totalObLums;

    // ── Production — extruder ──────────────────────────────────────────────
    const extruderColorRows = buildSummaryRows(
      extruderProductionsRes?.data ?? [],
      dashboardData?.extruderProduction?.byColor ?? [],
      'extruder',
      currentMonthStr,
    );
    const extruderGrandTotal = dashboardData?.extruderProduction?.overall.production || 0;
    const extruderBySizeRows = (dashboardData?.extruderProduction?.bySize ?? []).map((r) => ({ label: r.size.name, production: r.production }));
    const extruderByChemicalRows = (dashboardData?.extruderProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, production: r.production }));
    const extruderWasteBySize = (dashboardData?.extruderProduction?.bySize ?? []).map((r) => ({ label: r.size.name, lums: r.lumsKg, yarnWaste: r.yarnWasteKg }));
    const extruderWasteByChemical = (dashboardData?.extruderProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, lums: r.lumsKg, yarnWaste: r.yarnWasteKg }));

    const extruderByVariantMap = new Map((dashboardData?.extruderProduction?.byVariant ?? []).map((r) => [`${r.color.name}_${r.size.name}`, r]));
    const extruderWasteByVariant = FABRIC_COLORS.map((color) => ({
      color,
      sizes: FABRIC_STOCK_SIZES.map((size) => {
        const r = extruderByVariantMap.get(`${color}_${size}`);
        return { size, lums: r?.lumsKg ?? 0, yarnWaste: r?.yarnWasteKg ?? 0 };
      }),
    }));
    const extruderWasteSummaryByColor = extruderWasteByVariant.map((row) => {
      const ob = obWastageByColor.get(row.color) ?? { lums: 0, loose: 0 };
      return {
        color: row.color,
        lums: row.sizes.reduce((s, r) => s + r.lums, 0) + ob.lums,
        yarnWaste: row.sizes.reduce((s, r) => s + r.yarnWaste, 0) + ob.loose,
      };
    });

    // ── Production — looms ─────────────────────────────────────────────────
    const loomsByColorMap = new Map((dashboardData?.loomsProduction?.byColor ?? []).map((r) => [r.color.name, r]));
    const loomsWasteByColor = FABRIC_COLORS.map((color) => {
      const r = loomsByColorMap.get(color);
      const ob = obWastageByColor.get(color) ?? { looms: 0 };
      return { color, loomsWaste: (r?.waste ?? 0) + ob.looms };
    });
    const loomsByVariantMap = new Map((dashboardData?.loomsProduction?.byVariant ?? []).map((r) => [`${r.color.name}_${r.size.name}`, r]));
    const loomsColorRows = buildSummaryRows(loomsProductionsRes?.data ?? [], dashboardData?.loomsProduction?.byColor ?? [], 'looms', currentMonthStr);
    const loomsGrandTotal = dashboardData?.loomsProduction?.overall.production || 0;
    const loomsBySizeRows = (dashboardData?.loomsProduction?.bySize ?? []).map((r) => ({ label: r.size.name, production: r.production }));
    const loomsByChemicalRows = (dashboardData?.loomsProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, production: r.production }));
    const loomsWasteBySize = (dashboardData?.loomsProduction?.bySize ?? []).map((r) => ({ label: r.size.name, loomsWaste: r.waste }));
    const loomsWasteByChemical = (dashboardData?.loomsProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, loomsWaste: r.waste }));

    // ── Production — fabric ────────────────────────────────────────────────
    const fabricByColorMap = new Map((dashboardData?.fabricProduction.byColor ?? []).map((r) => [r.color.name, r]));
    const fabricInputByColorMap = new Map<string, number>();
    (dashboardData?.fabricProduction.byVariant ?? []).forEach((r) => {
      fabricInputByColorMap.set(r.color.name, (fabricInputByColorMap.get(r.color.name) ?? 0) + r.fabricInputKg);
    });
    const fabricWasteByColor = FABRIC_COLORS.map((color) => {
      const r = fabricByColorMap.get(color);
      const ob = obWastageByColor.get(color) ?? { fw: 0, bw: 0 };
      return { color, fabricWaste: (r?.fwWasteKg ?? 0) + ob.fw, bitWaste: (r?.bwWasteKg ?? 0) + ob.bw };
    });
    const fabricByVariantMap = new Map((dashboardData?.fabricProduction.byVariant ?? []).map((r) => [`${r.color.name}_${r.size.name}`, r]));
    const fabricColorRows = buildSummaryRows(fabricCheckingRes?.data ?? [], dashboardData?.fabricProduction?.byColor ?? [], 'fabric', currentMonthStr);
    const fabricGrandTotal = dashboardData?.fabricProduction.overall.outputKg || 0;
    const fabricBySizeRows = (dashboardData?.fabricProduction?.bySize ?? []).map((r) => ({ label: r.size.name, production: r.production }));
    const fabricByChemicalRows = (dashboardData?.fabricProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, production: r.production }));
    const fabricWasteBySize = (dashboardData?.fabricProduction?.bySize ?? []).map((r) => ({ label: r.size.name, fabricWaste: r.fwWasteKg, bitWaste: r.bwWasteKg }));
    const fabricWasteByChemical = (dashboardData?.fabricProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, fabricWaste: r.fwWasteKg, bitWaste: r.bwWasteKg }));

    // ── Balance maps ───────────────────────────────────────────────────────
    const extruderByColorMap = new Map((dashboardData?.extruderProduction?.byColor ?? []).map((r) => [r.color.name, r]));

    const yarnBalanceMap = new Map<string, any>();
    extruderProductionsRes?.data?.forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? '');
      const s = r.size?.name; const ch = r.chemical?.name || r.extruder?.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      yarnBalanceMap.set(k, { balance: (yarnBalanceMap.get(k)?.balance || 0) + (r.extruder?.yarnOutputKg || 0) });
    });
    loomsProductionsRes?.data?.forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? '');
      const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      yarnBalanceMap.set(k, { balance: (yarnBalanceMap.get(k)?.balance || 0) - (r.loom?.yarnInputKg || 0) });
    });

    const koraBalanceMap = new Map<string, any>();
    obFabricStock.forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? '');
      const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      koraBalanceMap.set(k, { balance: (koraBalanceMap.get(k)?.balance || 0) + (r.koraBalanceKg || 0) });
    });
    // Use monthly dashboard summary (byVariantChemical) so detail rows match the totals.
    (dashboardData?.loomsProduction?.byVariantChemical ?? []).forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? '');
      const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      koraBalanceMap.set(k, { balance: (koraBalanceMap.get(k)?.balance || 0) + (r.production || 0) });
    });
    (dashboardData?.fabricProduction?.byVariantChemical ?? []).forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? '');
      const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      koraBalanceMap.set(k, { balance: (koraBalanceMap.get(k)?.balance || 0) - (r.fabricInputKg || 0) });
    });

    const fabricStockMap = new Map<string, any>();
    (dashboardData?.stockBalance ?? []).forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? '');
      const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      fabricStockMap.set(k, { availableFabricStockKg: (fabricStockMap.get(k)?.availableFabricStockKg || 0) + (r.availableFabricStockKg || 0) });
    });
    obFabricStock.forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? '');
      const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      fabricStockMap.set(k, { availableFabricStockKg: (fabricStockMap.get(k)?.availableFabricStockKg || 0) + (r.fabricStockKg || 0) });
    });

    const fabricDeliveredMap = new Map<string, any>();
    (dashboardData?.loadSent?.items ?? []).forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? '');
      const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      fabricDeliveredMap.set(k, { kg: (fabricDeliveredMap.get(k)?.kg || 0) + (r.loadSent?.fabricWeight || 0) });
    });

    const yarnBalanceColorRows = buildExtruderSummaryRows(yarnBalanceMap);
    const koraBalanceColorRows = buildExtruderSummaryRows(koraBalanceMap);
    const fabricStockColorRows = buildExtruderSummaryRows(fabricStockMap);
    const fabricDeliveredColorRows = buildExtruderSummaryRows(fabricDeliveredMap);

    const yarnBalanceByColor: BalanceColorRow[] = FABRIC_COLORS.map((color) => {
      const yarnProduced = extruderByColorMap.get(color)?.production ?? 0;
      const loomsRow = loomsByColorMap.get(color);
      return { color, balance: Math.max(0, yarnProduced - (loomsRow?.production ?? 0)) };
    });
    const yarnBalanceByVariant: BalanceVariantRow[] = FABRIC_COLORS.map((color) => ({
      color,
      sizes: FABRIC_STOCK_SIZES.map((size) => {
        const key = `${color}_${size}`;
        const yarnProduced = extruderByVariantMap.get(key)?.production ?? 0;
        const loomsRow = loomsByVariantMap.get(key);
        return { size, balance: Math.max(0, yarnProduced - (loomsRow?.production ?? 0)) };
      }),
    }));

    const obKoraByColor = new Map<string, number>();
    obFabricStock.forEach((r) => {
      if (r.color?.name) {
        const c = normalizeColor(r.color.name.trim());
        obKoraByColor.set(c, (obKoraByColor.get(c) ?? 0) + r.koraBalanceKg);
      }
    });
    const koraBalanceByColor: BalanceColorRow[] = FABRIC_COLORS.map((color) => ({
      color,
      balance: Math.max(0, (obKoraByColor.get(color) ?? 0) + (loomsByColorMap.get(color)?.production ?? 0) - (fabricInputByColorMap.get(color) ?? 0)),
    }));
    const obKoraByVariant = new Map<string, number>();
    obFabricStock.forEach((r) => {
      if (r.color?.name && r.size?.name) {
        const c = normalizeColor(r.color.name.trim());
        const k = `${c}_${r.size.name}`;
        obKoraByVariant.set(k, (obKoraByVariant.get(k) ?? 0) + r.koraBalanceKg);
      }
    });
    const koraBalanceByVariant: BalanceVariantRow[] = FABRIC_COLORS.map((color) => ({
      color,
      sizes: FABRIC_STOCK_SIZES.map((size) => {
        const key = `${color}_${size}`;
        return { size, balance: Math.max(0, (obKoraByVariant.get(key) ?? 0) + (loomsByVariantMap.get(key)?.production ?? 0) - (fabricByVariantMap.get(key)?.fabricInputKg ?? 0)) };
      }),
    }));

    // ── Fabric stock by color ──────────────────────────────────────────────
    const buildFabricStockByColor = (
      stockBalanceItems: any[],
      obItems: any[],
    ): FabricStockColorRow[] => {
      const byColor = new Map<string, FabricStockColorRow>();
      FABRIC_COLORS.forEach((color) => byColor.set(color, { color, colorClass: deliveryColorClass(color), stockBySize: {} }));
      stockBalanceItems.forEach((r: any) => {
        const row = byColor.get(r.color.name);
        if (row) row.stockBySize[r.size.name] = (row.stockBySize[r.size.name] || 0) + r.availableFabricStockKg;
      });
      obItems.forEach((r: any) => {
        if (r.color?.name && r.size?.name) {
          const c = normalizeColor(r.color.name.trim());
          const row = byColor.get(c);
          if (row) row.stockBySize[r.size.name] = (row.stockBySize[r.size.name] || 0) + r.fabricStockKg;
        }
      });
      return Array.from(byColor.values());
    };

    const fabricStockByColor = buildFabricStockByColor(dashboardData?.stockBalance ?? [], obFabricStock);
    const totalFabricStockKg = fabricStockByColor.reduce((sum, row) => sum + Object.values(row.stockBySize).reduce((s, v) => s + v, 0), 0);

    // ── Deliveries ─────────────────────────────────────────────────────────
    const buildDeliveriesByColor = (items: any[]): DeliveryColorRow[] =>
      FABRIC_COLORS.map((color) => {
        const deliveries = items
          .filter((item) => item.color.name === color)
          .map((item) => ({ id: item.id, date: item.productionDate, size: item.size.name, chemical: item.chemical?.name ?? '', kg: item.loadSent?.fabricWeight ?? 0 }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        return { color, deliveries, total: deliveries.reduce((s, d) => s + d.kg, 0) };
      });

    const monthDeliveriesByColor = buildDeliveriesByColor(dashboardData?.loadSent.items ?? []);
    const selectedMonthDeliveryTotal = dashboardData?.loadSent.totals.fabricWeightKg || 0;

    // ── Sample — extruder ──────────────────────────────────────────────────
    const sampleExtruderByColorMap = new Map((sampleDashboardData?.extruderProduction?.byColor ?? []).map((r) => [r.color.name, r]));
    const sampleExtruderColorRows = buildSummaryRows(sampleExtruderProductionsRes?.data ?? [], sampleDashboardData?.extruderProduction?.byColor ?? [], 'extruder', currentMonthStr);
    const sampleExtruderGrandTotal = sampleDashboardData?.extruderProduction?.overall.production || 0;
    const sampleExtruderBySizeRows = (sampleDashboardData?.extruderProduction?.bySize ?? []).map((r) => ({ label: r.size.name, production: r.production }));
    const sampleExtruderByChemicalRows = (sampleDashboardData?.extruderProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, production: r.production }));

    // ── Sample — looms ─────────────────────────────────────────────────────
    const sampleLoomsByColorMap = new Map((sampleDashboardData?.loomsProduction?.byColor ?? []).map((r) => [r.color.name, r]));
    const sampleLoomsByVariantMap = new Map((sampleDashboardData?.loomsProduction?.byVariant ?? []).map((r) => [`${r.color.name}_${r.size.name}`, r]));
    const sampleLoomsColorRows = buildSummaryRows(sampleLoomsProductionsRes?.data ?? [], sampleDashboardData?.loomsProduction?.byColor ?? [], 'looms', currentMonthStr);
    const sampleLoomsGrandTotal = sampleDashboardData?.loomsProduction?.overall.production || 0;
    const sampleLoomsBySizeRows = (sampleDashboardData?.loomsProduction?.bySize ?? []).map((r) => ({ label: r.size.name, production: r.production }));
    const sampleLoomsByChemicalRows = (sampleDashboardData?.loomsProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, production: r.production }));

    // ── Sample — fabric ────────────────────────────────────────────────────
    const sampleFabricInputByColorMap = new Map<string, number>();
    (sampleDashboardData?.fabricProduction.byVariant ?? []).forEach((r) => {
      sampleFabricInputByColorMap.set(r.color.name, (sampleFabricInputByColorMap.get(r.color.name) ?? 0) + r.fabricInputKg);
    });
    const sampleFabricByVariantMap = new Map((sampleDashboardData?.fabricProduction.byVariant ?? []).map((r) => [`${r.color.name}_${r.size.name}`, r]));
    const sampleFabricColorRows = buildSummaryRows(sampleFabricCheckingRes?.data ?? [], sampleDashboardData?.fabricProduction?.byColor ?? [], 'fabric', currentMonthStr);
    const sampleFabricGrandTotal = sampleDashboardData?.fabricProduction.overall.outputKg || 0;
    const sampleFabricBySizeRows = (sampleDashboardData?.fabricProduction?.bySize ?? []).map((r) => ({ label: r.size.name, production: r.production }));
    const sampleFabricByChemicalRows = (sampleDashboardData?.fabricProduction?.byChemical ?? []).map((r) => ({ label: r.chemical.name, production: r.production }));

    // ── Sample balance maps ────────────────────────────────────────────────
    const sampleExtruderByVariantMap = new Map((sampleDashboardData?.extruderProduction?.byVariant ?? []).map((r) => [`${r.color.name}_${r.size.name}`, r]));

    const sampleYarnBalanceByColor: BalanceColorRow[] = FABRIC_COLORS.map((color) => {
      const yarnProduced = sampleExtruderByColorMap.get(color)?.production ?? 0;
      const loomsRow = sampleLoomsByColorMap.get(color);
      return { color, balance: Math.max(0, yarnProduced - (loomsRow?.production ?? 0)) };
    });
    const sampleYarnBalanceByVariant: BalanceVariantRow[] = FABRIC_COLORS.map((color) => ({
      color,
      sizes: FABRIC_STOCK_SIZES.map((size) => {
        const key = `${color}_${size}`;
        const yarnProduced = sampleExtruderByVariantMap.get(key)?.production ?? 0;
        const loomsRow = sampleLoomsByVariantMap.get(key);
        return { size, balance: Math.max(0, yarnProduced - (loomsRow?.production ?? 0)) };
      }),
    }));

    const sampleKoraBalanceByColor: BalanceColorRow[] = FABRIC_COLORS.map((color) => ({
      color,
      balance: Math.max(0, (sampleLoomsByColorMap.get(color)?.production ?? 0) - (sampleFabricInputByColorMap.get(color) ?? 0)),
    }));
    const sampleKoraBalanceByVariant: BalanceVariantRow[] = FABRIC_COLORS.map((color) => ({
      color,
      sizes: FABRIC_STOCK_SIZES.map((size) => {
        const key = `${color}_${size}`;
        return { size, balance: Math.max(0, (sampleLoomsByVariantMap.get(key)?.production ?? 0) - (sampleFabricByVariantMap.get(key)?.fabricInputKg ?? 0)) };
      }),
    }));

    // ── Sample balance rows ────────────────────────────────────────────────
    const sampleYarnBalanceMap = new Map<string, any>();
    sampleExtruderProductionsRes?.data?.forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? ''); const s = r.size?.name;
      const ch = r.chemical?.name || r.extruder?.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      sampleYarnBalanceMap.set(k, { balance: (sampleYarnBalanceMap.get(k)?.balance || 0) + (r.extruder?.yarnOutputKg || 0) });
    });
    sampleLoomsProductionsRes?.data?.forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? ''); const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      sampleYarnBalanceMap.set(k, { balance: (sampleYarnBalanceMap.get(k)?.balance || 0) - (r.loom?.yarnInputKg || 0) });
    });

    const sampleKoraBalanceMap = new Map<string, any>();
    // Use monthly dashboard summary (byVariantChemical) so detail rows match the totals.
    (sampleDashboardData?.loomsProduction?.byVariantChemical ?? []).forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? ''); const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      sampleKoraBalanceMap.set(k, { balance: (sampleKoraBalanceMap.get(k)?.balance || 0) + (r.production || 0) });
    });
    (sampleDashboardData?.fabricProduction?.byVariantChemical ?? []).forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? ''); const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      sampleKoraBalanceMap.set(k, { balance: (sampleKoraBalanceMap.get(k)?.balance || 0) - (r.fabricInputKg || 0) });
    });

    const sampleFabricStockMap = new Map<string, any>();
    (sampleDashboardData?.stockBalance ?? []).forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? ''); const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      sampleFabricStockMap.set(k, { availableFabricStockKg: (sampleFabricStockMap.get(k)?.availableFabricStockKg || 0) + (r.availableFabricStockKg || 0) });
    });

    const sampleFabricDeliveredMap = new Map<string, any>();
    (sampleDashboardData?.loadSent?.items ?? []).forEach((r: any) => {
      const c = normalizeColor(r.color?.name ?? ''); const s = r.size?.name; const ch = r.chemical?.name || 'Unknown';
      if (!c || !s) return;
      const k = toKey(c, s, ch);
      sampleFabricDeliveredMap.set(k, { kg: (sampleFabricDeliveredMap.get(k)?.kg || 0) + (r.loadSent?.fabricWeight || 0) });
    });

    const sampleYarnBalanceColorRows = buildExtruderSummaryRows(sampleYarnBalanceMap);
    const sampleKoraBalanceColorRows = buildExtruderSummaryRows(sampleKoraBalanceMap);
    const sampleFabricStockColorRows = buildExtruderSummaryRows(sampleFabricStockMap);
    const sampleFabricDeliveredColorRows = buildExtruderSummaryRows(sampleFabricDeliveredMap);

    const sampleFabricStockByColor = buildFabricStockByColor(sampleDashboardData?.stockBalance ?? [], []);
    const sampleTotalFabricStockKg = sampleFabricStockByColor.reduce((sum, row) => sum + Object.values(row.stockBySize).reduce((s, v) => s + v, 0), 0);

    const sampleDeliveriesByColor = buildDeliveriesByColor(sampleDashboardData?.loadSent.items ?? []);
    const sampleSelectedMonthDeliveryTotal = sampleDashboardData?.loadSent.totals.fabricWeightKg || 0;

    return {
      isLoading,
      rawMaterials, chemicals, invColors,
      extruderColorRows, extruderGrandTotal, extruderBySizeRows, extruderByChemicalRows,
      extruderWasteBySize, extruderWasteByChemical, extruderWasteSummaryByColor,
      loomsColorRows, loomsGrandTotal, loomsBySizeRows, loomsByChemicalRows,
      loomsWasteBySize, loomsWasteByChemical, loomsWasteByColor,
      fabricColorRows, fabricGrandTotal, fabricBySizeRows, fabricByChemicalRows,
      fabricWasteBySize, fabricWasteByChemical, fabricWasteByColor,
      yarnBalanceByColor, yarnBalanceByVariant, yarnBalanceColorRows,
      koraBalanceByColor, koraBalanceByVariant, koraBalanceColorRows,
      fabricStockColorRows, fabricStockByColor, totalFabricStockKg,
      fabricDeliveredColorRows, monthDeliveriesByColor, selectedMonthDeliveryTotal,
      looseWasteKg, lumsWasteKg,
      extruderProductionsData: extruderProductionsRes?.data ?? [],
      loomsProductionsData: loomsProductionsRes?.data ?? [],
      fabricCheckingData: fabricCheckingRes?.data ?? [],
      obWastage,
      sampleExtruderColorRows, sampleExtruderGrandTotal, sampleExtruderBySizeRows, sampleExtruderByChemicalRows,
      sampleLoomsColorRows, sampleLoomsGrandTotal, sampleLoomsBySizeRows, sampleLoomsByChemicalRows,
      sampleFabricColorRows, sampleFabricGrandTotal, sampleFabricBySizeRows, sampleFabricByChemicalRows,
      sampleYarnBalanceByColor, sampleYarnBalanceByVariant, sampleYarnBalanceColorRows,
      sampleKoraBalanceByColor, sampleKoraBalanceByVariant, sampleKoraBalanceColorRows,
      sampleFabricStockColorRows, sampleFabricStockByColor, sampleTotalFabricStockKg,
      sampleFabricDeliveredColorRows, sampleDeliveriesByColor, sampleSelectedMonthDeliveryTotal,
      sampleExtruderData: sampleExtruderProductionsRes?.data ?? [],
      sampleLoomsData: sampleLoomsProductionsRes?.data ?? [],
      sampleFabricData: sampleFabricCheckingRes?.data ?? [],
    };
  }, [
    loadingDashboard, loadingSampleDashboard,
    dashboardData, sampleDashboardData,
    extruderProductionsRes, sampleExtruderProductionsRes,
    loomsProductionsRes, sampleLoomsProductionsRes,
    fabricCheckingRes, sampleFabricCheckingRes,
    obRawMaterials, obWastage, obFabricStock,
    currentMonthStr,
  ]);
}
