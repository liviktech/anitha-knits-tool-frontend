import { useState } from 'react';
import '@fontsource-variable/hanken-grotesk';
import { RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Loader } from '@/components/shared/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMonthlyDashboard } from './dashboard-queries';
import { useExtruderProductions, useLookups } from '@/features/extruder/extruder-queries';
import { useInventoryRecords, sumInventoryWeight } from '@/features/inventory/inventory-queries';

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const currentMonthStr = format(filterDate, 'yyyy-MM');

  const handleRefresh = () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    setTimeout(() => {
      setIsManualRefreshing(false);
    }, 2000);
  };

  const { dashboardData, isLoading: loadingDashboard } = useMonthlyDashboard(currentMonthStr);

  // Raw Materials balances — all-time received minus all-time production consumption, the
  // same client-side calculation the "Add New Daily Production Details" page's Inventory
  // Balances panel uses (new-entry.tsx), so both places stay in sync as production is recorded.
  const { data: lookupsData } = useLookups();
  const lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const { data: allInvData } = useInventoryRecords('?limit=100');
  const { data: allExtruderData } = useExtruderProductions('?limit=100');
  const inventoryRecords = allInvData?.data ?? [];
  const extruderRecords = allExtruderData?.data ?? [];

  // Balances shown on these cards are stock levels, not ledgers — they never
  // display below 0.00 even if consumption momentarily outpaces recorded receipts.
  const getHDPEBalance = (name: string) =>
    Math.max(0, sumInventoryWeight(inventoryRecords, 'HDPE', name)
      - extruderRecords.filter(r => r.extruder?.brand?.name === name).reduce((sum, r) => sum + (r.extruder?.rawMaterialKg ?? 0), 0));

  const getChemicalBalance = (name: string) =>
    Math.max(0, sumInventoryWeight(inventoryRecords, 'CHEMICAL', name)
      - extruderRecords.filter(r => r.extruder?.chemical?.name === name).reduce((sum, r) => sum + (r.extruder?.chemicalKg ?? 0), 0));

  const getColorBalance = (name: string) =>
    Math.max(0, sumInventoryWeight(inventoryRecords, 'COLOR', name)
      - extruderRecords.filter(r => r.color?.name === name).reduce((sum, r) => sum + (r.extruder?.colorConsumedKg ?? 0), 0));

  const isLoading = loadingDashboard;

  const looseWasteKg = dashboardData?.wastage.byType.find(w => w.code === 'YARN_WASTE')?.quantityKg || 0;
  const lumsWasteKg = dashboardData?.wastage.byType.find(w => w.code === 'LUMPS')?.quantityKg || 0;

  // Statically listed by color (like fabricWasteByColor below) so every card always shows
  // all colors with "--" for anything not yet recorded, instead of an empty-state message.
  const extruderByColorMap = new Map((dashboardData?.extruderProduction || []).map(r => [r.color.name, r]));
  const extruderWasteByColor = FABRIC_COLORS.map(color => {
    const r = extruderByColorMap.get(color);
    return { color, lums: r?.lumsKg ?? 0, yarnWaste: r?.yarnWasteKg ?? 0 };
  });
  const extruderSummaryByColor = FABRIC_COLORS.map(color => {
    const r = extruderByColorMap.get(color);
    return { color, production: r?.production ?? 0 };
  });
  const extruderGrandTotal = extruderSummaryByColor.reduce((sum, row) => sum + row.production, 0);

  const loomsByColorMap = new Map((dashboardData?.loomsProduction || []).map(r => [r.color.name, r]));
  const loomsWasteByColor = FABRIC_COLORS.map(color => {
    const r = loomsByColorMap.get(color);
    return { color, loomsWaste: r?.waste ?? 0 };
  });
  const loomsSummaryByColor = FABRIC_COLORS.map(color => {
    const r = loomsByColorMap.get(color);
    return { color, production: r?.production ?? 0 };
  });
  const loomsGrandTotal = loomsSummaryByColor.reduce((sum, row) => sum + row.production, 0);

  const fabricByColorMap = new Map((dashboardData?.fabricProduction.byColor || []).map(r => [r.color.name, r]));
  const fabricWasteByColor = FABRIC_COLORS.map(color => {
    const r = fabricByColorMap.get(color);
    return { color, fabricWaste: r?.fwWasteKg ?? 0, bitWaste: r?.bwWasteKg ?? 0 };
  });
  const fabricSummaryByColor = FABRIC_COLORS.map(color => {
    const r = fabricByColorMap.get(color);
    return {
      color,
      production: r?.production ?? 0,
      waste: (r?.fwWasteKg ?? 0) + (r?.bwWasteKg ?? 0),
      total: r?.total ?? 0,
    };
  });
  const fabricGrandTotal = dashboardData?.fabricProduction.overall.outputKg || 0;

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
    (dashboardData?.stockBalance || []).forEach(r => {
      const row = getRow(r.color.name);
      row.stockBySize[r.size.name] = r.availableFabricStockKg;
    });
    return Array.from(byColor.values());
  })();
  const totalFabricStockKg = fabricStockByColor.reduce(
    (sum, row) => sum + Object.values(row.stockBySize).reduce((s, v) => s + v, 0),
    0,
  );

  const rawMaterials = {
    weight: lookups.brands.reduce((sum, b) => sum + getHDPEBalance(b.name), 0),
    items: lookups.brands.map(b => ({ name: b.name, weight: getHDPEBalance(b.name) })),
  };
  const chemicals = {
    weight: lookups.chemicals.reduce((sum, c) => sum + getChemicalBalance(c.name), 0),
    items: lookups.chemicals.map(c => ({ name: c.name, weight: getChemicalBalance(c.name) })),
  };
  const invColors = {
    weight: lookups.colors.reduce((sum, c) => sum + getColorBalance(c.name), 0),
    items: lookups.colors.map(c => ({ name: c.name, weight: getColorBalance(c.name) })),
  };

  const monthDeliveriesByColor = FABRIC_COLORS.map(color => {
    const deliveries = (dashboardData?.loadSent.items || [])
      .filter(item => item.color.name === color)
      .map(item => ({
        id: item.id,
        date: item.productionDate,
        size: item.size.name,
        kg: item.loadSent?.fabricWeight ?? 0,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return { color, deliveries, total: deliveries.reduce((sum, d) => sum + d.kg, 0) };
  });
  const selectedMonthDeliveryTotal = dashboardData?.loadSent.totals.fabricWeightKg || 0;
  const loadingLoadSent = isLoading;

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
            <h1 className="text-[22px] font-bold text-black leading-tight px-1">Welcome to LK Knits</h1>
            {/* <p className="text-[12px] font-medium text-gray-600 leading-tight mt-0.5">Production overview</p> */}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={format(filterDate, 'yyyy-MM')}
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
                    <div className={`flex flex-wrap items-center gap-x-12 gap-y-3 mt-1 ${rawMaterials.items.length === 1 ? 'justify-center' : 'justify-start'}`}>
                      {rawMaterials.items.map(item => (
                        <div key={item.name} className={`flex flex-col gap-0.5 text-sm ${rawMaterials.items.length === 1 ? 'items-center text-center' : 'items-start text-left'}`}>
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
                    <div className={`flex flex-wrap items-center gap-x-12 gap-y-3 mt-px ${chemicals.items.length === 1 ? 'justify-center' : 'justify-start'}`}>
                      {chemicals.items.map(item => (
                        <div key={item.name} className={`flex flex-col gap-0.5 text-sm ${chemicals.items.length === 1 ? 'items-center text-center' : 'items-start text-left'}`}>
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
                    <div className={`flex flex-wrap items-center gap-x-12 gap-y-3 mt-1 ${invColors.items.length === 1 ? 'justify-center' : 'justify-start'}`}>
                      {invColors.items.map(item => (
                        <div key={item.name} className={`flex flex-col gap-0.5 text-sm ${invColors.items.length === 1 ? 'items-center text-center' : 'items-start text-left'}`}>
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
          <div className="font-hanken bg-white rounded-2xl border border-gray-400 shadow-sm p-2.5 mt-4">
            <p className="font-bold text-xl px-0.5 text-left pb-3">Production Summary</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <Card className="bg-[#00897B]/5 border border-[#B8DCD0] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
                <CardHeader className="flex flex-row items-center justify-between pb-1! pt-3 px-4">
                  <CardTitle className="text-[17px] font-extrabold text-[#0B5566] flex items-center gap-3">
                    Extruder Production
                  </CardTitle>
                  <span className="text-[14px] font-bold text-[#0B5566]">Total : <span className="font-inter">{formatNum(extruderGrandTotal)}</span> kg</span>
                </CardHeader>
                <CardContent className="px-2 pb-2 pt-0 flex flex-col">
                  <div className="w-full">
                    <div className="space-y-2">
                      {extruderSummaryByColor.map((row) => (
                        <div key={row.color} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                          <span className={`font-semibold text-[13.5px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                          <span className="font-bold font-inter text-gray-900">{row.production > 0 ? `${formatNum(row.production)} kg` : '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#004D40]/5 border border-[#B8D8D5] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
                <CardHeader className="flex flex-row items-center justify-between pb-1! pt-3 px-4">
                  <CardTitle className="text-[17px] font-extrabold text-[#7A6A00] flex items-center gap-3">
                    Looms Production
                  </CardTitle>
                  <span className="text-[14px] font-bold text-[#7A6A00]">Total : <span className="font-inter">{formatNum(loomsGrandTotal)}</span> kg</span>
                </CardHeader>
                <CardContent className="px-2 pb-2 pt-0 flex flex-col">
                  <div className="w-full">
                    <div className="space-y-2">
                      {loomsSummaryByColor.map((row) => (
                        <div key={row.color} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                          <span className={`font-semibold text-[13px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                          <span className="font-bold font-inter text-gray-900">{row.production > 0 ? `${formatNum(row.production)} kg` : '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#004D40]/5 border border-[#C5D8C2] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
                <CardHeader className="flex flex-row items-center justify-between pb-1! pt-3 px-4">
                  <CardTitle className="text-[17px] font-extrabold text-[#2F6B2F] flex items-center gap-3">
                    Fabric Checking
                  </CardTitle>
                  <span className="text-[14px] font-bold text-[#2F6B2F]">Total : <span className="font-inter">{formatNum(fabricGrandTotal)}</span> kg</span>
                </CardHeader>
                <CardContent className="px-2 pb-2 pt-0 flex flex-col">
                  <div className="w-full">
                    <div className="space-y-2">
                      {fabricSummaryByColor.map((row) => (
                        <div key={row.color} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                          <span className={`font-semibold text-[13px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                          <span className="font-bold font-inter text-gray-900">{row.production > 0 ? `${formatNum(row.production)} kg` : '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Wastage */}
          <div className="font-hanken bg-white rounded-2xl border border-gray-400 shadow-sm p-2 mt-4">
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
            <Card className="font-hanken w-full bg-white border border-gray-400 shadow-lg shadow-slate-200/50 rounded-3xl p-2 md:p-2 gap-2 flex flex-col transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 fill-mode-both mt-2">
              <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-gray-400 pt-0 pb-0!">
                <CardTitle className="font-hanken font-bold text-xl px-1">
                  {/* <div
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
              /> */}
                  Fabric Delivered
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-bold text-[#2F6B2F] px-2">Total : <span className="font-inter">{formatNum(selectedMonthDeliveryTotal)}</span> kg</span>
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
                              {row.color}
                            </CardTitle>
                            <span className={`text-[14px] font-bold ${deliveryColorClass(row.color)}`}>Total : <span className="font-inter">{formatNum(row.total)}</span> kg</span>
                          </CardHeader>
                          <CardContent className="px-2 pb-2 flex-1 flex flex-col">
                            {row.deliveries.length === 0 ? (
                              <div className="flex-1 flex items-center justify-center py-4">
                                <p className="text-xs text-gray-400 italic">No deliveries recorded yet.</p>
                              </div>
                            ) : (
                              <div className="w-full border border-gray-300 rounded-lg bg-white divide-y divide-gray-200 overflow-hidden">
                                {row.deliveries.map((d) => (
                                  <div key={d.id} className="flex items-center justify-between px-3 py-2 text-[13px]">
                                    <span className="font-semibold text-gray-600">{d.size}</span>
                                    <span className="font-bold font-inter text-gray-900">{formatNum(d.kg)} kg</span>
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
          </div>






        </div>
        )}
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
    <Card className="font-hanken bg-white border border-gray-400 shadow-lg shadow-slate-200/50 rounded-3xl p-2 md:p-2 gap-2 flex flex-col transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 fill-mode-both mt-2">
      <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-gray-400 pt-0 pb-0!">
        <CardTitle className="font-hanken font-bold text-xl px-1">
          {/* <img src="/stock.png" alt="" className="w-6 h-6 object-contain" /> */}
          Fabric Stock
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-[#2F6B2F] px-2">Total : <span className="font-inter">{formatNum(total)}</span> kg</span>
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
                      {row.color}
                    </CardTitle>
                    <span className={`text-[14px] font-bold ${row.colorClass}`}>Total : <span className="font-inter">{formatNum(rowTotal)}</span> kg</span>
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
          <span className="text-[14px] font-bold text-[#0B5566]">Total : <span className="font-inter">{formatNum(lums + looseWaste)}</span> kg</span>
        </CardHeader>
        <CardContent className="px-2 pb-2 flex flex-col">
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
        </CardContent>
      </Card>

      {/* Looms Wastage */}
      <Card className="bg-[#004D40]/5 border border-[#B8D8D5] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5! pt-2 px-3 border-b border-[#B8D8D5]">
          <CardTitle className="text-[17px] font-extrabold text-[#7A6A00] flex items-center gap-3">
            {/* <div className="bg-[#7A6A00] border text-white w-6 h-6 rounded-[4px] flex items-center justify-center text-xs font-bold shadow-sm">2</div> */}
            Looms Wastage
          </CardTitle>
          <span className="text-[14px] font-bold text-[#7A6A00]">Total : <span className="font-inter">{formatNum(loomsWasteTotal)}</span> kg</span>
        </CardHeader>
        <CardContent className="px-2 pb-2 flex flex-col">
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
        </CardContent>
      </Card>

      {/* Fabric Checking Wastage */}
      <Card className="bg-[#004D40]/5 border border-[#C5D8C2] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5! pt-2 px-3 border-b border-[#C5D8C2]">
          <CardTitle className="text-[17px] font-extrabold text-[#2F6B2F] flex items-center gap-3">
            {/* <div className="bg-[#2F6B2F] border text-white w-6 h-6 rounded-[4px] flex items-center justify-center text-xs font-bold shadow-sm">3</div> */}
            Fabric Checking Wastage
          </CardTitle>
          <span className="text-[14px] font-bold text-[#2F6B2F]">Total : <span className="font-inter">{formatNum(fabricWasteTotal)}</span> kg</span>
        </CardHeader>
        <CardContent className="px-2 pb-2 flex flex-col">
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
        </CardContent>
      </Card>
    </div>
  );
}

