import { useState } from 'react';
import '@fontsource-variable/hanken-grotesk';
import { RefreshCw, Factory, Trash2, FlaskConical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Loader } from '@/components/shared/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMonthlyDashboard } from './dashboard-queries';
import { useAuth } from '@/features/auth/auth-context';
import { currentMonthStr as todayMonthStr } from '@/lib/date-utils';
import { useOpeningBalanceWastage, useOpeningBalanceFabricStock, useOpeningBalanceRawMaterials } from '@/features/admin-panel/opening-balance-queries';
import { ProductionSummaryCard, DetailBreakdownCard, SectionSummaryCard, RawMaterialsSection, RawMaterialCard } from './card';

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
  const { user } = useAuth();
  const companyName = user?.kind === 'company-user' ? user.company.name : 'LK Knits';
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'production' | 'wastage' | 'sample'>('production');
  const currentMonthStr = format(filterDate, 'yyyy-MM');

  const handleRefresh = () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    setTimeout(() => {
      setIsManualRefreshing(false);
    }, 2000);
  };

  const { dashboardData, isLoading: loadingDashboard } = useMonthlyDashboard(currentMonthStr);

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
  const extruderWasteByColor = FABRIC_COLORS.map(color => {
    const r = extruderByColorMap.get(color);
    const ob = obWastageByColor.get(color) || { lums: 0, loose: 0 };
    return { color, lums: (r?.lumsKg ?? 0) + ob.lums, yarnWaste: (r?.yarnWasteKg ?? 0) + ob.loose };
  });

  const extruderByVariantMap = new Map((dashboardData?.extruderProduction?.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
  const extruderWasteByVariant = FABRIC_COLORS.map(color => {
    const sizes = FABRIC_STOCK_SIZES.map(size => {
      const variantKey = `${color}_${size}`;
      const r = extruderByVariantMap.get(variantKey);
      return { size, lums: r?.lumsKg ?? 0, yarnWaste: r?.yarnWasteKg ?? 0 };
    });
    return { color, sizes };
  });

  const extruderSummaryByColor = FABRIC_COLORS.map(color => {
    const r = extruderByColorMap.get(color);
    return { color, production: r?.production ?? 0 };
  });
  const extruderGrandTotal = dashboardData?.extruderProduction?.overall.production || 0;

  const loomsByColorMap = new Map((dashboardData?.loomsProduction?.byColor || []).map(r => [r.color.name, r]));
  const loomsWasteByColor = FABRIC_COLORS.map(color => {
    const r = loomsByColorMap.get(color);
    const ob = obWastageByColor.get(color) || { looms: 0 };
    return { color, loomsWaste: (r?.waste ?? 0) + ob.looms };
  });

  const loomsByVariantMap = new Map((dashboardData?.loomsProduction?.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
  const loomsWasteByVariant = FABRIC_COLORS.map(color => {
    const sizes = FABRIC_STOCK_SIZES.map(size => {
      const variantKey = `${color}_${size}`;
      const r = loomsByVariantMap.get(variantKey);
      return { size, loomsWaste: r?.waste ?? 0 };
    });
    return { color, sizes };
  });

  const loomsSummaryByColor = FABRIC_COLORS.map(color => {
    const r = loomsByColorMap.get(color);
    return { color, production: r?.production ?? 0 };
  });
  const loomsGrandTotal = dashboardData?.loomsProduction?.overall.production || 0;

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
  const fabricWasteByVariant = FABRIC_COLORS.map(color => {
    const sizes = FABRIC_STOCK_SIZES.map(size => {
      const variantKey = `${color}_${size}`;
      const r = fabricByVariantMap.get(variantKey);
      return { size, fabricWaste: r?.fwWasteKg ?? 0, bitWaste: r?.bwWasteKg ?? 0 };
    });
    return { color, sizes };
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
      row.stockBySize[r.size.name] = (row.stockBySize[r.size.name] || 0) + r.availableFabricStockKg;
    });

    obFabricStock.forEach(r => {
      if (r.color?.name && r.size?.name) {
        const colorName = r.color.name.trim();
        const normalizedColor = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase();
        const row = getRow(normalizedColor);
        row.stockBySize[r.size.name] = (row.stockBySize[r.size.name] || 0) + r.fabricStockKg;
      }
    });
    return Array.from(byColor.values());
  })();
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
        kg: item.loadSent?.fabricWeight ?? 0,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return { color, deliveries, total: deliveries.reduce((sum, d) => sum + d.kg, 0) };
  });
  const selectedMonthDeliveryTotal = dashboardData?.loadSent.totals.fabricWeightKg || 0;
  const loadingLoadSent = isLoading;

  // Production Summary / Fabric Stock / Fabric Delivered — shared verbatim between the
  // "Production Summary" and "Sample Production" tabs at the user's request.
  const renderProductionSummary = () => (
    <>
      {/* Production Summary (Extruder / Looms / Fabric) */}
      <div className="font-hanken bg-white rounded-2xl border border-gray-400 shadow-sm p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <ProductionSummaryCard
            title="Extruder Production"
            total={extruderGrandTotal}
            rows={extruderSummaryByColor}
            rowLabelClassName="text-[13.5px]"
            theme={{ cardBg: 'bg-[#00897B]/5', cardBorder: 'border-[#B8DCD0]', titleColor: 'text-[#0B5566]', totalColor: 'text-[#0B5566]' }}
          />

          <ProductionSummaryCard
            title="Looms Production"
            total={loomsGrandTotal}
            rows={loomsSummaryByColor}
            rowLabelClassName="text-[13px]"
            theme={{ cardBg: 'bg-[#004D40]/5', cardBorder: 'border-[#B8D8D5]', titleColor: 'text-[#7A6A00]', totalColor: 'text-[#7A6A00]' }}
          />

          <ProductionSummaryCard
            title="Fabric Checking"
            total={fabricGrandTotal}
            rows={fabricSummaryByColor}
            rowLabelClassName="text-[13px]"
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
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={colorTotal}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={row.sizes.filter((s) => s.balance > 0).map((s) => ({ label: s.size, value: s.balance }))}
                emptyMessage="No yarn balance recorded yet."
                layout="boxed"
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
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={colorTotal}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={row.sizes.filter((s) => s.balance > 0).map((s) => ({ label: s.size, value: s.balance }))}
                emptyMessage="No kora balance recorded yet."
                layout="boxed"
              />
            );
          })}
        </SectionSummaryCard>
      </div>

      {/* Fabric Stock (own horizontal section) */}
      <div className="w-full">
        <FabricStockCard rows={fabricStockByColor} total={totalFabricStockKg} />
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
            return (
              <DetailBreakdownCard
                key={row.color}
                title={row.color}
                total={row.total}
                theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
                rows={row.deliveries.map((d) => ({ id: d.id, label: d.size, value: d.kg }))}
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
                <div className="border-b border-gray-400 px-3">
                  <TabsList variant="underline" className="border-b-0">
                    <TabsTrigger value="production">
                      <span className="flex items-center gap-1 text-[15px] font-extrabold">
                        <Factory className="h-4  w-4" strokeWidth={1.75} />
                        Production Summary
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="wastage">
                      <span className="flex items-center gap-1 text-[15px] font-extrabold">
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        Wastage Summary
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="sample">
                      <span className="flex items-center gap-1 text-[15px] font-extrabold">
                        <FlaskConical className="h-4.5 w-4.5" strokeWidth={1.75} />
                        Sample Production
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="production" className="flex flex-col gap-4">
                  {renderProductionSummary()}
                </TabsContent>

                <TabsContent value="wastage" className="flex flex-col gap-2">
                  <div className="font-hanken bg-white rounded-2xl border border-gray-400 shadow-sm p-2">
                    <WastageCard
                      looseWaste={looseWasteKg}
                      lums={lumsWasteKg}
                      extruderWasteByColor={extruderWasteByColor}
                      extruderWasteByVariant={extruderWasteByVariant}
                      loomsWasteByColor={loomsWasteByColor}
                      loomsWasteByVariant={loomsWasteByVariant}
                      fabricWasteByColor={fabricWasteByColor}
                      fabricWasteByVariant={fabricWasteByVariant}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="sample" className="flex flex-col gap-2">
                  {renderProductionSummary()}
                </TabsContent>
              </Tabs>
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
    <SectionSummaryCard title="Fabric Stock" total={total} isEmpty={rows.length === 0} emptyMessage="No fabric stock records yet.">
      {rows.map((row) => {
        const rowTotal = Object.values(row.stockBySize).reduce((s, v) => s + v, 0);
        const theme = fabricStockCardTheme(row.color);
        const sizeRows = FABRIC_STOCK_SIZES
          .filter((size) => row.stockBySize[size] !== undefined)
          .map((size) => ({ label: size, value: row.stockBySize[size] }));
        return (
          <DetailBreakdownCard
            key={row.color}
            title={row.color}
            total={rowTotal}
            theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: row.colorClass }}
            rows={sizeRows}
            emptyMessage="No stock recorded yet."
          />
        );
      })}
    </SectionSummaryCard>
  );
}

function WastageCard({
  looseWaste,
  lums,
  extruderWasteByColor,
  extruderWasteByVariant,
  loomsWasteByColor,
  loomsWasteByVariant,
  fabricWasteByColor,
  fabricWasteByVariant,
}: {
  looseWaste: number;
  lums: number;
  extruderWasteByColor: { color: string; lums: number; yarnWaste: number }[];
  extruderWasteByVariant: { color: string; sizes: { size: string; lums: number; yarnWaste: number }[] }[];
  loomsWasteByColor: { color: string; loomsWaste: number }[];
  loomsWasteByVariant: { color: string; sizes: { size: string; loomsWaste: number }[] }[];
  fabricWasteByColor: { color: string; fabricWaste: number; bitWaste: number }[];
  fabricWasteByVariant: { color: string; sizes: { size: string; fabricWaste: number; bitWaste: number }[] }[];
}) {
  const loomsWasteTotal = loomsWasteByColor.reduce((sum, r) => sum + r.loomsWaste, 0);
  const fabricWasteTotal = fabricWasteByColor.reduce((sum, r) => sum + r.fabricWaste + r.bitWaste, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {/* Extruder Wastage */}
      <Card className="bg-[#00897B]/5 border border-[#B8DCD0] rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5! pt-2 px-3 border-b border-[#B8DCD0]">
          <CardTitle className="text-[17px] font-extrabold text-[#0B5566] flex items-center gap-3">
            Extruder Wastage
          </CardTitle>
          <span className="text-[14px] font-bold text-[#0B5566]">Total : <span className="font-inter">{formatNum(lums + looseWaste)}</span> kg</span>
        </CardHeader>
        <CardContent className="px-2 pb-2 flex flex-col">
          <div className="w-full">
            {/* Color header row */}
            <div className="flex items-center px-2 py-1.5 border-b border-gray-200/60 mb-1">
              <span className="w-16 shrink-0" />
              {extruderWasteByVariant.map((row) => (
                <div key={row.color} className="flex-1 flex flex-col items-center">
                  <span className={`font-bold text-[13.5px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                  <div className="flex w-full mt-1">
                    <span className="flex-1 text-center text-[10px] font-semibold text-gray-400 uppercase" title="Lums Waste">LM</span>
                    <span className="flex-1 text-center text-[10px] font-semibold text-gray-400 uppercase border-l border-gray-200/60" title="Loose/Yarn Waste">LO</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {['150cm', '160cm', '170cm', '180cm', '190cm'].map(size => (
                <div key={size} className="flex items-center border border-gray-300/80 rounded-md px-2 py-1.5 bg-white">
                  <span className="w-16 shrink-0 font-semibold text-gray-600 text-[12px]">{size}</span>
                  {extruderWasteByVariant.map(colorGroup => {
                    const match = colorGroup.sizes.find(s => s.size === size);
                    return (
                      <div key={colorGroup.color} className="flex-1 flex items-center">
                        <span className="flex-1 text-center font-inter text-gray-800 text-[12.5px]">{match?.lums ? formatNum(match.lums) : '--'}</span>
                        <span className="flex-1 text-center font-inter text-gray-800 text-[12.5px] border-l border-gray-200/80">{match?.yarnWaste ? formatNum(match.yarnWaste) : '--'}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Total row */}
              <div className="flex items-center rounded-md px-2 py-1.5 bg-[#E8F5F3] border border-[#B8DCD0] mt-1.5">
                <span className="w-16 shrink-0 font-extrabold text-[#0B5566] text-[12px]">Total</span>
                {extruderWasteByColor.map(row => (
                  <div key={row.color} className="flex-1 flex items-center">
                    <span className="flex-1 text-center font-inter font-bold text-[#0B5566] text-[12.5px]">{formatNum(row.lums)}</span>
                    <span className="flex-1 text-center font-inter font-bold text-[#0B5566] text-[12.5px] border-l border-[#B8DCD0]">{formatNum(row.yarnWaste)}</span>
                  </div>
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
            Looms Wastage
          </CardTitle>
          <span className="text-[14px] font-bold text-[#7A6A00]">Total : <span className="font-inter">{formatNum(loomsWasteTotal)}</span> kg</span>
        </CardHeader>
        <CardContent className="px-2 pb-2 flex flex-col">
          <div className="w-full overflow-hidden">
            {/* Color header row */}
            <div className="flex items-center px-2 py-1.5 border-b border-gray-200/60 mb-1">
              <span className="w-16 shrink-0" />
              {loomsWasteByVariant.map((row) => (
                <div key={row.color} className="flex-1 flex flex-col items-center">
                  <span className={`font-bold text-[13.5px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {['150cm', '160cm', '170cm', '180cm', '190cm'].map(size => (
                <div key={size} className="flex items-center border border-gray-300/80 rounded-md px-2 py-1.5 bg-white">
                  <span className="w-16 shrink-0 font-semibold text-gray-600 text-[12px]">{size}</span>
                  {loomsWasteByVariant.map(colorGroup => {
                    const match = colorGroup.sizes.find(s => s.size === size);
                    return (
                      <span key={colorGroup.color} className="flex-1 text-center font-inter text-gray-800 text-[12.5px]">
                        {match?.loomsWaste ? formatNum(match.loomsWaste) : '--'}
                      </span>
                    );
                  })}
                </div>
              ))}

              {/* Total row */}
              <div className="flex items-center rounded-md px-2 py-1.5 bg-[#FFF8E0] border border-[#E8D870] mt-1.5">
                <span className="w-16 shrink-0 font-extrabold text-[#7A6A00] text-[12px]">Total</span>
                {loomsWasteByColor.map(row => (
                  <span key={row.color} className="flex-1 text-center font-inter font-bold text-[#7A6A00] text-[12.5px]">
                    {formatNum(row.loomsWaste)}
                  </span>
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
            <div className="flex items-center px-2 py-1.5 border-b border-gray-200/60 mb-1">
              <span className="w-16 shrink-0" />
              {fabricWasteByColor.map((row) => (
                <div key={row.color} className="flex-1 flex flex-col items-center">
                  <span className={`font-bold text-[13.5px] ${deliveryColorClass(row.color)}`}>{row.color}</span>
                  <div className="flex w-full mt-1">
                    <span className="flex-1 text-center text-[10px] font-semibold text-gray-400 uppercase" title="Fabric Waste">FW</span>
                    <span className="flex-1 text-center text-[10px] font-semibold text-gray-400 uppercase border-l border-gray-200/60" title="Bit Waste">BW</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {['150cm', '160cm', '170cm', '180cm', '190cm'].map(size => (
                <div key={size} className="flex items-center border border-gray-300/80 rounded-md px-2 py-1.5 bg-white">
                  <span className="w-16 shrink-0 font-semibold text-gray-600 text-[12px]">{size}</span>
                  {fabricWasteByVariant.map(colorGroup => {
                    const match = colorGroup.sizes.find(s => s.size === size);
                    return (
                      <div key={colorGroup.color} className="flex-1 flex items-center">
                        <span className="flex-1 text-center font-inter text-gray-800 text-[12.5px]">{match?.fabricWaste ? formatNum(match.fabricWaste) : '--'}</span>
                        <span className="flex-1 text-center font-inter text-gray-800 text-[12.5px] border-l border-gray-200/80">{match?.bitWaste ? formatNum(match.bitWaste) : '--'}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="flex items-center rounded-md px-2 py-1.5 bg-[#F4F8F4] border border-[#C5D8C2] mt-1.5">
                <span className="w-16 shrink-0 font-extrabold text-[#2F6B2F] text-[12px]">Total</span>
                {fabricWasteByColor.map(row => (
                  <div key={row.color} className="flex-1 flex items-center">
                    <span className="flex-1 text-center font-inter font-bold text-[#2F6B2F] text-[12.5px]">{row.fabricWaste ? formatNum(row.fabricWaste) : '--'}</span>
                    <span className="flex-1 text-center font-inter font-bold text-[#2F6B2F] text-[12.5px] border-l border-[#C5D8C2]">{row.bitWaste ? formatNum(row.bitWaste) : '--'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

