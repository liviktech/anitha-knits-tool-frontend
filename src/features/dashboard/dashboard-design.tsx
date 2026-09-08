import { useState } from 'react';
import '@fontsource-variable/hanken-grotesk';
import { Download, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Loader } from '@/components/shared/loader';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMonthlyDashboard } from './dashboard-queries';
import { useAuth } from '@/features/auth/auth-context';
import { currentMonthStr as todayMonthStr } from '@/lib/date-utils';
import { useOpeningBalanceWastage, useOpeningBalanceFabricStock, useOpeningBalanceRawMaterials } from '@/features/admin-panel/opening-balance-queries';
import { useExtruderProductions } from '@/features/extruder/extruder-queries';
import { useLoomsProductions } from '@/features/looms/loom-queries';
import { useFabricCheckingRecords } from '@/features/fabric/fabric-queries';
import { DetailBreakdownCard, SectionSummaryCard, RawMaterialsSection, RawMaterialCard, ExtruderSummaryCard } from './card';
import { DashboardReportModal } from './dashboard-report-modal';
import { DashboardWastageReportModal } from './dashboard-wastage-report-modal';
import { Button } from '@/components/ui/button';

function deliveryColorClass(color: string): string {
  const normalizedColor = color.toLowerCase();
  if (normalizedColor === 'blue') return 'text-[#0088CC]';
  if (normalizedColor === 'green') return 'text-[#5BA300]';
  return 'text-gray-700';
}

// Per-card accent (background tint + border) for the Fabric Stock color cards —
// mirrors WastageCard's per-item accent-color pattern below.
function fabricStockCardTheme(color: string): { bg: string; border: string; swatch: string } {
  const normalizedColor = color.toLowerCase();
  if (normalizedColor === 'blue') return { bg: 'bg-[#0088CC]/5', border: 'border-[#B8DCEF]', swatch: 'bg-[#0088CC]' };
  if (normalizedColor === 'green') return { bg: 'bg-[#5BA300]/5', border: 'border-[#D2E6B8]', swatch: 'bg-[#5BA300]' };
  return { bg: 'bg-gray-100/60', border: 'border-gray-300', swatch: 'bg-gray-500' };
}

// Converts one buildExtruderSummaryRows() color row into DetailBreakdownCard's `table` shape
// (chemical rows x size columns) — used by Yarn Balance / Kora Balance / Fabric Stock /
// Fabric Delivered so a color that used more than one chemical shows each one separately,
// instead of a single blended-by-size total.
function toChemicalTable(colorRow: { chemicals: { chemical: string; sizes: { size: string; production: number }[] }[] }) {
  const columns = Array.from(new Set(colorRow.chemicals.flatMap((c) => c.sizes.map((s) => s.size)))).sort((a, b) => a.localeCompare(b));
  const rows = colorRow.chemicals.map((c) => ({
    label: c.chemical,
    values: Object.fromEntries(c.sizes.map((s) => [s.size, s.production])),
  }));
  return { columns, rows };
}

const FABRIC_STOCK_SIZES = ['150cm', '160cm', '170cm', '180cm', '190cm'] as const;
const FABRIC_COLORS = ['Blue', 'Green', 'White'] as const;

export function DashboardDesign() {
  const { user } = useAuth();
  const companyName = user?.kind === 'company-user' ? user.company.name : 'LK Knits';
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'production' | 'wastage' | 'sample'>('production');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const currentMonthStr = format(filterDate, 'yyyy-MM');

  const handleRefresh = () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    setTimeout(() => {
      setIsManualRefreshing(false);
    }, 2000);
  };

  const { dashboardData, isLoading: loadingDashboard } = useMonthlyDashboard(currentMonthStr, currentMonthStr);

  // Chemical used per color, for the Extruder Production card's middle column —
  // the monthly dashboard aggregation has no per-color chemical field, so this
  // is derived from the raw extruder production records instead. Fetched once per
  // type (PRODUCTION vs SAMPLE) so the two tabs' chemical breakdowns never mix.
  const { data: extruderProductionsRes } = useExtruderProductions('?limit=100&type=PRODUCTION');
  const { data: sampleExtruderProductionsRes } = useExtruderProductions('?limit=100&type=SAMPLE');
  const { data: loomsProductionsRes } = useLoomsProductions('?limit=100&type=PRODUCTION');
  const { data: sampleLoomsProductionsRes } = useLoomsProductions('?limit=100&type=SAMPLE');
  const { data: fabricCheckingRes } = useFabricCheckingRecords('?limit=100&type=PRODUCTION');
  const { data: sampleFabricCheckingRes } = useFabricCheckingRecords('?limit=100&type=SAMPLE');




  const buildSummaryRows = (records: any[], byColorSummary: any[], stage: 'extruder' | 'looms' | 'fabric') => {
    return FABRIC_COLORS.map(color => {
      const stageRecords = records.filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase() && r.productionDate?.startsWith(currentMonthStr));

      const uniqueSizes = new Set<string>();
      const chemMap = new Map<string, { total: number, sizes: Map<string, number> }>();

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

      const chemicals = Array.from(chemMap.entries()).map(([chemical, entry]) => ({
        chemical,
        production: entry.total,
        sizes: Array.from(entry.sizes.entries()).map(([size, production]) => ({ size, production })).sort((a, b) => a.size.localeCompare(b.size))
      })).sort((a, b) => a.chemical.localeCompare(b.chemical));

      const summaryRecord = byColorSummary.find((s: any) => s.color.name === color);
      const backendTotal = summaryRecord?.production ?? 0;

      return {
        color,
        production: backendTotal,
        uniqueSizeCount: uniqueSizes.size,
        chemicals
      };
    });
  };

  const buildWastageChemicalRows = (records: any[], stage: 'extruder' | 'looms' | 'fabric') => {
    return FABRIC_COLORS.map(color => {
      const stageRecords = records.filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase() && r.productionDate?.startsWith(currentMonthStr));

      const chemMap = new Map<string, { lums: Map<string, number>, yarnWaste: Map<string, number>, loomsWaste: Map<string, number>, fabricWaste: Map<string, number>, bitWaste: Map<string, number> }>();

      stageRecords.forEach((r: any) => {
        const chemical = r.chemical?.name || r.extruder?.chemical?.name || 'Unknown';
        const size = r.size?.name;
        if (!size) return;

        if (!chemMap.has(chemical)) {
          chemMap.set(chemical, { lums: new Map(), yarnWaste: new Map(), loomsWaste: new Map(), fabricWaste: new Map(), bitWaste: new Map() });
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
        } else if (stage === 'fabric') {
          const fwKg = r.wastages?.find((w: any) => w.wastageType?.code === 'FW')?.quantityKg ?? 0;
          const bwKg = r.wastages?.find((w: any) => w.wastageType?.code === 'BW')?.quantityKg ?? 0;
          entry.fabricWaste.set(size, (entry.fabricWaste.get(size) ?? 0) + fwKg);
          entry.bitWaste.set(size, (entry.bitWaste.get(size) ?? 0) + bwKg);
        }
      });

      const chemicals = Array.from(chemMap.entries()).map(([chemical, entry]) => {
        const sizes = FABRIC_STOCK_SIZES.map(size => ({
          size,
          lums: entry.lums.get(size) ?? 0,
          yarnWaste: entry.yarnWaste.get(size) ?? 0,
          loomsWaste: entry.loomsWaste.get(size) ?? 0,
          fabricWaste: entry.fabricWaste.get(size) ?? 0,
          bitWaste: entry.bitWaste.get(size) ?? 0,
        }));
        return { chemical, sizes };
      }).sort((a, b) => a.chemical.localeCompare(b.chemical));

      return {
        color,
        chemicals
      };
    });
  };

  const { data: obRawMaterialsRes } = useOpeningBalanceRawMaterials('?limit=100');
  const obRawMaterials = obRawMaterialsRes?.data || [];

  const getObInvTotals = (type: string) => {
    const relevantObs = obRawMaterials.filter(r => r.type === type);
    const weight = relevantObs.reduce((sum, r) => sum + r.weightKg, 0);
    const itemsMap = new Map<string, { weight: number; bags: number }>();
    relevantObs.forEach(r => {
      const entry = itemsMap.get(r.name) || { weight: 0, bags: 0 };
      entry.weight += r.weightKg;
      entry.bags += r.bagCount || 0;
      itemsMap.set(r.name, entry);
    });
    return { weight, itemsMap };
  };

  const obHdpe = getObInvTotals('HDPE');
  const obChemical = getObInvTotals('CHEMICAL');
  const obColor = getObInvTotals('COLOR');

  const combineInvItems = (baseItems: { name: string, weight: number, bags: number }[], obItemsMap: Map<string, { weight: number; bags: number }>) => {
    const combinedMap = new Map(obItemsMap);
    baseItems.forEach(item => {
      const entry = combinedMap.get(item.name) || { weight: 0, bags: 0 };
      combinedMap.set(item.name, { weight: entry.weight + item.weight, bags: entry.bags + item.bags });
    });
    return Array.from(combinedMap.entries()).map(([name, v]) => ({ name, weight: v.weight, bags: v.bags }));
  };

  // Use backend-provided monthly inventory aggregations, adding Opening Balance
  const rawMaterials = {
    weight: (dashboardData?.inventory?.HDPE?.totalWeightKg || 0) + obHdpe.weight,
    items: combineInvItems(
      dashboardData?.inventory?.HDPE?.items?.map(item => ({ name: item.name, weight: item.weightKg, bags: item.bagCount || 0 })) || [],
      obHdpe.itemsMap
    ),
  };
  const chemicals = {
    weight: (dashboardData?.inventory?.CHEMICAL?.totalWeightKg || 0) + obChemical.weight,
    items: combineInvItems(
      dashboardData?.inventory?.CHEMICAL?.items?.map(item => ({ name: item.name, weight: item.weightKg, bags: item.bagCount || 0 })) || [],
      obChemical.itemsMap
    ),
  };
  const invColors = {
    weight: (dashboardData?.inventory?.COLOR?.totalWeightKg || 0) + obColor.weight,
    items: combineInvItems(
      dashboardData?.inventory?.COLOR?.items?.map(item => ({ name: item.name, weight: item.weightKg, bags: item.bagCount || 0 })) || [],
      obColor.itemsMap
    ),
  };

  const isLoading = loadingDashboard;

  const { data: obWastageRes } = useOpeningBalanceWastage('?limit=100');
  const obWastage = obWastageRes?.data || [];

  const { data: obFabricStockRes } = useOpeningBalanceFabricStock('?limit=100');
  const obFabricStock = obFabricStockRes?.data || [];
  const buildExtruderSummaryRows = (dataMap: Map<string, any>) => {
    return FABRIC_COLORS.map(color => {
      let colorTotal = 0;
      const chemMap = new Map<string, { total: number, sizes: Map<string, number> }>();
      const uniqueSizes = new Set<string>();

      dataMap.forEach((entry, key) => {
        const parts = key.split('_');
        if (parts[0] !== color && parts[0] !== color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()) return;
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

      const chemicals = Array.from(chemMap.entries()).map(([chem, entry]) => ({
        chemical: chem,
        production: entry.total,
        sizes: Array.from(entry.sizes.entries()).map(([s, p]) => ({ size: s, production: p })).sort((a, b) => a.size.localeCompare(b.size))
      })).sort((a, b) => a.chemical.localeCompare(b.chemical));

      return {
        color,
        production: colorTotal,
        uniqueSizeCount: uniqueSizes.size,
        chemicals
      };
    });
  };

  // Build Balance Rows Map
  const yarnBalanceMap = new Map<string, any>();
  const koraBalanceMap = new Map<string, any>();
  const fabricStockMap = new Map<string, any>();
  const fabricDeliveredMap = new Map<string, any>();

  // Process Yarn Balance
  extruderProductionsRes?.data?.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || r.extruder?.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    yarnBalanceMap.set(key, { balance: (yarnBalanceMap.get(key)?.balance || 0) + (r.extruder?.yarnOutputKg || 0) });
  });
  loomsProductionsRes?.data?.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    yarnBalanceMap.set(key, { balance: (yarnBalanceMap.get(key)?.balance || 0) - ((r.loom?.fabricOutputKg || 0) + (r.wastage?.totalWasteKg || 0)) });
  });

  // Process Kora Balance
  obFabricStock.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    koraBalanceMap.set(key, { balance: (koraBalanceMap.get(key)?.balance || 0) + (r.koraBalanceKg || 0) });
  });
  loomsProductionsRes?.data?.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    koraBalanceMap.set(key, { balance: (koraBalanceMap.get(key)?.balance || 0) + (r.loom?.fabricOutputKg || 0) });
  });
  fabricCheckingRes?.data?.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    koraBalanceMap.set(key, { balance: (koraBalanceMap.get(key)?.balance || 0) - (r.fabricCheck?.outputKg || 0) });
  });

  // Process Fabric Stock
  (dashboardData?.stockBalance || []).forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    fabricStockMap.set(key, { availableFabricStockKg: (fabricStockMap.get(key)?.availableFabricStockKg || 0) + (r.availableFabricStockKg || 0) });
  });

  // Process Fabric Delivered
  (dashboardData?.loadSent?.items || []).forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    fabricDeliveredMap.set(key, { kg: (fabricDeliveredMap.get(key)?.kg || 0) + (r.loadSent?.fabricWeight || 0) });
  });

  const yarnBalanceColorRows = buildExtruderSummaryRows(yarnBalanceMap);
  const koraBalanceColorRows = buildExtruderSummaryRows(koraBalanceMap);
  const fabricStockColorRows = buildExtruderSummaryRows(fabricStockMap);
  const fabricDeliveredColorRows = buildExtruderSummaryRows(fabricDeliveredMap);



  const obWastageByColor = new Map<string, { lums: number, loose: number, looms: number, fw: number, bw: number }>();

  obWastage.forEach(r => {
    const rawColor = r.color?.name || 'Unknown';
    const color = rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase();
    if (!obWastageByColor.has(color)) {
      obWastageByColor.set(color, { lums: 0, loose: 0, looms: 0, fw: 0, bw: 0 });
    }
    const current = obWastageByColor.get(color)!;
    current.lums += r.extruderLumpsKg || 0;
    current.loose += r.extruderLoomsWasteKg || 0;
    current.looms += r.loomsYarnWasteKg || 0;
    current.fw += r.fabricWasteKg || 0;
    current.bw += r.fabricBitwasteKg || 0;
  });

  let totalObLums = 0;
  let totalObLoose = 0;
  obWastageByColor.forEach(v => {
    totalObLums += v.lums;
    totalObLoose += v.loose;
  });

  const looseWasteKg = (dashboardData?.wastage.byType.find(w => w.code === 'YARN_WASTE')?.quantityKg || 0) + totalObLoose;
  const lumsWasteKg = (dashboardData?.wastage.byType.find(w => w.code === 'LUMPS')?.quantityKg || 0) + totalObLums;
  // Statically listed by color (like fabricWasteByColor below) so every card always shows
  // all colors with "--" for anything not yet recorded, instead of an empty-state message.
  const extruderByColorMap = new Map((dashboardData?.extruderProduction?.byColor || []).map(r => [r.color.name, r]));

  const extruderByVariantMap = new Map((dashboardData?.extruderProduction?.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
  const extruderWasteByVariant = FABRIC_COLORS.map(color => {
    const sizes = FABRIC_STOCK_SIZES.map(size => {
      const variantKey = `${color}_${size}`;
      const r = extruderByVariantMap.get(variantKey);
      return { size, lums: r?.lumsKg ?? 0, yarnWaste: r?.yarnWasteKg ?? 0 };
    });
    return { color, sizes };
  });

  // Per-color totals for the Wastage Report — extruderWasteByVariant only carries a
  // per-size breakdown now, so sum across sizes here rather than duplicating that fetch.
  const extruderWasteSummaryByColor = extruderWasteByVariant.map((row) => ({
    color: row.color,
    lums: row.sizes.reduce((sum, s) => sum + s.lums, 0),
    yarnWaste: row.sizes.reduce((sum, s) => sum + s.yarnWaste, 0),
  }));

  const extruderColorRows = buildSummaryRows(extruderProductionsRes?.data ?? [], dashboardData?.extruderProduction?.byColor || [], 'extruder');
  const extruderGrandTotal = dashboardData?.extruderProduction?.overall.production || 0;

  // Size-wise / chemical-wise breakdowns for the Production Summary & Wastage Summary
  // reports — same bySize/byChemical fields the Production Details report already uses.
  const extruderBySizeRows = (dashboardData?.extruderProduction?.bySize || []).map(r => ({ label: r.size.name, production: r.production }));
  const extruderByChemicalRows = (dashboardData?.extruderProduction?.byChemical || []).map(r => ({ label: r.chemical.name, production: r.production }));
  const extruderWasteBySize = (dashboardData?.extruderProduction?.bySize || []).map(r => ({ label: r.size.name, lums: r.lumsKg, yarnWaste: r.yarnWasteKg }));
  const extruderWasteByChemical = (dashboardData?.extruderProduction?.byChemical || []).map(r => ({ label: r.chemical.name, lums: r.lumsKg, yarnWaste: r.yarnWasteKg }));

  const loomsByColorMap = new Map((dashboardData?.loomsProduction?.byColor || []).map(r => [r.color.name, r]));
  const loomsWasteByColor = FABRIC_COLORS.map(color => {
    const r = loomsByColorMap.get(color);
    const ob = obWastageByColor.get(color) || { looms: 0 };
    return { color, loomsWaste: (r?.waste ?? 0) + ob.looms };
  });

  const loomsByVariantMap = new Map((dashboardData?.loomsProduction?.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));

  const loomsColorRows = buildSummaryRows(loomsProductionsRes?.data ?? [], dashboardData?.loomsProduction?.byColor || [], 'looms');
  const loomsGrandTotal = dashboardData?.loomsProduction?.overall.production || 0;

  const loomsBySizeRows = (dashboardData?.loomsProduction?.bySize || []).map(r => ({ label: r.size.name, production: r.production }));
  const loomsByChemicalRows = (dashboardData?.loomsProduction?.byChemical || []).map(r => ({ label: r.chemical.name, production: r.production }));
  const loomsWasteBySize = (dashboardData?.loomsProduction?.bySize || []).map(r => ({ label: r.size.name, loomsWaste: r.waste }));
  const loomsWasteByChemical = (dashboardData?.loomsProduction?.byChemical || []).map(r => ({ label: r.chemical.name, loomsWaste: r.waste }));

  const fabricByColorMap = new Map((dashboardData?.fabricProduction.byColor || []).map(r => [r.color.name, r]));
  // FabricProductionColorSummary (byColor) has no fabricInputKg of its own — only byVariant
  // does — so it's summed here across every size for the color, for the Kora Balance calc below.
  const fabricInputByColorMap = new Map<string, number>();
  (dashboardData?.fabricProduction.byVariant || []).forEach(r => {
    fabricInputByColorMap.set(r.color.name, (fabricInputByColorMap.get(r.color.name) ?? 0) + r.fabricInputKg);
  });
  const fabricWasteByColor = FABRIC_COLORS.map(color => {
    const r = fabricByColorMap.get(color);
    const ob = obWastageByColor.get(color) || { fw: 0, bw: 0 };
    return { color, fabricWaste: (r?.fwWasteKg ?? 0) + ob.fw, bitWaste: (r?.bwWasteKg ?? 0) + ob.bw };
  });

  const fabricByVariantMap = new Map((dashboardData?.fabricProduction.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));

  const fabricColorRows = buildSummaryRows(fabricCheckingRes?.data ?? [], dashboardData?.fabricProduction?.byColor || [], 'fabric');
  const fabricGrandTotal = dashboardData?.fabricProduction.overall.outputKg || 0;

  const fabricBySizeRows = (dashboardData?.fabricProduction?.bySize || []).map(r => ({ label: r.size.name, production: r.production }));
  const fabricByChemicalRows = (dashboardData?.fabricProduction?.byChemical || []).map(r => ({ label: r.chemical.name, production: r.production }));
  const fabricWasteBySize = (dashboardData?.fabricProduction?.bySize || []).map(r => ({ label: r.size.name, fabricWaste: r.fwWasteKg, bitWaste: r.bwWasteKg }));
  const fabricWasteByChemical = (dashboardData?.fabricProduction?.byChemical || []).map(r => ({ label: r.chemical.name, fabricWaste: r.fwWasteKg, bitWaste: r.bwWasteKg }));

  // Build fabricStockByColor for the report modal from fabricStockColorRows
  // (which already correctly computes non-zero available stock per color+size+chemical).
  // Flatten the chemical→size breakdown into a color→stockBySize map, summing across chemicals.
  const fabricStockByColor = fabricStockColorRows.map((row) => {
    const stockBySize: Record<string, number> = {};
    row.chemicals.forEach((chem) => {
      chem.sizes.forEach(({ size, production }) => {
        stockBySize[size] = (stockBySize[size] || 0) + production;
      });
    });
    return { color: row.color, colorClass: deliveryColorClass(row.color), stockBySize };
  });
  const totalFabricStockKg = fabricStockByColor.reduce(
    (sum, row) => sum + Object.values(row.stockBySize).reduce((s, v) => s + v, 0),
    0,
  );

  // Yarn Balance per color = Extruder yarn output − yarn consumed by Looms (fabric output + looms waste)
  const yarnBalanceByColor = FABRIC_COLORS.map(color => {
    const extruderRow = extruderByColorMap.get(color);
    const loomsRow = loomsByColorMap.get(color);
    const yarnProduced = extruderRow?.production ?? 0;
    const yarnConsumed = (loomsRow?.production ?? 0) + (loomsRow?.waste ?? 0);
    return { color, balance: Math.max(0, yarnProduced - yarnConsumed) };
  });

  // Kora Balance per color = OB kora + Looms fabric output − Fabric Checking fabric input
  const obKoraByColor = new Map<string, number>();
  obFabricStock.forEach(r => {
    if (r.color?.name) {
      const colorName = r.color.name.trim();
      const normalized = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase();
      obKoraByColor.set(normalized, (obKoraByColor.get(normalized) ?? 0) + r.koraBalanceKg);
    }
  });
  const koraBalanceByColor = FABRIC_COLORS.map(color => {
    const obKora = obKoraByColor.get(color) ?? 0;
    const loomsOutput = loomsByColorMap.get(color)?.production ?? 0;
    const fabricInput = fabricInputByColorMap.get(color) ?? 0;
    return { color, balance: Math.max(0, obKora + loomsOutput - fabricInput) };
  });

  // Same formulas as yarnBalanceByColor/koraBalanceByColor above, broken down per size
  // for the expandable detail panel.
  const yarnBalanceByVariant = FABRIC_COLORS.map(color => {
    const sizes = FABRIC_STOCK_SIZES.map(size => {
      const key = `${color}_${size}`;
      const yarnProduced = extruderByVariantMap.get(key)?.production ?? 0;
      const loomsRow = loomsByVariantMap.get(key);
      const yarnConsumed = (loomsRow?.production ?? 0) + (loomsRow?.waste ?? 0);
      return { size, balance: Math.max(0, yarnProduced - yarnConsumed) };
    });
    return { color, sizes };
  });

  const obKoraByVariant = new Map<string, number>();
  obFabricStock.forEach(r => {
    if (r.color?.name && r.size?.name) {
      const colorName = r.color.name.trim();
      const normalized = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase();
      const key = `${normalized}_${r.size.name}`;
      obKoraByVariant.set(key, (obKoraByVariant.get(key) ?? 0) + r.koraBalanceKg);
    }
  });
  const koraBalanceByVariant = FABRIC_COLORS.map(color => {
    const sizes = FABRIC_STOCK_SIZES.map(size => {
      const key = `${color}_${size}`;
      const obKora = obKoraByVariant.get(key) ?? 0;
      const loomsOutput = loomsByVariantMap.get(key)?.production ?? 0;
      const fabricInput = fabricByVariantMap.get(key)?.fabricInputKg ?? 0;
      return { size, balance: Math.max(0, obKora + loomsOutput - fabricInput) };
    });
    return { color, sizes };
  });

  // rawMaterials, chemicals, and invColors are now defined above using dashboardData.inventory

  const monthDeliveriesByColor = FABRIC_COLORS.map(color => {
    const deliveries = (dashboardData?.loadSent.items || [])
      .filter(item => item.color.name === color)
      .map(item => ({
        id: item.id,
        date: item.productionDate,
        size: item.size.name,
        chemical: item.chemical?.name ?? '',
        kg: item.loadSent?.fabricWeight ?? 0,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return { color, deliveries, total: deliveries.reduce((sum, d) => sum + d.kg, 0) };
  });
  const selectedMonthDeliveryTotal = dashboardData?.loadSent.totals.fabricWeightKg || 0;
  const loadingLoadSent = isLoading;

  // ── Sample Production Data ──────────────────────────────────────────────
  // Same /dashboard endpoint as the Production Summary tab, just called with type=SAMPLE
  // (backend now filters every underlying query by production_records.type), so all the
  // shapes below mirror the PRODUCTION versions above exactly — just without an Opening
  // Balance term, since OB is a real-inventory starting value that doesn't apply to samples.
  const { dashboardData: sampleDashboardData, isLoading: loadingSampleDashboard } = useMonthlyDashboard(currentMonthStr, currentMonthStr, 'SAMPLE');

  const sampleExtruderByColorMap = new Map((sampleDashboardData?.extruderProduction?.byColor || []).map(r => [r.color.name, r]));
  const sampleExtruderColorRows = buildSummaryRows(sampleExtruderProductionsRes?.data ?? [], sampleDashboardData?.extruderProduction?.byColor || [], 'extruder');
  const sampleExtruderGrandTotal = sampleDashboardData?.extruderProduction?.overall.production || 0;
  const sampleExtruderBySizeRows = (sampleDashboardData?.extruderProduction?.bySize || []).map(r => ({ label: r.size.name, production: r.production }));
  const sampleExtruderByChemicalRows = (sampleDashboardData?.extruderProduction?.byChemical || []).map(r => ({ label: r.chemical.name, production: r.production }));

  const sampleLoomsByColorMap = new Map((sampleDashboardData?.loomsProduction?.byColor || []).map(r => [r.color.name, r]));
  const sampleLoomsColorRows = buildSummaryRows(sampleLoomsProductionsRes?.data ?? [], sampleDashboardData?.loomsProduction?.byColor || [], 'looms');
  const sampleLoomsGrandTotal = sampleDashboardData?.loomsProduction?.overall.production || 0;
  const sampleLoomsBySizeRows = (sampleDashboardData?.loomsProduction?.bySize || []).map(r => ({ label: r.size.name, production: r.production }));
  const sampleLoomsByChemicalRows = (sampleDashboardData?.loomsProduction?.byChemical || []).map(r => ({ label: r.chemical.name, production: r.production }));

  const sampleFabricInputByColorMap = new Map<string, number>();
  (sampleDashboardData?.fabricProduction.byVariant || []).forEach(r => {
    sampleFabricInputByColorMap.set(r.color.name, (sampleFabricInputByColorMap.get(r.color.name) ?? 0) + r.fabricInputKg);
  });
  const sampleFabricColorRows = buildSummaryRows(sampleFabricCheckingRes?.data ?? [], sampleDashboardData?.fabricProduction?.byColor || [], 'fabric');
  const sampleFabricGrandTotal = sampleDashboardData?.fabricProduction.overall.outputKg || 0;
  const sampleFabricBySizeRows = (sampleDashboardData?.fabricProduction?.bySize || []).map(r => ({ label: r.size.name, production: r.production }));
  const sampleFabricByChemicalRows = (sampleDashboardData?.fabricProduction?.byChemical || []).map(r => ({ label: r.chemical.name, production: r.production }));

  // Yarn Balance = Extruder yarn output − yarn consumed by Looms — same formula as Production,
  // no OB term (Yarn Balance never uses Opening Balance, for either tab).
  const sampleExtruderByVariantMap = new Map((sampleDashboardData?.extruderProduction?.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
  const sampleLoomsByVariantMap = new Map((sampleDashboardData?.loomsProduction?.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
  const sampleYarnBalanceByColor = FABRIC_COLORS.map(color => {
    const yarnProduced = sampleExtruderByColorMap.get(color)?.production ?? 0;
    const loomsRow = sampleLoomsByColorMap.get(color);
    const yarnConsumed = (loomsRow?.production ?? 0) + (loomsRow?.waste ?? 0);
    return { color, balance: Math.max(0, yarnProduced - yarnConsumed) };
  });
  const sampleYarnBalanceByVariant = FABRIC_COLORS.map(color => {
    const sizes = FABRIC_STOCK_SIZES.map(size => {
      const key = `${color}_${size}`;
      const yarnProduced = sampleExtruderByVariantMap.get(key)?.production ?? 0;
      const loomsRow = sampleLoomsByVariantMap.get(key);
      const yarnConsumed = (loomsRow?.production ?? 0) + (loomsRow?.waste ?? 0);
      return { size, balance: Math.max(0, yarnProduced - yarnConsumed) };
    });
    return { color, sizes };
  });

  // Kora Balance = Looms fabric output − Fabric Checking fabric input — same formula as
  // Production minus the Opening Balance term (samples carry no OB).
  const sampleFabricByVariantMap = new Map((sampleDashboardData?.fabricProduction.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
  const sampleKoraBalanceByColor = FABRIC_COLORS.map(color => {
    const loomsOutput = sampleLoomsByColorMap.get(color)?.production ?? 0;
    const fabricInput = sampleFabricInputByColorMap.get(color) ?? 0;
    return { color, balance: Math.max(0, loomsOutput - fabricInput) };
  });
  const sampleKoraBalanceByVariant = FABRIC_COLORS.map(color => {
    const sizes = FABRIC_STOCK_SIZES.map(size => {
      const key = `${color}_${size}`;
      const loomsOutput = sampleLoomsByVariantMap.get(key)?.production ?? 0;
      const fabricInput = sampleFabricByVariantMap.get(key)?.fabricInputKg ?? 0;
      return { size, balance: Math.max(0, loomsOutput - fabricInput) };
    });
    return { color, sizes };
  });

  // Fabric Stock — same derivation as Production (backend stockBalance, all-time cumulative
  // Fabric Checking output minus Load Sent), no OB term.
  const sampleFabricStockByColor = (() => {
    const byColor = new Map<string, { color: string; colorClass: string; stockBySize: Record<string, number> }>();
    const getRow = (color: string) => {
      const existing = byColor.get(color);
      if (existing) return existing;
      const row = { color, colorClass: deliveryColorClass(color), stockBySize: {} as Record<string, number> };
      byColor.set(color, row);
      return row;
    };
    FABRIC_COLORS.forEach((color) => getRow(color));
    (sampleDashboardData?.stockBalance || []).forEach(r => {
      const row = getRow(r.color.name);
      row.stockBySize[r.size.name] = (row.stockBySize[r.size.name] || 0) + r.availableFabricStockKg;
    });
    return Array.from(byColor.values());
  })();
  const sampleTotalFabricStockKg = sampleFabricStockByColor.reduce(
    (sum, row) => sum + Object.values(row.stockBySize).reduce((s, v) => s + v, 0),
    0,
  );

  // Fabric Delivered — same shape as monthDeliveriesByColor above, sourced from the SAMPLE dashboard data.
  const sampleDeliveriesByColor = FABRIC_COLORS.map(color => {
    const deliveries = (sampleDashboardData?.loadSent.items || [])
      .filter(item => item.color.name === color)
      .map(item => ({
        id: item.id,
        date: item.productionDate,
        size: item.size.name,
        chemical: item.chemical?.name ?? '',
        kg: item.loadSent?.fabricWeight ?? 0,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return { color, deliveries, total: deliveries.reduce((sum, d) => sum + d.kg, 0) };
  });
  const sampleSelectedMonthDeliveryTotal = sampleDashboardData?.loadSent.totals.fabricWeightKg || 0;

  // Chemical(rows) x size(columns) breakdown for the Sample Production tab's Yarn Balance /
  // Kora Balance / Fabric Stock / Fabric Delivered — same shape and same map-building approach
  // as the Production Summary tab's yarnBalanceMap/koraBalanceMap/fabricStockMap/fabricDeliveredMap
  // above, just sourced from type=SAMPLE records and with no Opening Balance term (samples carry
  // no OB, same as the plain balance figures elsewhere in this tab).
  const sampleYarnBalanceMap = new Map<string, any>();
  const sampleKoraBalanceMap = new Map<string, any>();
  const sampleFabricStockMap = new Map<string, any>();
  const sampleFabricDeliveredMap = new Map<string, any>();

  sampleExtruderProductionsRes?.data?.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || r.extruder?.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    sampleYarnBalanceMap.set(key, { balance: (sampleYarnBalanceMap.get(key)?.balance || 0) + (r.extruder?.yarnOutputKg || 0) });
  });
  sampleLoomsProductionsRes?.data?.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    sampleYarnBalanceMap.set(key, { balance: (sampleYarnBalanceMap.get(key)?.balance || 0) - ((r.loom?.fabricOutputKg || 0) + (r.wastage?.totalWasteKg || 0)) });
  });

  sampleLoomsProductionsRes?.data?.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    sampleKoraBalanceMap.set(key, { balance: (sampleKoraBalanceMap.get(key)?.balance || 0) + (r.loom?.fabricOutputKg || 0) });
  });
  sampleFabricCheckingRes?.data?.forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    sampleKoraBalanceMap.set(key, { balance: (sampleKoraBalanceMap.get(key)?.balance || 0) - (r.fabricCheck?.outputKg || 0) });
  });

  (sampleDashboardData?.stockBalance || []).forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    sampleFabricStockMap.set(key, { availableFabricStockKg: (sampleFabricStockMap.get(key)?.availableFabricStockKg || 0) + (r.availableFabricStockKg || 0) });
  });

  (sampleDashboardData?.loadSent?.items || []).forEach((r: any) => {
    const c = r.color?.name?.charAt(0).toUpperCase() + r.color?.name?.slice(1).toLowerCase();
    const s = r.size?.name;
    const ch = r.chemical?.name || 'Unknown';
    if (!c || !s) return;
    const key = `${c}_${s}_${ch}`;
    sampleFabricDeliveredMap.set(key, { kg: (sampleFabricDeliveredMap.get(key)?.kg || 0) + (r.loadSent?.fabricWeight || 0) });
  });

  const sampleYarnBalanceColorRows = buildExtruderSummaryRows(sampleYarnBalanceMap);
  const sampleKoraBalanceColorRows = buildExtruderSummaryRows(sampleKoraBalanceMap);
  const sampleFabricStockColorRows = buildExtruderSummaryRows(sampleFabricStockMap);
  const sampleFabricDeliveredColorRows = buildExtruderSummaryRows(sampleFabricDeliveredMap);

  // Production Summary / Fabric Stock / Fabric Delivered — shared verbatim between the
  // "Production Summary" and "Sample Production" tabs at the user's request.
  const renderProductionSummary = () => (
    <>
      {/* Production Summary (Extruder / Looms / Fabric) */}
      <div className="font-hanken w-full bg-white rounded-2xl border border-gray-400 shadow-sm p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <ExtruderSummaryCard
            title="Extruder Production"
            total={extruderGrandTotal}
            rows={extruderColorRows}
            theme={{ cardBg: 'bg-[#00897B]/5', cardBorder: 'border-[#B8DCD0]', titleColor: 'text-[#0B5566]', totalColor: 'text-[#0B5566]' }}
          />

          <ExtruderSummaryCard
            title="Looms Production"
            total={loomsGrandTotal}
            rows={loomsColorRows}
            theme={{ cardBg: 'bg-[#004D40]/5', cardBorder: 'border-[#B8D8D5]', titleColor: 'text-[#7A6A00]', totalColor: 'text-[#7A6A00]' }}
          />

          <ExtruderSummaryCard
            title="Fabric Checking"
            total={fabricGrandTotal}
            rows={fabricColorRows}
            theme={{ cardBg: 'bg-[#004D40]/5', cardBorder: 'border-[#C5D8C2]', titleColor: 'text-[#2F6B2F]', totalColor: 'text-[#2F6B2F]' }}
          />
        </div>
      </div>

      {/* Yarn Balance (own horizontal section, styled like Fabric Stock below) */}
      <div className="w-full">
        <SectionSummaryCard
          title="Yarn Balance"
          total={yarnBalanceByColor.reduce((sum, row) => sum + row.balance, 0)}
          totalColorClassName="text-[#0B5566]"
        >
          {yarnBalanceByVariant.map((row) => {
            const theme = fabricStockCardTheme(row.color);
            const colorTotal = yarnBalanceByColor.find((r) => r.color === row.color)?.balance ?? 0;
            const colorRow = yarnBalanceColorRows.find((r) => r.color === row.color);
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={colorTotal}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={[]}
                table={colorRow ? toChemicalTable(colorRow) : { columns: [], rows: [] }}
                emptyMessage="No yarn balance recorded yet."
              />
            );
          })}
        </SectionSummaryCard>
      </div>

      {/* Kora Balance (own horizontal section, below Yarn Balance) */}
      <div className="w-full">
        <SectionSummaryCard
          title="Kora Balance"
          total={koraBalanceByColor.reduce((sum, row) => sum + row.balance, 0)}
          totalColorClassName="text-[#7A6A00]"
        >
          {koraBalanceByVariant.map((row) => {
            const theme = fabricStockCardTheme(row.color);
            const colorTotal = koraBalanceByColor.find((r) => r.color === row.color)?.balance ?? 0;
            const colorRow = koraBalanceColorRows.find((r) => r.color === row.color);
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={colorTotal}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={[]}
                table={colorRow ? toChemicalTable(colorRow) : { columns: [], rows: [] }}
                emptyMessage="No kora balance recorded yet."
              />
            );
          })}
        </SectionSummaryCard>
      </div>

      {/* Fabric Stock (own horizontal section) */}
      <div className="w-full">
        <FabricStockCard
          rows={fabricStockColorRows}
          total={totalFabricStockKg}
        />
      </div>


      {/* Fabric Delivered (own horizontal section, below Fabric Stock) */}
      <div className="w-full">
        <SectionSummaryCard
          title="Fabric Delivered"
          total={selectedMonthDeliveryTotal}
          isLoading={loadingLoadSent}
          loadingMessage="Loading delivered records..."
        >
          {monthDeliveriesByColor.map((row) => {
            const theme = fabricStockCardTheme(row.color);
            const colorRow = fabricDeliveredColorRows.find((r) => r.color === row.color);
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={row.total}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={[]}
                table={colorRow ? toChemicalTable(colorRow) : { columns: [], rows: [] }}
                emptyMessage="No deliveries recorded yet."
              />
            );
          })}
        </SectionSummaryCard>
      </div>
    </>
  );

  // Sample Production tab — identical card tree/styling to renderProductionSummary above,
  // fed entirely by type=SAMPLE data (sampleDashboardData) so sample/trial entries never mix
  // into the real Production Details totals.
  const renderSampleProduction = () => (
    <>
      {/* Production Summary (Extruder / Looms / Fabric) */}
      <div className="font-hanken bg-white rounded-2xl border border-gray-400 shadow-sm p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <ExtruderSummaryCard
            title="Extruder Production"
            total={sampleExtruderGrandTotal}
            rows={sampleExtruderColorRows}
            theme={{ cardBg: 'bg-[#00897B]/5', cardBorder: 'border-[#B8DCD0]', titleColor: 'text-[#0B5566]', totalColor: 'text-[#0B5566]' }}
          />

          <ExtruderSummaryCard
            title="Looms Production"
            total={sampleLoomsGrandTotal}
            rows={sampleLoomsColorRows}
            theme={{ cardBg: 'bg-[#004D40]/5', cardBorder: 'border-[#B8D8D5]', titleColor: 'text-[#7A6A00]', totalColor: 'text-[#7A6A00]' }}
          />

          <ExtruderSummaryCard
            title="Fabric Checking"
            total={sampleFabricGrandTotal}
            rows={sampleFabricColorRows}
            theme={{ cardBg: 'bg-[#004D40]/5', cardBorder: 'border-[#C5D8C2]', titleColor: 'text-[#2F6B2F]', totalColor: 'text-[#2F6B2F]' }}
          />
        </div>
      </div>

      {/* Yarn Balance (own horizontal section, styled like Fabric Stock below) */}
      <div className="w-full">
        <SectionSummaryCard
          title="Yarn Balance"
          total={sampleYarnBalanceByColor.reduce((sum, row) => sum + row.balance, 0)}
          totalColorClassName="text-[#0B5566]"
        >
          {sampleYarnBalanceByVariant.map((row) => {
            const theme = fabricStockCardTheme(row.color);
            const colorTotal = sampleYarnBalanceByColor.find((r) => r.color === row.color)?.balance ?? 0;
            const colorRow = sampleYarnBalanceColorRows.find((r) => r.color === row.color);
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={colorTotal}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={[]}
                table={colorRow ? toChemicalTable(colorRow) : { columns: [], rows: [] }}
                emptyMessage="No yarn balance recorded yet."
              />
            );
          })}
        </SectionSummaryCard>
      </div>

      {/* Kora Balance (own horizontal section, below Yarn Balance) */}
      <div className="w-full">
        <SectionSummaryCard
          title="Kora Balance"
          total={sampleKoraBalanceByColor.reduce((sum, row) => sum + row.balance, 0)}
          totalColorClassName="text-[#7A6A00]"
        >
          {sampleKoraBalanceByVariant.map((row) => {
            const theme = fabricStockCardTheme(row.color);
            const colorTotal = sampleKoraBalanceByColor.find((r) => r.color === row.color)?.balance ?? 0;
            const colorRow = sampleKoraBalanceColorRows.find((r) => r.color === row.color);
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={colorTotal}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={[]}
                table={colorRow ? toChemicalTable(colorRow) : { columns: [], rows: [] }}
                emptyMessage="No kora balance recorded yet."
              />
            );
          })}
        </SectionSummaryCard>
      </div>

      {/* Fabric Stock (own horizontal section) */}
      <div className="w-full">
        <FabricStockCard rows={sampleFabricStockColorRows} total={sampleTotalFabricStockKg} />
      </div>

      {/* Fabric Delivered (own horizontal section, below Fabric Stock) */}
      <div className="w-full">
        <SectionSummaryCard
          title="Fabric Delivered"
          total={sampleSelectedMonthDeliveryTotal}
          isLoading={loadingSampleDashboard}
          loadingMessage="Loading delivered records..."
        >
          {sampleDeliveriesByColor.map((row) => {
            const theme = fabricStockCardTheme(row.color);
            const colorRow = sampleFabricDeliveredColorRows.find((r) => r.color === row.color);
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={row.total}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={[]}
                table={colorRow ? toChemicalTable(colorRow) : { columns: [], rows: [] }}
                emptyMessage="No deliveries recorded yet."
              />
            );
          })}
        </SectionSummaryCard>
      </div>
    </>
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white animate-in fade-in-0 duration-300">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader size="xl" className="text-[#004D40]" />
          <p className="text-sm font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-white animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-both">
      <style>{`
        @keyframes dashFloatA { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-18px,24px,0) scale(1.06); } }
        @keyframes dashFloatB { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(20px,-16px,0) scale(1.08); } }
        @keyframes dashFloatC { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-12px,-18px,0) scale(1.04); } }
        @keyframes dashGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.35); } 50% { box-shadow: 0 0 0 6px rgba(99,102,241,0); } }
        @keyframes dashFlow { 0% { transform: translateX(0); opacity: .4; } 50% { opacity: 1; } 100% { transform: translateX(6px); opacity: .4; } }
      `}</style>

      {/* Decorative gradient blobs — slow drift, paused for reduced-motion users */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-red-200/30 blur-3xl motion-safe:[animation:dashFloatA_9s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-yellow-200/30 blur-3xl motion-safe:[animation:dashFloatB_11s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-64 rounded-full bg-green-200/30 blur-3xl motion-safe:[animation:dashFloatC_10s_ease-in-out_infinite]" />

      <div className="relative z-10 p-1.5 md:p-1.5 flex flex-col gap-2 bg-[#F4F1E8]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-gray-200 px-2 py-1 animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both">
          <div>
            <h1 className="text-[22px] font-bold text-black leading-tight px-1">Welcome to {companyName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={format(filterDate, 'yyyy-MM')}
              max={todayMonthStr()}
              onChange={(e) => {
                if (e.target.value) {
                  setFilterDate(parseISO(`${e.target.value}-01`));
                }
              }}
              className="font-hanken h-9 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-[10px] font-medium text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
            />
            <button onClick={handleRefresh} disabled={isManualRefreshing} className="flex items-center justify-center border border-gray-400 rounded-lg w-9 h-9 text-slate-500 hover:bg-slate-50 transition-colors" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin text-[#004D40]' : ''}`} />
            </button>
          </div>
        </div>

        {/* White content surface wrapping everything below the header */}
        {isManualRefreshing ? (
          <div className="flex-1 flex items-center justify-center py-32 animate-in fade-in-0 duration-300">
            <div className="flex flex-col items-center gap-3 text-[#004D40]">
              <Loader size="xl" />
              <p className="text-sm font-medium animate-pulse">Refreshing dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both">

            {/* Inventory Summary Mini Cards */}
            <RawMaterialsSection>
              <RawMaterialCard
                icon="/hdpe.png"
                iconAlt="HDPE"
                title="HDPE Materials"
                totalWeight={rawMaterials.weight}
                totalValueClassName="text-brown-400"
                hoverBorderClassName="hover:border-blue-200"
                items={rawMaterials.items}
                itemsGapClassName="gap-x-10 gap-y-3"
                showBags
                weightSuffixVariant="plain"
                emptyMessage="No HDPE this month"
              />

              <RawMaterialCard
                icon="/chemical.png"
                iconAlt="Chemicals"
                title="Chemicals"
                totalWeight={chemicals.weight}
                totalValueClassName="text-gray-800"
                hoverBorderClassName="hover:border-orange-200"
                items={chemicals.items}
                itemsGapClassName="gap-x-9 gap-y-3 mt-px"
                weightSuffixVariant="styled"
                emptyMessage="No chemicals this month"
              />

              <RawMaterialCard
                icon="/color.png"
                iconAlt="Colors"
                title="Colors"
                totalWeight={invColors.weight}
                totalValueClassName="text-gray-800"
                hoverBorderClassName="hover:border-purple-200"
                items={invColors.items}
                itemsGapClassName="gap-x-9 gap-y-3 mt-1"
                weightSuffixVariant="styled"
                emptyMessage="No colors this month"
              />
            </RawMaterialsSection>

            {/* Dashboard Tabs: Production Summary / Wastage Summary / Sample Production */}
            <div className="mt-4">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="gap-4 cursor-pointer">
                <div className="border-b border-gray-400 px-3 flex items-center justify-between gap-2">
                  <TabsList variant="underline" className="border-b-0 gap-2">
                    <TabsTrigger
                      value="production"
                      style={{
                        backgroundColor: activeTab === 'production' ? '#004D40' : 'transparent',
                        color: activeTab === 'production' ? 'white' : undefined
                      }}
                      className="!rounded-t-md px-6 py-2 transition-all duration-300 data-[state=active]:after:hidden hover:text-[#004D40]"
                    >
                      <span className="flex items-center gap-1 text-[15px] font-extrabold">
                        Production Summary
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="sample"
                      style={{
                        backgroundColor: activeTab === 'sample' ? '#004D40' : 'transparent',
                        color: activeTab === 'sample' ? 'white' : undefined
                      }}
                      className="!rounded-t-md px-6 py-2 transition-all duration-300 data-[state=active]:after:hidden hover:text-[#004D40]"
                    >
                      <span className="flex items-center gap-1 text-[15px] font-extrabold">
                        Sample Production
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="wastage"
                      style={{
                        backgroundColor: activeTab === 'wastage' ? '#004D40' : 'transparent',
                        color: activeTab === 'wastage' ? 'white' : undefined
                      }}
                      className="!rounded-t-md px-6 py-2 transition-all duration-300 data-[state=active]:after:hidden hover:text-[#004D40]"
                    >
                      <span className="flex items-center gap-1 text-[15px] font-extrabold">
                        Wastage Summary
                      </span>
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 flex items-center gap-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40]/10 rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide"
                    onClick={() => setIsReportModalOpen(true)}
                  >
                    <Download className="w-3 h-3" />
                    REPORT
                  </Button>
                </div>

                <div className="overflow-hidden">
                  <TabsContent value="production" className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-right-8 duration-500 ease-out">
                    {renderProductionSummary()}
                  </TabsContent>

                  <TabsContent value="sample" className="flex flex-col gap-2">
                    {renderSampleProduction()}
                  </TabsContent>

                  <TabsContent value="wastage" className="flex flex-col gap-2 animate-in fade-in-0 slide-in-from-right-8 duration-500 ease-out">
                    <WastageTabContent
                      currentMonthStr={currentMonthStr}
                      looseWasteKg={looseWasteKg}
                      lumsWasteKg={lumsWasteKg}
                      extruderProductionsData={extruderProductionsRes?.data ?? []}
                      loomsProductionsData={loomsProductionsRes?.data ?? []}
                      fabricCheckingData={fabricCheckingRes?.data ?? []}
                      sampleExtruderData={sampleExtruderProductionsRes?.data ?? []}
                      sampleLoomsData={sampleLoomsProductionsRes?.data ?? []}
                      sampleFabricData={sampleFabricCheckingRes?.data ?? []}
                      buildWastageChemicalRows={buildWastageChemicalRows}
                      loomsWasteByColor={loomsWasteByColor}
                      fabricWasteByColor={fabricWasteByColor}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'wastage' ? (
        <DashboardWastageReportModal
          open={isReportModalOpen}
          onOpenChange={setIsReportModalOpen}
          companyName={companyName}
          monthStr={currentMonthStr}
          extruderByColor={extruderWasteSummaryByColor}
          extruderTotal={lumsWasteKg + looseWasteKg}
          loomsByColor={loomsWasteByColor}
          loomsTotal={loomsWasteByColor.reduce((sum, r) => sum + r.loomsWaste, 0)}
          fabricByColor={fabricWasteByColor}
          fabricTotal={fabricWasteByColor.reduce((sum, r) => sum + r.fabricWaste + r.bitWaste, 0)}
          extruderBySize={extruderWasteBySize}
          extruderByChemical={extruderWasteByChemical}
          loomsBySize={loomsWasteBySize}
          loomsByChemical={loomsWasteByChemical}
          fabricBySize={fabricWasteBySize}
          fabricByChemical={fabricWasteByChemical}
        />
      ) : (
        <DashboardReportModal
          open={isReportModalOpen}
          onOpenChange={setIsReportModalOpen}
          reportTitle={activeTab === 'sample' ? 'Sample Production Report' : 'Production Summary Report'}
          companyName={companyName}
          monthStr={currentMonthStr}
          extruderByColor={activeTab === 'sample' ? sampleExtruderColorRows : extruderColorRows}
          extruderTotal={activeTab === 'sample' ? sampleExtruderGrandTotal : extruderGrandTotal}
          loomsByColor={activeTab === 'sample' ? sampleLoomsColorRows : loomsColorRows}
          loomsTotal={activeTab === 'sample' ? sampleLoomsGrandTotal : loomsGrandTotal}
          fabricByColor={activeTab === 'sample' ? sampleFabricColorRows : fabricColorRows}
          fabricTotal={activeTab === 'sample' ? sampleFabricGrandTotal : fabricGrandTotal}
          extruderBySize={activeTab === 'sample' ? sampleExtruderBySizeRows : extruderBySizeRows}
          loomsBySize={activeTab === 'sample' ? sampleLoomsBySizeRows : loomsBySizeRows}
          fabricBySize={activeTab === 'sample' ? sampleFabricBySizeRows : fabricBySizeRows}
          extruderByChemical={activeTab === 'sample' ? sampleExtruderByChemicalRows : extruderByChemicalRows}
          loomsByChemical={activeTab === 'sample' ? sampleLoomsByChemicalRows : loomsByChemicalRows}
          fabricByChemical={activeTab === 'sample' ? sampleFabricByChemicalRows : fabricByChemicalRows}
          yarnBalanceByColor={activeTab === 'sample' ? sampleYarnBalanceByColor : yarnBalanceByColor}
          koraBalanceByColor={activeTab === 'sample' ? sampleKoraBalanceByColor : koraBalanceByColor}
          fabricStockByColor={activeTab === 'sample' ? sampleFabricStockByColor : fabricStockByColor}
          totalFabricStock={activeTab === 'sample' ? sampleTotalFabricStockKg : totalFabricStockKg}
          deliveriesByColor={activeTab === 'sample' ? sampleDeliveriesByColor : monthDeliveriesByColor}
          totalDelivered={activeTab === 'sample' ? sampleSelectedMonthDeliveryTotal : selectedMonthDeliveryTotal}
        />
      )}
    </div>
  );
}

function FabricStockCard({
  rows,
  total,
}: {
  rows: { color: string; production: number; chemicals: { chemical: string; sizes: { size: string; production: number }[] }[] }[];
  total: number;
}) {
  return (
    <SectionSummaryCard title="Fabric Stock" total={total} isEmpty={rows.length === 0} emptyMessage="No fabric stock records yet.">
      {rows.map((row) => {
        const theme = fabricStockCardTheme(row.color);
        return (
          <DetailBreakdownCard
            key={row.color}
            title={row.color}
            total={row.production}
            theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
            rows={[]}
            table={toChemicalTable(row)}
            emptyMessage="No stock recorded yet."
          />
        );
      })}
    </SectionSummaryCard>
  );
}

function WastageTabContent({
  currentMonthStr,
  looseWasteKg,
  lumsWasteKg,
  extruderProductionsData,
  loomsProductionsData,
  fabricCheckingData,
  sampleExtruderData,
  sampleLoomsData,
  sampleFabricData,
  buildWastageChemicalRows,
  loomsWasteByColor,
  fabricWasteByColor,
}: {
  currentMonthStr: string;
  looseWasteKg: number;
  lumsWasteKg: number;
  extruderProductionsData: any[];
  loomsProductionsData: any[];
  fabricCheckingData: any[];
  sampleExtruderData: any[];
  sampleLoomsData: any[];
  sampleFabricData: any[];
  buildWastageChemicalRows: (records: any[], stage: 'extruder' | 'looms' | 'fabric') => any[];
  loomsWasteByColor: { color: string; loomsWaste: number }[];
  fabricWasteByColor: { color: string; fabricWaste: number; bitWaste: number }[];
}) {
  const [wastageMode, setWastageMode] = useState<'production' | 'sample'>('production');

  // Sample scalar totals — derived from sample records (no separate dashboard API for sample wastage)
  const sampleLooseWaste = sampleExtruderData
    .filter((r: any) => r.productionDate?.startsWith(currentMonthStr))
    .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'YARN_WASTE')?.quantityKg ?? 0), 0);
  const sampleLums = sampleExtruderData
    .filter((r: any) => r.productionDate?.startsWith(currentMonthStr))
    .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'LUMPS')?.quantityKg ?? 0), 0);

  const sampleLoomsWasteByColor = FABRIC_COLORS.map(color => ({
    color,
    loomsWaste: sampleLoomsData
      .filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase() && r.productionDate?.startsWith(currentMonthStr))
      .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'LOOMS_WASTE')?.quantityKg ?? 0), 0),
  }));

  const sampleFabricWasteByColor = FABRIC_COLORS.map(color => ({
    color,
    fabricWaste: sampleFabricData
      .filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase() && r.productionDate?.startsWith(currentMonthStr))
      .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'FW')?.quantityKg ?? 0), 0),
    bitWaste: sampleFabricData
      .filter((r: any) => r.color?.name?.toLowerCase() === color.toLowerCase() && r.productionDate?.startsWith(currentMonthStr))
      .reduce((sum: number, r: any) => sum + (r.wastages?.find((w: any) => w.wastageType?.code === 'BW')?.quantityKg ?? 0), 0),
  }));

  const isProduction = wastageMode === 'production';

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 p-0.5 text-xs font-semibold shadow-sm">
          <button
            type="button"
            onClick={() => setWastageMode('production')}
            className={`rounded-full px-4 py-1.5 transition-all duration-200 ${
              isProduction
                ? 'bg-[#004D40] text-white shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Production
          </button>
          <button
            type="button"
            onClick={() => setWastageMode('sample')}
            className={`rounded-full px-4 py-1.5 transition-all duration-200 ${
              !isProduction
                ? 'bg-[#004D40] text-white shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sample
          </button>
        </div>
      </div>

      <WastageCard
        looseWaste={isProduction ? looseWasteKg : sampleLooseWaste}
        lums={isProduction ? lumsWasteKg : sampleLums}
        extruderWasteByChemical={buildWastageChemicalRows(isProduction ? extruderProductionsData : sampleExtruderData, 'extruder')}
        loomsWasteByColor={isProduction ? loomsWasteByColor : sampleLoomsWasteByColor}
        loomsWasteByChemical={buildWastageChemicalRows(isProduction ? loomsProductionsData : sampleLoomsData, 'looms')}
        fabricWasteByColor={isProduction ? fabricWasteByColor : sampleFabricWasteByColor}
        fabricWasteByChemical={buildWastageChemicalRows(isProduction ? fabricCheckingData : sampleFabricData, 'fabric')}
      />
    </div>
  );
}

function WastageCard({
  looseWaste,
  lums,
  extruderWasteByChemical,
  loomsWasteByColor,
  loomsWasteByChemical,
  fabricWasteByColor,
  fabricWasteByChemical,
}: {
  looseWaste: number;
  lums: number;
  extruderWasteByChemical: { color: string; chemicals: { chemical: string; sizes: { size: string; lums: number; yarnWaste: number }[] }[] }[];
  loomsWasteByColor: { color: string; loomsWaste: number }[];
  loomsWasteByChemical: { color: string; chemicals: { chemical: string; sizes: { size: string; loomsWaste: number }[] }[] }[];
  fabricWasteByColor: { color: string; fabricWaste: number; bitWaste: number }[];
  fabricWasteByChemical: { color: string; chemicals: { chemical: string; sizes: { size: string; fabricWaste: number; bitWaste: number }[] }[] }[];
}) {
  const extruderTotal = lums + looseWaste;
  const loomsWasteTotal = loomsWasteByColor.reduce((sum, r) => sum + r.loomsWaste, 0);
  const fabricWasteTotal = fabricWasteByColor.reduce((sum, r) => sum + r.fabricWaste + r.bitWaste, 0);

  const formatNum = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderChemicalTable = (
    color: string,
    chemicals: any[],
    getRowDefs: (chem: any) => { label: string; values: Record<string, number> }[]
  ) => {
    const rowTotal = chemicals.reduce((s1, c) => {
      const rows = getRowDefs(c).filter(r => Object.values(r.values).some(v => v > 0));
      return s1 + rows.reduce((s2, r) => s2 + Object.values(r.values).reduce((s3, v) => s3 + v, 0), 0);
    }, 0);

    const theme = fabricStockCardTheme(color);

    return (
      <div key={color} className={`${theme.bg} border ${theme.border} rounded-[14px] shadow-sm flex flex-col overflow-hidden mt-2 mb-2`}>
        <div className={`flex items-center justify-between px-4 py-2.5 bg-white/40 border-b ${theme.border}`}>
          <span className={`text-[17px] font-bold ${deliveryColorClass(color)}`}>{color}</span>
          <span className={`text-[14px] font-bold ${deliveryColorClass(color)}`}>Total : <span className="font-inter">{formatNum(rowTotal)}</span> kg</span>
        </div>

        {rowTotal === 0 ? (
          <div className="flex items-center justify-center py-5">
            <p className="text-xs text-gray-400 italic">No wastage recorded yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-3">
            {chemicals.map(chem => {
              const columns = [...FABRIC_STOCK_SIZES];
              const tableRows = getRowDefs(chem).filter((r) => Object.values(r.values).some((v) => v > 0));
              const chemTotal = tableRows.reduce((sum, r) => sum + Object.values(r.values).reduce((s, v) => s + v, 0), 0);

              if (chemTotal === 0) return null;

              return (
                <DetailBreakdownCard
                  key={chem.chemical}
                  title={chem.chemical}
                  total={chemTotal}
                  theme={{ cardBg: 'bg-white', cardBorder: 'border-gray-200', labelColor: 'text-gray-700' }}
                  rows={[]}
                  table={{ columns: [...columns], rows: tableRows }}
                  emptyMessage="No waste recorded yet."
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Extruder Wastage */}
      <div className="flex flex-col">
        <SectionSummaryCard title="Extruder Wastage" total={extruderTotal} isEmpty={extruderTotal === 0} emptyMessage="No wastage record found." totalColorClassName="text-[#0B5566]">
          {extruderWasteByChemical.map((row) =>
            renderChemicalTable(row.color, row.chemicals, (chem) => [
              { label: 'LOOMS WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.yarnWaste])) },
              { label: 'LUMPS WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.lums])) },
            ])
          )}
        </SectionSummaryCard>
      </div>

      {/* Looms Wastage */}
      <div className="flex flex-col">
        <SectionSummaryCard title="Looms Wastage" total={loomsWasteTotal} isEmpty={loomsWasteTotal === 0} emptyMessage="No wastage record found." totalColorClassName="text-[#7A6A00]">
          {loomsWasteByChemical.map((row) =>
            renderChemicalTable(row.color, row.chemicals, (chem) => [
              { label: 'LOOMS WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.loomsWaste])) },
            ])
          )}
        </SectionSummaryCard>
      </div>

      {/* Fabric Checking Wastage */}
      <div className="flex flex-col">
        <SectionSummaryCard title="Fabric Checking Wastage" total={fabricWasteTotal} isEmpty={fabricWasteTotal === 0} emptyMessage="No wastage record found." totalColorClassName="text-[#2F6B2F]">
          {fabricWasteByChemical.map((row) =>
            renderChemicalTable(row.color, row.chemicals, (chem) => [
              { label: 'FABRIC WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.fabricWaste])) },
              { label: 'BIT WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.bitWaste])) },
            ])
          )}
        </SectionSummaryCard>
      </div>
    </div>
  );
}

