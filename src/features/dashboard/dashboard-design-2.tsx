import { Link } from 'react-router-dom';
import '@fontsource-variable/hanken-grotesk';
import { Calendar, RefreshCw, ArrowRight, Layers } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import loomsIcon from '@/assets/looms-icon.png';
import { useLoadSentRecords, getLoadSentWeight } from '@/features/inventory/load-sent-queries';
import { Loader } from '@/components/shared/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDayWiseProduction } from '@/features/production/day-wise-queries';
import { useInventoryRecords, type InventoryType } from '@/features/inventory/inventory-queries';
import { useExtruderProductions } from '@/features/extruder/extruder-queries';
import { useLoomsProductions } from '@/features/looms/loom-queries';
import { useFabricCheckingRecords } from '@/features/fabric/fabric-queries';
import { sumWastageByCode } from '@/lib/api-types';
import { useLookups } from '@/lib/lookups';

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDMY(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return y && m && d ? `${d}-${m}-${y}` : dateStr;
}

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

const FABRIC_STOCK_SIZES = ['150cm', '160cm', '170cm', '180cm', '190cm'] as const;
const FABRIC_COLORS = ['Blue', 'Green', 'White'] as const;

export function DashboardDesign2() {
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const prevMonthDate = subMonths(new Date(), 1);
  const prevMonthStr = format(prevMonthDate, 'yyyy-MM');

  const { rows, apiSummary, isLoading } = useDayWiseProduction(currentMonthStr);
  const { apiSummary: prevApiSummary } = useDayWiseProduction(prevMonthStr);
  const { data: inventoryData } = useInventoryRecords('?limit=100');
  const { data: loadSentData, isLoading: loadingLoadSent } = useLoadSentRecords('?limit=100');
  const { data: extruderData } = useExtruderProductions('?limit=100');
  const { data: loomsData } = useLoomsProductions('?limit=100');
  const { data: fabricCheckingData } = useFabricCheckingRecords('?limit=100');
  useLookups();

  // Wastage from each process — quantities live on each record's `wastages` array,
  // keyed by wastageType.code (LUMPS/YARN_WASTE for Extruder, LOOMS_WASTE for Looms,
  // FW/BW for Fabric Checking), never as a field on the stage's own detail object.
  const looseWasteKg = (extruderData?.data ?? []).reduce((sum, r) => sum + sumWastageByCode(r.wastages, 'YARN_WASTE'), 0);
  const lumsWasteKg = (extruderData?.data ?? []).reduce((sum, r) => sum + sumWastageByCode(r.wastages, 'LUMPS'), 0);

  // Extruder Lums/Yarn waste broken down by color — each wastage entry carries
  // its own optional color, falling back to the parent record's color.
  const extruderWasteByColor = (() => {
    const map = new Map<string, { lums: number; yarnWaste: number }>();
    FABRIC_COLORS.forEach((color) => map.set(color, { lums: 0, yarnWaste: 0 }));
    (extruderData?.data ?? []).forEach((r) => {
      (r.wastages ?? []).forEach((w) => {
        if (w.wastageType.code !== 'LUMPS' && w.wastageType.code !== 'YARN_WASTE') return;
        const colorName = w.color?.name ?? r.color?.name ?? 'Unspecified';
        const existing = map.get(colorName) ?? { lums: 0, yarnWaste: 0 };
        if (w.wastageType.code === 'LUMPS') existing.lums += w.quantityKg;
        else existing.yarnWaste += w.quantityKg;
        map.set(colorName, existing);
      });
    });
    return Array.from(map.entries()).map(([color, vals]) => ({ color, ...vals }));
  })();

  // Looms waste broken down by color — same pattern as extruderWasteByColor above.
  const loomsWasteByColor = (() => {
    const map = new Map<string, { loomsWaste: number }>();
    FABRIC_COLORS.forEach((color) => map.set(color, { loomsWaste: 0 }));
    (loomsData?.data ?? []).forEach((r) => {
      (r.wastages ?? []).forEach((w) => {
        if (w.wastageType.code !== 'LOOMS_WASTE') return;
        const colorName = w.color?.name ?? r.color?.name ?? 'Unspecified';
        const existing = map.get(colorName) ?? { loomsWaste: 0 };
        existing.loomsWaste += w.quantityKg;
        map.set(colorName, existing);
      });
    });
    return Array.from(map.entries()).map(([color, vals]) => ({ color, ...vals }));
  })();

  // Fabric Checking (FW) + Bit (BW) waste broken down by color — same pattern as above.
  const fabricWasteByColor = (() => {
    const map = new Map<string, { fabricWaste: number; bitWaste: number }>();
    FABRIC_COLORS.forEach((color) => map.set(color, { fabricWaste: 0, bitWaste: 0 }));
    (fabricCheckingData?.data ?? []).forEach((r) => {
      (r.wastages ?? []).forEach((w) => {
        if (w.wastageType.code !== 'FW' && w.wastageType.code !== 'BW') return;
        const colorName = w.color?.name ?? r.color?.name ?? 'Unspecified';
        const existing = map.get(colorName) ?? { fabricWaste: 0, bitWaste: 0 };
        if (w.wastageType.code === 'FW') existing.fabricWaste += w.quantityKg;
        else existing.bitWaste += w.quantityKg;
        map.set(colorName, existing);
      });
    });
    return Array.from(map.entries()).map(([color, vals]) => ({ color, ...vals }));
  })();

  // Extruder production + waste combined, by color — used by the Production Summary
  // Extruder card's per-color breakdown table.
  const extruderSummaryByColor = (() => {
    const map = new Map<string, { production: number; waste: number }>();
    FABRIC_COLORS.forEach((color) => map.set(color, { production: 0, waste: 0 }));
    (extruderData?.data ?? []).forEach((r) => {
      const colorName = r.color?.name ?? 'Unspecified';
      const existing = map.get(colorName) ?? { production: 0, waste: 0 };
      existing.production += r.extruder?.yarnOutputKg ?? 0;
      map.set(colorName, existing);
    });
    extruderWasteByColor.forEach((w) => {
      const existing = map.get(w.color) ?? { production: 0, waste: 0 };
      existing.waste += w.lums + w.yarnWaste;
      map.set(w.color, existing);
    });
    return Array.from(map.entries()).map(([color, vals]) => ({
      color,
      production: vals.production,
      waste: vals.waste,
      total: vals.production + vals.waste,
    }));
  })();
  const extruderGrandTotal = extruderSummaryByColor.reduce((sum, row) => sum + row.production, 0);

  // Looms production + waste combined, by color — same pattern as extruderSummaryByColor above.
  const loomsSummaryByColor = (() => {
    const map = new Map<string, { production: number; waste: number }>();
    FABRIC_COLORS.forEach((color) => map.set(color, { production: 0, waste: 0 }));
    (loomsData?.data ?? []).forEach((r) => {
      const colorName = r.color?.name ?? 'Unspecified';
      const existing = map.get(colorName) ?? { production: 0, waste: 0 };
      existing.production += r.loom?.fabricOutputKg ?? 0;
      map.set(colorName, existing);
    });
    loomsWasteByColor.forEach((w) => {
      const existing = map.get(w.color) ?? { production: 0, waste: 0 };
      existing.waste += w.loomsWaste;
      map.set(w.color, existing);
    });
    return Array.from(map.entries()).map(([color, vals]) => ({
      color,
      production: vals.production,
      waste: vals.waste,
      total: vals.production + vals.waste,
    }));
  })();
  const loomsGrandTotal = loomsSummaryByColor.reduce((sum, row) => sum + row.production, 0);

  // Fabric Checking production + waste combined, by color — same pattern as above.
  const fabricSummaryByColor = (() => {
    const map = new Map<string, { production: number; waste: number }>();
    FABRIC_COLORS.forEach((color) => map.set(color, { production: 0, waste: 0 }));
    (fabricCheckingData?.data ?? []).forEach((r) => {
      const colorName = r.color?.name ?? 'Unspecified';
      const existing = map.get(colorName) ?? { production: 0, waste: 0 };
      existing.production += r.fabricCheck?.outputKg ?? 0;
      map.set(colorName, existing);
    });
    fabricWasteByColor.forEach((w) => {
      const existing = map.get(w.color) ?? { production: 0, waste: 0 };
      existing.waste += w.fabricWaste + w.bitWaste;
      map.set(w.color, existing);
    });
    return Array.from(map.entries()).map(([color, vals]) => ({
      color,
      production: vals.production,
      waste: vals.waste,
      total: vals.production + vals.waste,
    }));
  })();
  const fabricGrandTotal = fabricSummaryByColor.reduce((sum, row) => sum + row.production, 0);

  // Fabric Stock — no persisted "current stock" field exists anywhere in the API
  // (unlike HDPE/Chemical/Color inventory). Derived as everything Fabric Checking
  // has produced minus everything that's gone out via Load Sent, grouped by color x size.
  const fabricStockByColor = (() => {
    const byColor = new Map<string, { color: string; colorClass: string; stockBySize: Record<string, number> }>();
    const getRow = (color: string) => {
      const existing = byColor.get(color);
      if (existing) return existing;
      const row = { color, colorClass: deliveryColorClass(color), stockBySize: {} as Record<string, number> };
      byColor.set(color, row);
      return row;
    };
    FABRIC_COLORS.forEach((color) => getRow(color));
    (fabricCheckingData?.data ?? []).forEach((r) => {
      const color = r.color?.name;
      const size = r.size?.name;
      const output = r.fabricCheck?.outputKg ?? 0;
      if (!color || !size) return;
      const row = getRow(color);
      row.stockBySize[size] = (row.stockBySize[size] ?? 0) + output;
    });
    (loadSentData?.data ?? []).forEach((r) => {
      const color = r.color?.name;
      const size = r.size?.name;
      const delivered = getLoadSentWeight(r);
      if (!color || !size) return;
      const row = getRow(color);
      row.stockBySize[size] = (row.stockBySize[size] ?? 0) - delivered;
    });
    return Array.from(byColor.values());
  })();
  const totalFabricStockKg = fabricStockByColor.reduce(
    (sum, row) => sum + Object.values(row.stockBySize).reduce((s, v) => s + v, 0),
    0,
  );

  // KPI strip — Total Production, Avg Efficiency, Fabric Delivered, Pending Approvals,
  // each compared against the previous calendar month using data already fetched above.
  const totalProductionKg = (apiSummary?.extruder.outputKg ?? 0) + (apiSummary?.looms.outputKg ?? 0) + (apiSummary?.fabricChecking.outputKg ?? 0);
  const prevTotalProductionKg = (prevApiSummary?.extruder.outputKg ?? 0) + (prevApiSummary?.looms.outputKg ?? 0) + (prevApiSummary?.fabricChecking.outputKg ?? 0);

  const avgEfficiencyPct = ((apiSummary?.extruder.efficiencyPct ?? 0) + (apiSummary?.looms.efficiencyPct ?? 0) + (apiSummary?.fabricChecking.efficiencyPct ?? 0)) / 3;
  const prevAvgEfficiencyPct = ((prevApiSummary?.extruder.efficiencyPct ?? 0) + (prevApiSummary?.looms.efficiencyPct ?? 0) + (prevApiSummary?.fabricChecking.efficiencyPct ?? 0)) / 3;

  const prevMonthDeliveredKg = (loadSentData?.data ?? [])
    .filter((r) => (r.productionDate ?? r.date ?? '').startsWith(prevMonthStr))
    .reduce((sum, r) => sum + (r.fabricWeight ?? r.weightKg ?? 0), 0);

  const sparkRows = [...rows].reverse().slice(-7);
  const productionSparkline = sparkRows.map((r) => r.extruder.output + r.looms.output + r.fabric.output);
  const efficiencySparkline = sparkRows.map((r) => {
    const stages = [r.extruder, r.looms, r.fabric];
    const effs = stages.map((s) => (s.input > 0 ? (s.output / s.input) * 100 : 0));
    return effs.reduce((a, b) => a + b, 0) / effs.length;
  });
  const deliveredByDayMap = new Map<string, number>();
  (loadSentData?.data ?? []).forEach((r) => {
    const d = (r.productionDate ?? r.date ?? '').slice(0, 10);
    if (d) deliveredByDayMap.set(d, (deliveredByDayMap.get(d) ?? 0) + (r.fabricWeight ?? r.weightKg ?? 0));
  });
  const deliveredSparkline = Array.from(deliveredByDayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-7)
    .map(([, kg]) => kg);

  const prevPeriodLabel = `vs ${format(startOfMonth(prevMonthDate), 'MMM d')} – ${format(endOfMonth(prevMonthDate), 'MMM d')}`;

  const inventoryRecords = inventoryData?.data ?? [];
  const month = new Date().toISOString().slice(0, 7);
  const monthRecords = inventoryRecords.filter(r => r.date.startsWith(month));

  const getCategoryData = (type: InventoryType) => {
    const categoryRecords = monthRecords.filter(r => r.type === type);
    const weight = categoryRecords.reduce((sum, r) => sum + r.weightKg, 0);
    const itemsMap = new Map<string, number>();
    categoryRecords.forEach(r => {
      if (r.name) itemsMap.set(r.name, (itemsMap.get(r.name) || 0) + r.weightKg);
    });
    const items = Array.from(itemsMap.entries()).map(([name, w]) => ({ name, weight: w }));
    return { weight, items };
  };

  const rawMaterials = getCategoryData('HDPE');
  const chemicals = getCategoryData('CHEMICAL');
  const invColors = getCategoryData('COLOR');

  const monthDeliveries = (loadSentData?.data ?? [])
    .filter((r) => (r.productionDate ?? r.date ?? '').startsWith(month))
    .map((r) => ({
      id: r.id,
      date: r.productionDate ?? r.date,
      color: r.color?.name ?? '',
      size: r.size?.name ?? '',
      kg: getLoadSentWeight(r),
      vehicleNo: r.loadSent?.vehicleNo ?? '--',
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const selectedMonthDeliveryTotal = monthDeliveries.reduce((sum, d) => sum + d.kg, 0);

  // Fabric Delivered grouped by color — one card per color, pre-seeded with
  // FABRIC_COLORS so all 3 always render even with zero deliveries.
  const monthDeliveriesByColor = (() => {
    const map = new Map<string, typeof monthDeliveries>();
    FABRIC_COLORS.forEach((color) => map.set(color, []));
    monthDeliveries.forEach((d) => {
      const existing = map.get(d.color) ?? [];
      existing.push(d);
      map.set(d.color, existing);
    });
    return Array.from(map.entries()).map(([color, deliveries]) => ({
      color,
      deliveries,
      total: deliveries.reduce((sum, d) => sum + d.kg, 0),
    }));
  })();

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
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-gray-200 px-2 py-1 animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both">
          <div>
            <h1 className="text-[22px] font-bold text-black leading-tight px-1">Summary</h1>
             {/* <p className="text-[12px] font-medium text-gray-600 leading-tight mt-0.5">Production overview</p> */}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-slate-700">
              <span>{format(new Date(), 'MMM d, yyyy')}</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <button className="flex items-center justify-center border border-gray-400 rounded-lg w-9 h-9 text-slate-500 hover:bg-slate-50 transition-colors" aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            {/* <button className="flex items-center gap-2 bg-[#1B7A4D] rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-[#166841] transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button> */}
          </div>
        </div>

        {/* White content surface wrapping everything below the header */}
        <div className="">

        {/* KPI Strip */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <KpiStatCard
            icon={<Briefcase className="w-4 h-4 text-emerald-600" />}
            label="Total Production (Kg)"
            value={formatNum(totalProductionKg)}
            changePct={pctChange(totalProductionKg, prevTotalProductionKg)}
            periodLabel={prevPeriodLabel}
            sparklineData={productionSparkline}
          />
          <KpiStatCard
            icon={<Package className="w-4 h-4 text-emerald-600" />}
            label="Fabric Stock (Kg)"
            value={formatNum(totalFabricStockKg)}
            footer="Fabric Checking output minus deliveries"
          />
          <KpiStatCard
            icon={<Truck className="w-4 h-4 text-emerald-600" />}
            label="Fabric Delivered (Kg)"
            value={formatNum(selectedMonthDeliveryTotal)}
            changePct={pctChange(selectedMonthDeliveryTotal, prevMonthDeliveredKg)}
            periodLabel={prevPeriodLabel}
            sparklineData={deliveredSparkline}
          />
          <KpiStatCard
            icon={<ClipboardList className="w-4 h-4 text-emerald-600" />}
            label="Avg. Efficiency"
            value={`${avgEfficiencyPct.toFixed(1)}%`}
            changePct={pctChange(avgEfficiencyPct, prevAvgEfficiencyPct)}
            periodLabel={prevPeriodLabel}
            sparklineData={efficiencySparkline}
          />
        </div> */}

          {/* Inventory Summary Mini Cards */}
        <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-2.5" style={{ fontFamily: "'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif" }}>
            <p className="font-bold text-xl px-0.5 text-left pb-2">Raw Materials</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* HDPE Card */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-200 transition-colors flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <img src="/hdpe.png" alt="" className="w-26 h-26 object-contain" />
              </div>
              <div className="flex justify-between items-start mb-1 relative z-10">
                <div className="flex items-center gap-2">
                  <div className=""><img src="/hdpe.png" alt="HDPE" className="w-12 h-12 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">HDPE Materials</h3>
                </div>
                <div className="text-lg font-bold text-brown-400 leading-none">{rawMaterials.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {rawMaterials.items.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mt-1">
                    {rawMaterials.items.map(item => (
                      <div key={item.name} className="flex flex-col gap-0.5 text-sm">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-extrabold text-[#004D40]">{item.weight.toFixed(2)}<span className="text-gray-500 font-normal text-[12px] ml-0.5">kg</span></span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-xs text-gray-400 italic">No HDPE this month</span>}
              </div>
            </div>

            {/* Chemicals Card */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-orange-200 transition-colors flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <img src="/chemical.png" alt="" className="w-26 h-26 object-contain" />
              </div>
              <div className="flex justify-between items-start mb-1 relative z-10">
                <div className="flex items-center gap-2">
                  <div className=""><img src="/chemical.png" alt="Chemicals" className="w-12 h-12 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">Chemicals</h3>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-none">{chemicals.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {chemicals.items.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-px">
                    {chemicals.items.map(item => (
                      <div key={item.name} className="flex flex-col gap-0.5 text-sm">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-extrabold text-[#004D40]">{item.weight.toFixed(2)}<span className="text-gray-500 font-normal text-[12px] ml-0.5">kg</span></span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-xs text-gray-400 italic">No chemicals this month</span>}
              </div>
            </div>

            {/* Colors Card */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-purple-200 transition-colors flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <img src="/color.png" alt="" className="w-26 h-26 object-contain" />
              </div>
              <div className="flex justify-between items-start mb-1 relative z-10">
                <div className="flex items-center gap-2">
                  <div className=""><img src="/color.png" alt="Colors" className="w-12 h-12 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">Colors</h3>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-none">{invColors.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {invColors.items.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-1">
                    {invColors.items.map(item => (
                      <div key={item.name} className="flex flex-col items-center gap-0.5 text-sm">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-extrabold text-[#004D40]">{item.weight.toFixed(2)}<span className="text-gray-500 font-normal text-[12px] ml-0.5">kg</span></span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-xs text-gray-400 italic">No colors this month</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Production Summary (Extruder / Looms / Fabric) — copied verbatim from production-design-2.tsx's Summary Cards block */}
        <div className="font-hanken bg-white rounded-2xl border border-gray-400 shadow-sm p-2.5 mt-2">
           <p className="font-bold text-xl px-0.5 text-left pb-3">Production Summary</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <Card className="bg-[#00897B]/5 border border-[#B8DCD0] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
              <CardHeader className="flex flex-row items-center justify-between pb-1! pt-3 px-4 border-b border-[#B8DCD0]">
                <CardTitle className="text-[17px] font-extrabold text-[#0B5566] flex items-center gap-3">
                  Extruder Production
                </CardTitle>
                <span className="text-[13px] font-bold text-[#0B5566]">Total : <span className="font-inter">{formatNum(extruderGrandTotal)}</span> kg</span>
              </CardHeader>
              <CardContent className="px-2 pb-2 pt-0 flex flex-col">
                {extruderSummaryByColor.length === 0 ? (
                  <div className="w-full border border-gray-400 rounded-lg py-4">
                    <p className="text-center text-xs text-gray-400 italic">No extruder production recorded yet.</p>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-end px-3 py-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Production</span>
                    </div>
                    <div className="space-y-2">
                      {extruderSummaryByColor.map((row) => (
                        <div key={row.color} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                          <span className={`font-semibold text-[13.5px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                          <span className="font-bold font-inter text-gray-900">{row.production > 0 ? `${formatNum(row.production)} kg` : '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
          </Card>

          <Card className="bg-[#004D40]/5 border border-[#B8D8D5] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
              <CardHeader className="flex flex-row items-center justify-between pb-1! pt-3 px-4 border-b border-[#B8D8D5]">
                <CardTitle className="text-[17px] font-extrabold text-[#7A6A00] flex items-center gap-3">
                  Looms Production
                </CardTitle>
                <span className="text-[13px] font-bold text-[#7A6A00]">Total : <span className="font-inter">{formatNum(loomsGrandTotal)}</span> kg</span>
              </CardHeader>
              <CardContent className="px-2 pb-2 pt-0 flex flex-col">
                {loomsSummaryByColor.length === 0 ? (
                  <div className="w-full border border-gray-400 rounded-lg py-4">
                    <p className="text-center text-xs text-gray-400 italic">No looms production recorded yet.</p>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-end px-3 py-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Production</span>
                    </div>
                    <div className="space-y-2">
                      {loomsSummaryByColor.map((row) => (
                        <div key={row.color} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                          <span className={`font-semibold text-[13px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                          <span className="font-bold font-inter text-gray-900">{row.production > 0 ? `${formatNum(row.production)} kg` : '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
          </Card>

          <Card className="bg-[#004D40]/5 border border-[#C5D8C2] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
              <CardHeader className="flex flex-row items-center justify-between pb-1! pt-3 px-4 border-b border-[#C5D8C2]">
                <CardTitle className="text-[17px] font-extrabold text-[#2F6B2F] flex items-center gap-3">
                  Fabric Production
                </CardTitle>
                <span className="text-[13px] font-bold text-[#2F6B2F]">Total : <span className="font-inter">{formatNum(fabricGrandTotal)}</span> kg</span>
              </CardHeader>
              <CardContent className="px-2 pb-2 pt-0 flex flex-col">
                {fabricSummaryByColor.length === 0 ? (
                  <div className="w-full border border-gray-400 rounded-lg py-4">
                    <p className="text-center text-xs text-gray-400 italic">No fabric production recorded yet.</p>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-end px-3 py-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Production</span>
                    </div>
                    <div className="space-y-2">
                      {fabricSummaryByColor.map((row) => (
                        <div key={row.color} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                          <span className={`font-semibold text-[13px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                          <span className="font-bold font-inter text-gray-900">{row.production > 0 ? `${formatNum(row.production)} kg` : '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
          </Card>
        </div>
        </div>

           {/* Wastage */}
        <div className="font-hanken bg-white rounded-2xl border border-gray-400 shadow-sm p-2 mt-2.5">
          <p className="font-bold text-xl px-1 text-left pb-3">Wastage Summary</p>
          <WastageCard
            looseWaste={looseWasteKg}
            lums={lumsWasteKg}
            extruderWasteByColor={extruderWasteByColor}
            loomsWasteByColor={loomsWasteByColor}
            fabricWasteByColor={fabricWasteByColor}
          />
        </div>


          {/* Fabric Stock (own horizontal section) */}
      <div className="w-full">
        {/* <p className="font-bold text-lg px-0.5 text-left">Fabric Stock Overview</p> */}
        <div className="py-2">
          <FabricStockCard rows={fabricStockByColor} total={totalFabricStockKg} />
        </div>
      </div>

      {/* Fabric Delivered (own horizontal section, below Fabric Stock) */}
      <div className="w-full">
        {/* <p className="font-bold text-xl px-0.5 text-left">Fabric Delivered Overview</p> */}
        <Card className="font-hanken w-full bg-white border border-gray-400 shadow-lg shadow-slate-200/50 rounded-3xl p-2 md:p-2 gap-2 flex flex-col transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 fill-mode-both">
          <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-gray-400 pt-0 pb-0!">
            <CardTitle className="flex items-center gap-2 px-2 text-[20px] font-bold text-[#004D40]">
              <div
                className="w-6 h-6 bg-[#004D40]"
                style={{
                  WebkitMaskImage: 'url(/delivery.png)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: 'url(/delivery.png)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                }}
              />
              Fabric Delivered
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-[17px] font-bold text-[#2F6B2F]">Total : <span className="font-inter">{formatNum(selectedMonthDeliveryTotal)}</span> kg</span>
              <Link
                to="/production/new-entry?tab=delivered"
                className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                aria-label="Add fabric delivered entry"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            {loadingLoadSent ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-400 italic">Loading delivered records...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {monthDeliveriesByColor.map((row) => {
                  const theme = fabricStockCardTheme(row.color);
                  return (
                    <Card key={row.color} className={`${theme.bg} border ${theme.border} rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 h-full py-0`}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-2 px-3">
                        <CardTitle className={`text-[17px] font-bold flex items-center gap-2 ${deliveryColorClass(row.color)}`}>
                          <span className={`w-3 h-3 rounded-full ${theme.swatch}`} />
                          {row.color}
                        </CardTitle>
                        <span className={`text-[13px] font-bold ${deliveryColorClass(row.color)}`}>Total : <span className="font-inter">{formatNum(row.total)}</span> kg</span>
                      </CardHeader>
                      <CardContent className="px-2 pb-2 flex-1 flex flex-col">
                        {row.deliveries.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center py-4">
                            <p className="text-xs text-gray-400 italic">No deliveries recorded yet.</p>
                          </div>
                        ) : (
                          <div className="w-full border border-gray-300 rounded-lg overflow-hidden bg-white">
                            <table className="w-full table-fixed text-[13px] text-left">
                              <thead className="block w-full bg-slate-50 font-bold text-slate-500 uppercase text-[10px] tracking-wide">
                                <tr className="table w-full table-fixed">
                                  <th className="px-3 py-2 w-24 whitespace-nowrap">Date</th>
                                  <th className="px-3 py-2 text-center">Size</th>
                                  <th className="px-3 py-2 w-24 text-right">Qty (Kg)</th>
                                </tr>
                              </thead>
                              {/* Caps the visible list per card; anything beyond scrolls within the body only. */}
                              <tbody className="block w-full max-h-40 overflow-y-auto">
                                {row.deliveries.map((d, i) => (
                                  <tr key={d.id} className={`table w-full table-fixed ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                                    <td className="px-3 py-2 w-24 whitespace-nowrap text-slate-600">{formatDateDMY(d.date)}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{d.size}</td>
                                    <td className="px-3 py-2 w-24 text-right font-bold font-inter text-slate-900">{formatNum(d.kg)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

      
      

     
        {/* Trend + efficiency */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5 transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-200 fill-mode-both">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-[13px] font-bold text-slate-900">30-Day Output Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillExtruder" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STAGE_COLOR.extruder} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={STAGE_COLOR.extruder} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e1e0d9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }} animationDuration={150} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  <Area type="monotone" dataKey="Extruder" stroke={STAGE_COLOR.extruder} strokeWidth={2} fill="url(#fillExtruder)" dot={{ r: 2, fill: STAGE_COLOR.extruder, strokeWidth: 0 }} activeDot={{ r: 4 }} {...CHART_ANIM} />
                  <Area type="monotone" dataKey="Looms" stroke={STAGE_COLOR.looms} strokeWidth={2} fill="none" dot={{ r: 2, fill: STAGE_COLOR.looms, strokeWidth: 0 }} activeDot={{ r: 4 }} {...CHART_ANIM} />
                  <Area type="monotone" dataKey="Fabric" stroke={STAGE_COLOR.fabric} strokeWidth={2} fill="none" dot={{ r: 2, fill: STAGE_COLOR.fabric, strokeWidth: 0 }} activeDot={{ r: 4 }} {...CHART_ANIM} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5 transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-300 fill-mode-both">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-[13px] font-bold text-slate-900">Weekly Process Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processDetailsMock} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e1e0d9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} animationDuration={150} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} iconType="circle" />
                  <Bar dataKey="Extruder" fill="#00A29A" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Looms" fill="#003B73" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Fabric" fill="#88D84D" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div> */}

        {/* Employees + Expenses (mock) */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5 transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-[350ms] fill-mode-both">
            <CardHeader className="p-0 mb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#00897B] flex items-center justify-center shadow-sm">
                  <Users className="w-4 h-4 text-white" />
                </span>
                Employees <span className="text-[10px] font-medium text-slate-400 normal-case">(illustrative)</span>
              </CardTitle>
              <div className="text-right">
                <p className="text-[20px] font-extrabold text-slate-900 leading-none">
                  78<span className="text-slate-400 font-medium text-lg">/84</span>
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-1 tracking-wide">Present Today</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              <div className="h-44 w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockAttendanceTrend} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillAttendance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00897B" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#00897B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={5} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} domain={[60, 100]} ticks={[60, 68, 76, 84, 92, 100]} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} animationDuration={150} />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stroke="#00897B"
                      strokeWidth={2}
                      fill="url(#fillAttendance)"
                      dot={{ r: 4, fill: '#00897B', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      label={{ position: 'top', fill: '#475569', fontSize: 10, fontWeight: 600, dy: -8 }}
                      {...CHART_ANIM}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex bg-slate-50/70 rounded-xl p-3.5 items-center justify-between border border-slate-100">
                <div className="flex items-center gap-3 w-1/2 justify-center">
                  <div className="bg-[#00897B] p-2 rounded-lg shadow-sm"><Calendar className="text-white w-4 h-4" /></div>
                  <div className="flex flex-col text-left">
                    <p className="text-[#64748b] text-[10px] font-medium tracking-wide">Attendance Rate</p>
                    <p className="text-[#00897B] font-extrabold text-[15px]">92.86%</p>
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="flex items-center gap-3 w-1/2 justify-center">
                  <div className="bg-[#00897B]/10 p-2 rounded-lg"><Users className="text-[#00897B] w-4 h-4" /></div>
                  <div className="flex flex-col text-left">
                    <p className="text-[#64748b] text-[10px] font-medium tracking-wide">Total Employees</p>
                    <p className="text-[#00897B] font-extrabold text-[15px]">84</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5 transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-[400ms] fill-mode-both">
            <CardHeader className="p-0 mb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#F2BB13] flex items-center justify-center shadow-sm">
                  <Wallet className="w-4 h-4 text-white" />
                </span>
                Expenses <span className="text-[10px] font-medium text-slate-400 normal-case">(illustrative)</span>
              </CardTitle>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Calendar className="w-3.5 h-3.5" />
                This Month
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              <div className="flex items-center gap-0 h-52 w-full">
                <div className="w-[65%] h-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
                      <Pie
                        data={mockExpenseBreakdown}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={72}
                        stroke="#fff"
                        strokeWidth={2}
                        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        label={({ cx, cy, midAngle = 0, outerRadius, percent = 0, name }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 22;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          const isLeft = x < cx;
                          return (
                            <g>
                              <text
                                x={x}
                                y={y - 7}
                                textAnchor={isLeft ? 'end' : 'start'}
                                dominantBaseline="central"
                                fontSize={12}
                                fontWeight="800"
                                fill="#1e293b"
                              >
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                              <text
                                x={x}
                                y={y + 7}
                                textAnchor={isLeft ? 'end' : 'start'}
                                dominantBaseline="central"
                                fontSize={10}
                                fill="#64748b"
                              >
                                {name}
                              </text>
                            </g>
                          );
                        }}
                        {...CHART_ANIM}
                      >
                        {mockExpenseBreakdown.map((entry, i) => (
                          <Cell key={entry.category} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} animationDuration={150} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-[35%] flex flex-col justify-center pl-1">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <span>Category</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {mockExpenseBreakdown.map((e, i) => (
                      <div key={e.category} className="flex items-center justify-between text-[11px] group">
                        <span className="flex items-center gap-2 text-slate-600 font-semibold group-hover:text-slate-900 transition-colors">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                          {e.category}
                        </span>
                        <span className="font-bold text-slate-800 tabular-nums text-[11px] text-right">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex bg-slate-50/70 rounded-xl p-3 items-center justify-between border border-slate-100">
                <div className="flex items-center gap-3 w-[55%] justify-center">
                  <div className="bg-[#2ebf91]/20 p-1.5 rounded-full"><IndianRupee className="text-[#208a68] w-4 h-4" /></div>
                  <div>
                    <p className="text-[#64748b] text-[10px] font-medium tracking-wide">Total Expenses</p>
                    <p className="text-[#208a68] font-extrabold text-[15px]">₹2,57,500</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex items-center gap-3 w-[45%] justify-center">
                  <div className="bg-[#2ebf91]/10 p-1.5 rounded-md"><TrendingUp className="text-[#208a68] w-4 h-4" /></div>
                  <div>
                    <p className="text-[#64748b] text-[10px] font-medium tracking-wide">vs Last Month</p>
                    <p className="text-[#208a68] font-extrabold text-[13px]">+8.42% ↗</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div> */}
        </div>
      </div>
    </div>
  );
}

function FabricStockCard({
  rows,
  total,
}: {
  rows: { color: string; colorClass: string; stockBySize: Record<string, number> }[];
  total: number;
}) {
  return (
    <Card className="font-hanken bg-white border border-gray-400 shadow-lg shadow-slate-200/50 rounded-3xl p-2 md:p-2 gap-2 flex flex-col transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 fill-mode-both">
      <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-gray-400 pt-0 pb-0!">
        <CardTitle className="flex items-center gap-2 px-2 text-[20px] font-bold text-[#004D40]">
          <img src="/stock.png" alt="" className="w-6 h-6 object-contain" />
          Fabric Stock
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-bold text-[#2F6B2F]">Total : <span className="font-inter">{formatNum(total)}</span> kg</span>
          <Link
            to="/inventory"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Go to inventory"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        {rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400 italic">No fabric stock records yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {rows.map((row) => {
              const rowTotal = Object.values(row.stockBySize).reduce((s, v) => s + v, 0);
              const hasStock = Object.keys(row.stockBySize).length > 0;
              const theme = fabricStockCardTheme(row.color);
              return (
                <Card key={row.color} className={`${theme.bg} border ${theme.border} rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 h-full py-0`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-2 px-3">
                    <CardTitle className={`text-[17px] font-bold flex items-center gap-2 ${row.colorClass}`}>
                      <span className={`w-3 h-3 rounded-full ${theme.swatch}`} />
                      {row.color}
                    </CardTitle>
                    <span className={`text-[13px] font-bold ${row.colorClass}`}>Total : <span className="font-inter">{formatNum(rowTotal)}</span> kg</span>
                  </CardHeader>
                  <CardContent className="px-2 pb-2 flex-1 flex flex-col">
                    {!hasStock ? (
                      <div className="flex-1 flex items-center justify-center py-4">
                        <p className="text-xs text-gray-400 italic">No stock recorded yet.</p>
                      </div>
                    ) : (
                      <div className="w-full border border-gray-300 rounded-lg bg-white divide-y divide-gray-200 overflow-hidden">
                        {FABRIC_STOCK_SIZES.filter((size) => row.stockBySize[size] !== undefined).map((size) => (
                          <div key={size} className="flex items-center justify-between px-3 py-2 text-[13px]">
                            <span className="font-semibold text-gray-600">{size}</span>
                            <span className="font-bold font-inter text-gray-900">{formatNum(row.stockBySize[size])} kg</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WastageCard({
  looseWaste,
  lums,
  extruderWasteByColor,
  loomsWasteByColor,
  fabricWasteByColor,
}: {
  looseWaste: number;
  lums: number;
  extruderWasteByColor: { color: string; lums: number; yarnWaste: number }[];
  loomsWasteByColor: { color: string; loomsWaste: number }[];
  fabricWasteByColor: { color: string; fabricWaste: number; bitWaste: number }[];
}) {
  const loomsWasteTotal = loomsWasteByColor.reduce((sum, r) => sum + r.loomsWaste, 0);
  const fabricWasteTotal = fabricWasteByColor.reduce((sum, r) => sum + r.fabricWaste + r.bitWaste, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {/* Extruder Wastage */}
      <Card className="bg-[#00897B]/5 border border-[#B8DCD0] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5! pt-2 px-3 border-b border-[#B8DCD0]">
            <CardTitle className="text-[17px] font-extrabold text-[#0B5566] flex items-center gap-3">
              {/* <div className="bg-[#0B5566] border text-white w-6 h-6 rounded-[4px] flex items-center justify-center text-xs font-bold shadow-sm">1</div> */}
              Extruder Wastage
            </CardTitle>
            <span className="text-[13px] font-bold text-[#0B5566]">Total : <span className="font-inter">{formatNum(lums + looseWaste)}</span> kg</span>
          </CardHeader>
          <CardContent className="px-2 pb-2 flex flex-col">
            {extruderWasteByColor.length === 0 ? (
              <div className="w-full border border-gray-400 rounded-lg py-4">
                <p className="text-center text-xs text-gray-400 italic">No extruder wastage recorded yet.</p>
              </div>
            ) : (
              <div className="w-full">
                {/* Color header row */}
                <div className="flex items-center px-2 py-2">
                  <span className="w-20 shrink-0" />
                  {extruderWasteByColor.map((row) => (
                    <span key={row.color} className={`flex-1 text-center font-bold text-[13.5px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center border border-gray-400 rounded-md px-2 py-2 bg-white">
                    <span className="w-20 shrink-0 font-semibold text-gray-700 text-[13px]">Lums Waste</span>
                    {extruderWasteByColor.map((row) => (
                      <span key={row.color} className="flex-1 text-center font-inter text-gray-900">{row.lums > 0 ? formatNum(row.lums) : '--'}</span>
                    ))}
                  </div>
                  <div className="flex items-center border border-gray-400 rounded-md px-3 py-2 bg-white">
                    <span className="w-20 shrink-0 font-semibold text-gray-700 text-[13px]">Loose Waste</span>
                    {extruderWasteByColor.map((row) => (
                      <span key={row.color} className="flex-1 text-center font-inter text-gray-900">{row.yarnWaste > 0 ? formatNum(row.yarnWaste) : '--'}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
      </Card>

      {/* Looms Wastage */}
      <Card className="bg-[#004D40]/5 border border-[#B8D8D5] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5! pt-2 px-3 border-b border-[#B8D8D5]">
            <CardTitle className="text-[17px] font-extrabold text-[#7A6A00] flex items-center gap-3">
              {/* <div className="bg-[#7A6A00] border text-white w-6 h-6 rounded-[4px] flex items-center justify-center text-xs font-bold shadow-sm">2</div> */}
              Looms Wastage
            </CardTitle>
            <span className="text-[13px] font-bold text-[#7A6A00]">Total : <span className="font-inter">{formatNum(loomsWasteTotal)}</span> kg</span>
          </CardHeader>
          <CardContent className="px-2 pb-2 flex flex-col">
            {loomsWasteByColor.length === 0 ? (
              <div className="w-full border border-gray-400 rounded-lg py-4">
                <p className="text-center text-xs text-gray-400 italic">No looms wastage recorded yet.</p>
              </div>
            ) : (
              <div className="w-full overflow-hidden">
                <div className="flex items-center px-2 py-2">
                  <span className="w-24 shrink-0" />
                  {loomsWasteByColor.map((row) => (
                    <span key={row.color} className={`flex-1 text-center font-bold text-[13.5px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                  ))}
                </div>
                <div className="">
                  <div className="flex items-center border border-gray-400 rounded-md px-2 py-2 bg-white">
                    <span className="w-24 shrink-0 font-semibold text-gray-700 text-[13px]">Looms Waste</span>
                    {loomsWasteByColor.map((row) => (
                      <span key={row.color} className="flex-1 text-center font-inter text-gray-900">{row.loomsWaste > 0 ? formatNum(row.loomsWaste) : '--'}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
      </Card>

      {/* Fabric Checking Wastage */}
      <Card className="bg-[#004D40]/5 border border-[#C5D8C2] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5! pt-2 px-3 border-b border-[#C5D8C2]">
            <CardTitle className="text-[17px] font-extrabold text-[#2F6B2F] flex items-center gap-3">
              {/* <div className="bg-[#2F6B2F] border text-white w-6 h-6 rounded-[4px] flex items-center justify-center text-xs font-bold shadow-sm">3</div> */}
              Fabric Checking Wastage
            </CardTitle>
            <span className="text-[13px] font-bold text-[#2F6B2F]">Total : <span className="font-inter">{formatNum(fabricWasteTotal)}</span> kg</span>
          </CardHeader>
          <CardContent className="px-2 pb-2 flex flex-col">
            {fabricWasteByColor.length === 0 ? (
              <div className="w-full border border-gray-400 rounded-lg py-4">
                <p className="text-center text-xs text-gray-400 italic">No fabric checking wastage recorded yet.</p>
              </div>
            ) : (
              <div className="w-full">
                <div className="flex items-center px-3 py-2">
                  <span className="w-24 shrink-0" />
                  {fabricWasteByColor.map((row) => (
                    <span key={row.color} className={`flex-1 text-center font-bold text-[13.5px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center border border-gray-400 rounded-md px-2 py-2 bg-white">
                    <span className="w-24 shrink-0 font-semibold text-gray-700 text-[13px]">Fabric Waste</span>
                    {fabricWasteByColor.map((row) => (
                      <span key={row.color} className="flex-1 text-center font-inter text-gray-900">{row.fabricWaste > 0 ? formatNum(row.fabricWaste) : '--'}</span>
                    ))}
                  </div>
                  <div className="flex items-center border border-gray-400 rounded-md px-2 py-2 bg-white">
                    <span className="w-24 shrink-0 font-semibold text-gray-700 text-[13px]">Bit Waste</span>
                    {fabricWasteByColor.map((row) => (
                      <span key={row.color} className="flex-1 text-center font-inter text-gray-900">{row.bitWaste > 0 ? formatNum(row.bitWaste) : '--'}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
      </Card>
    </div>
  );
}

