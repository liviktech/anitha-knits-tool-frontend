import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
} from 'recharts';
import { ChevronDown, ChevronRight, Package, Users, Wallet, Gauge, Calendar, TrendingUp, IndianRupee } from 'lucide-react';
import { useLoadSentRecords, type LoadSentRecord } from '@/features/inventory/load-sent-queries';
import extruderIcon from '@/assets/extruder-icon.png';
import loomsIcon from '@/assets/looms-icon.png';
import { Loader } from '@/components/shared/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDayWiseProduction } from '@/features/production/day-wise-queries';
import { useInventoryRecords, type InventoryType } from '@/features/inventory/inventory-queries';
import { useLookups } from '@/lib/lookups';
import {
  mockEmployeeSnapshot,
  mockAttendanceTrend,
  mockExpenseBreakdown,
  mockRawMaterialIntake,
} from './mock-data';

// Fixed categorical order (light-surface steps) — see the dataviz skill's
// validated default palette. Identity stays consistent per stage everywhere.
const STAGE_COLOR = {
  extruder: '#800000', // Extruder Red
  looms: '#7A6A00', // Looms Yellow
  fabric: '#2F6B2F', // Fabric Green
};
const STAGE_GRADIENT = {
  rawMaterial: 'from-slate-400 to-slate-600',
  extruder: 'from-[#FF8080] to-[#800000]',
  looms: 'from-[#FFD700] to-[#7A6A00]',
  fabric: 'from-[#66B266] to-[#2F6B2F]',
};
const EXPENSE_COLORS = ['#F2BB13', '#EB4345', '#12B2CB', '#B8C926'];

const CHART_ANIM = { animationDuration: 1100, animationEasing: 'ease-out' as const };

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const fabricDeliveredSizes = ['150cm', '160cm', '170cm', '180cm', '190cm'] as const;

function deliveryColorClass(color: string): string {
  const normalizedColor = color.toLowerCase();
  if (normalizedColor === 'blue') return 'text-[#0088CC]';
  if (normalizedColor === 'green') return 'text-[#5BA300]';
  return 'text-gray-700';
}

function getFabricDeliveredRows(data: unknown, date: string) {
  const records = (data ?? []) as LoadSentRecord[];
  return records
    .filter((record) => (record.productionDate ?? record.date ?? '').startsWith(date))
    .map((record: any) => ({
      id: record.id,
      size: record.size?.name ?? '',
      color: record.color?.name ?? '',
      delivered: record.loadSent?.fabricWeight ?? record.fabricWeight ?? record.weightKg ?? 0,
      original: record as LoadSentRecord,
    }))
    .filter((record) => record.delivered > 0);
}

function getFabricDeliveredTableRows(rows: any[]) {
  const byColor = new Map<string, any>();
  rows.forEach((record) => {
    const size = fabricDeliveredSizes.includes(record.size) ? record.size : null;
    const existing = byColor.get(record.color) ?? { color: record.color, colorClass: deliveryColorClass(record.color), deliveredBySize: {} };
    if (size) existing.deliveredBySize[size] = (existing.deliveredBySize[size] ?? 0) + record.delivered;
    byColor.set(record.color, existing);
  });
  return Array.from(byColor.values());
}

export function DashboardDesign2() {
  const { rows, apiSummary, isLoading } = useDayWiseProduction();
  const { data: inventoryData, isLoading: isInvLoading } = useInventoryRecords('?limit=100');
  const { data: loadSentData, isLoading: loadingLoadSent } = useLoadSentRecords('?limit=100');
  const { data: lookupsData } = useLookups();

  const [isFabricDeliveredExpanded, setIsFabricDeliveredExpanded] = useState(true);

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

  // Mock Data for Fabric Delivered
  const selectedMonthDeliveryTableRows = [
    {
      color: 'White',
      colorClass: deliveryColorClass('White'),
      deliveredBySize: { '150cm': 120.5, '160cm': 45.2, '170cm': 0, '180cm': 89.0, '190cm': 12.4 }
    },
    {
      color: 'Blue',
      colorClass: deliveryColorClass('Blue'),
      deliveredBySize: { '150cm': 0, '160cm': 210.0, '170cm': 55.5, '180cm': 0, '190cm': 0 }
    },
    {
      color: 'Green',
      colorClass: deliveryColorClass('Green'),
      deliveredBySize: { '150cm': 30.0, '160cm': 0, '170cm': 100.0, '180cm': 40.0, '190cm': 0 }
    }
  ];

  const deliveredColorTotals = {
    white: Object.values(selectedMonthDeliveryTableRows[0].deliveredBySize).reduce((a, b) => a + b, 0),
    blue: Object.values(selectedMonthDeliveryTableRows[1].deliveredBySize).reduce((a, b) => a + b, 0),
    green: Object.values(selectedMonthDeliveryTableRows[2].deliveredBySize).reduce((a, b) => a + b, 0),
  };

  const selectedMonthDeliveryTotal = deliveredColorTotals.white + deliveredColorTotals.blue + deliveredColorTotals.green;

  const trend = useMemo(() => {
    // 30 days of mock trend data
    const mockData = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(5, 10);

      // Generate somewhat realistic-looking sequential data
      const baseExtruder = 600 + Math.sin(i * 0.5) * 100;
      const baseLooms = baseExtruder * 0.85 + Math.cos(i * 0.3) * 50;
      const baseFabric = baseLooms * 0.9 + Math.sin(i * 0.7) * 30;

      mockData.push({
        date: dateStr,
        Extruder: Math.round(baseExtruder),
        Looms: Math.round(baseLooms),
        Fabric: Math.round(baseFabric),
      });
    }
    return mockData;
  }, []);

  const extruder = apiSummary?.extruder;
  const looms = apiSummary?.looms;
  const fabric = apiSummary?.fabricChecking;

  const processDetailsMock = [
    { name: 'Week 1', Extruder: 10, Looms: 5, Fabric: 8 },
    { name: 'Week 2', Extruder: 8, Looms: 8, Fabric: 4 },
    { name: 'Week 3', Extruder: 15, Looms: 10, Fabric: 5 },
    { name: 'Week 4', Extruder: 10, Looms: 14, Fabric: 8 },
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader size="xl" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-white">
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

      <div className="relative z-10 p-2.5 md:p-2.5 flex flex-col gap-3 bg-[#F4F1E8]">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-2 px-3">Production Overview</h1>
          </div>
        </div>

        {/* Inventory Summary Mini Cards */}
        <div className="py-3 bg-gradient-to-br from-gray-50 to-green-50/20 rounded-xl" style={{ fontFamily: "'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* HDPE Card */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-200 transition-colors flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <img src="/hdpe.png" alt="" className="w-26 h-26 object-contain" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className=""><img src="/hdpe.png" alt="HDPE" className="w-12 h-12 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">HDPE Materials</h3>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-none">{rawMaterials.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {rawMaterials.items.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-1">
                    {rawMaterials.items.map(item => (
                      <div key={item.name} className="flex flex-col gap-0.5 text-sm">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-bold text-gray-900">{item.weight.toFixed(2)}<span className="text-gray-400 font-normal text-[10px] ml-0.5">kg</span></span>
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
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className=""><img src="/chemical.png" alt="Chemicals" className="w-12 h-12 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">Chemicals</h3>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-none">{chemicals.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {chemicals.items.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-1">
                    {chemicals.items.map(item => (
                      <div key={item.name} className="flex flex-col gap-0.5 text-sm">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-bold text-gray-900">{item.weight.toFixed(2)}<span className="text-gray-400 font-normal text-[10px] ml-0.5">kg</span></span>
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
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className=""><img src="/color.png" alt="Colors" className="w-12 h-12 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">Colors</h3>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-none">{invColors.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {invColors.items.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-1">
                    {invColors.items.map(item => (
                      <div key={item.name} className="flex flex-col gap-0.5 text-sm">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-bold text-gray-900">{item.weight.toFixed(2)}<span className="text-gray-400 font-normal text-[10px] ml-0.5">kg</span></span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-xs text-gray-400 italic">No colors this month</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Delivered Stocks Horizontal Bar */}
        <div className="bg-gray-100 border border-gray-400 rounded-[10px] px-5 py-2.5 shadow-sm flex flex-col transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-[28px] h-[28px] bg-[#235347]"
                style={{
                  WebkitMaskImage: 'url(/delivery.png)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: 'url(/delivery.png)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center'
                }}
              />
              <span className="font-bold text-[#235347] text-[22px]">Fabric Delivered</span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-12 transition-opacity duration-300 ${isFabricDeliveredExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-[#61401E] uppercase tracking-wide">White </span>
                  <span className="font-bold  text-[#61401E] text-[20px]">{formatNum(deliveredColorTotals.white)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-[#0088CC] uppercase tracking-wide">Blue</span>
                  <span className="font-bold text-[#0088CC] text-[20px]">{formatNum(deliveredColorTotals.blue)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-[#5BA300] uppercase tracking-wide">Green</span>
                  <span className="font-bold text-[#5BA300] text-[20px]">{formatNum(deliveredColorTotals.green)}</span>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-[#61401E] cursor-pointer transition-transform duration-300 ${isFabricDeliveredExpanded ? 'rotate-180' : ''}`}
                onClick={() => setIsFabricDeliveredExpanded(!isFabricDeliveredExpanded)}
              />
            </div>
          </div>

          <div className={`grid transition-all duration-300 ease-in-out ${isFabricDeliveredExpanded ? 'grid-rows-[1fr] mt-3 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="border border-[#d9a976] rounded-md overflow-hidden bg-white/60 shadow-inner">
                <table className="w-full text-[13px] text-left">
                  <thead className="bg-[#e6b885]/30 font-extrabold text-[#61401E]">
                    <tr>
                      <th className="px-3 py-2 border-r border-[#d9a976] w-24"></th>
                      {fabricDeliveredSizes.map((size) => (
                        <th key={size} className="px-3 py-2 border-r border-[#d9a976] text-center">{size}</th>
                      ))}
                      <th className="px-3 py-2 text-center bg-[#e6b885]/40">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLoadSent ? (
                      <tr><td colSpan={7} className="px-3 py-5 text-center text-[#61401E]">Loading delivered records...</td></tr>
                    ) : selectedMonthDeliveryTableRows.length === 0 ? (
                      <tr><td colSpan={7} className="px-3 py-5 text-center text-[#61401E]">No delivered records for this month.</td></tr>
                    ) : selectedMonthDeliveryTableRows.map((row: any) => (
                      <tr key={row.color} className="border-t border-[#d9a976]">
                        <td className={`px-3 py-2.5 border-r border-[#d9a976] font-bold ${row.colorClass}`}>{row.color}</td>
                        {fabricDeliveredSizes.map((size) => (
                          <td key={size} className="px-3 py-2.5 border-r border-[#d9a976] text-center text-gray-800 font-medium">
                            {row.deliveredBySize[size] !== undefined ? row.deliveredBySize[size].toFixed(3) : '--'}
                          </td>
                        ))}
                        <td className={`px-3 py-2.5 text-center font-bold bg-[#e6b885]/10 ${row.colorClass}`}>
                          {Object.values(row.deliveredBySize).reduce((sum: any, value: any) => sum + value, 0).toFixed(3)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#d9a976] bg-[#e6b885]/30">
                      <td className="px-3 py-2.5 border-r border-[#d9a976] font-extrabold text-[#61401E]">TOTAL</td>
                      {fabricDeliveredSizes.map((size) => (
                        <td key={size} className="px-3 py-2.5 border-r border-[#d9a976] text-center text-[#61401E] font-bold">
                          {selectedMonthDeliveryTableRows.reduce((sum, row: any) => sum + (row.deliveredBySize[size] ?? 0), 0) > 0
                            ? selectedMonthDeliveryTableRows.reduce((sum, row: any) => sum + (row.deliveredBySize[size] ?? 0), 0).toFixed(3)
                            : '--'}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center text-[#61401E] font-extrabold bg-[#e6b885]/50">{selectedMonthDeliveryTotal.toFixed(3)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* KPI hero strip */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard index={0} gradient={STAGE_GRADIENT.rawMaterial} icon={<Package className="w-5 h-5 text-white" />} label="Raw Material In (KG)" value={mockRawMaterialIntake.receivedThisMonthKg} decimals={0} sub={`from ${mockRawMaterialIntake.source}`} valueColor="text-slate-900" />
          <KpiCard index={1} gradient={STAGE_GRADIENT.extruder} icon={<img src={extruderIcon} alt="" className="w-4 h-4 object-contain" />} chip label="Extruder Output (KG)" value={extruder?.outputKg ?? 0} sub={`${(extruder?.efficiencyPct ?? 0).toFixed(1)}% efficiency`} valueColor="text-[#800000]" />
          <KpiCard index={2} gradient={STAGE_GRADIENT.looms} icon={<img src={loomsIcon} alt="" className="w-4 h-4 object-contain" />} chip label="Looms Output (MTRS)" value={looms?.outputKg ?? 0} sub={`${(looms?.efficiencyPct ?? 0).toFixed(1)}% efficiency`} valueColor="text-[#7A6A00]" />
          <KpiCard index={3} gradient={STAGE_GRADIENT.fabric} icon={<Gauge className="w-5 h-5 text-white" />} label="Fabric Output (MTRS)" value={fabric?.outputKg ?? 0} sub={`${(fabric?.efficiencyPct ?? 0).toFixed(1)}% efficiency`} valueColor="text-[#2F6B2F]" />
        </div> */}



        {/* Trend + efficiency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
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
        </div>

        {/* Employees + Expenses (mock) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
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
                        label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
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
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  gradient,
  icon,
  chip,
  label,
  value,
  decimals = 2,
  sub,
  valueColor,
  index = 0,
}: {
  gradient: string;
  icon: React.ReactNode;
  chip?: boolean;
  label: string;
  value: number;
  decimals?: number;
  sub: string;
  valueColor: string;
  index?: number;
}) {
  const animated = useCountUp(value);

  return (
    <Card
      className="group bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm mb-3 transition-transform duration-300 group-hover:scale-110`}>
        {chip ? <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center">{icon}</span> : icon}
      </div>
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
      <p className={`text-[26px] font-extrabold leading-none tabular-nums ${valueColor}`}>
        {animated.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </p>
      <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>
    </Card>
  );
}

function FunnelNode({ gradient, icon, chip, label, value }: { gradient: string; icon: React.ReactNode; chip?: boolean; label: string; value: string }) {
  return (
    <div className="flex-1 flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 transition-all duration-300 hover:bg-white hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5">
      <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
        {chip ? <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center">{icon}</span> : icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{label}</p>
        <p className="text-[13px] font-bold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="hidden sm:flex items-center justify-center px-0.5 text-slate-300">
      <ChevronRight className="w-4 h-4 motion-safe:[animation:dashFlow_1.4s_ease-in-out_infinite]" />
    </div>
  );
}
