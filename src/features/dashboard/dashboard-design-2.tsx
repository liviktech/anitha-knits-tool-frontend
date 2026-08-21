import { useMemo } from 'react';
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
} from 'recharts';
import { ChevronRight, Package, Users, Wallet, Gauge, Sparkles } from 'lucide-react';
import extruderIcon from '@/assets/extruder-icon.png';
import loomsIcon from '@/assets/looms-icon.png';
import { Loader } from '@/components/shared/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDayWiseProduction } from '@/features/production/day-wise-queries';
import {
  mockEmployeeSnapshot,
  mockAttendanceTrend,
  mockExpenseBreakdown,
  mockRawMaterialIntake,
} from './mock-data';

// Fixed categorical order (light-surface steps) — see the dataviz skill's
// validated default palette. Identity stays consistent per stage everywhere.
const STAGE_COLOR = {
  extruder: '#2a78d6', // categorical slot 1 (blue)
  looms: '#eb6834', // categorical slot 2 (orange)
  fabric: '#1baf7a', // categorical slot 3 (aqua)
};
const STAGE_GRADIENT = {
  rawMaterial: 'from-slate-400 to-slate-600',
  extruder: 'from-blue-500 to-indigo-600',
  looms: 'from-orange-400 to-amber-600',
  fabric: 'from-emerald-400 to-teal-600',
};
const EXPENSE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function DashboardDesign2() {
  const { rows, apiSummary, isLoading } = useDayWiseProduction();

  const trend = useMemo(
    () =>
      rows
        .slice(0, 30)
        .slice()
        .reverse()
        .map((r) => ({
          date: r.date.slice(5),
          Extruder: r.extruder.output,
          Looms: r.looms.output,
          Fabric: r.fabric.output,
        })),
    [rows],
  );

  const extruder = apiSummary?.extruder;
  const looms = apiSummary?.looms;
  const fabric = apiSummary?.fabricChecking;

  const efficiencyRings = [
    { name: 'Extruder', value: extruder?.efficiencyPct ?? (extruder ? 100 - extruder.wastePct : 0), fill: STAGE_COLOR.extruder },
    { name: 'Looms', value: looms?.efficiencyPct ?? (looms ? 100 - looms.wastePct : 0), fill: STAGE_COLOR.looms },
    { name: 'Fabric', value: fabric?.efficiencyPct ?? (fabric ? 100 - fabric.wastePct : 0), fill: STAGE_COLOR.fabric },
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
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-64 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative z-10 p-4 md:p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm shadow-indigo-200">
                <Sparkles className="w-3 h-3" /> Executive Pulse
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-2">Production Overview</h1>
            <p className="text-[13px] text-slate-500">Raw material → extruder → looms → fabric, at a glance.</p>
          </div>
        </div>

        {/* KPI hero strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard gradient={STAGE_GRADIENT.rawMaterial} icon={<Package className="w-5 h-5 text-white" />} label="Raw Material In (KG)" value={formatNum(mockRawMaterialIntake.receivedThisMonthKg)} sub={`from ${mockRawMaterialIntake.source}`} valueColor="text-slate-900" />
          <KpiCard gradient={STAGE_GRADIENT.extruder} icon={<img src={extruderIcon} alt="" className="w-4 h-4 object-contain" />} chip label="Extruder Output (KG)" value={formatNum(extruder?.outputKg ?? 0)} sub={`${(extruder?.efficiencyPct ?? 0).toFixed(1)}% efficiency`} valueColor="text-blue-600" />
          <KpiCard gradient={STAGE_GRADIENT.looms} icon={<img src={loomsIcon} alt="" className="w-4 h-4 object-contain" />} chip label="Looms Output (MTRS)" value={formatNum(looms?.outputKg ?? 0)} sub={`${(looms?.efficiencyPct ?? 0).toFixed(1)}% efficiency`} valueColor="text-orange-600" />
          <KpiCard gradient={STAGE_GRADIENT.fabric} icon={<Gauge className="w-5 h-5 text-white" />} label="Fabric Output (MTRS)" value={formatNum(fabric?.outputKg ?? 0)} sub={`${(fabric?.efficiencyPct ?? 0).toFixed(1)}% efficiency`} valueColor="text-emerald-600" />
        </div>

        {/* Process funnel */}
        <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">Production Flow</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <FunnelNode gradient={STAGE_GRADIENT.rawMaterial} icon={<Package className="w-4 h-4 text-white" />} label="Raw Material" value={`${formatNum(mockRawMaterialIntake.receivedThisMonthKg)} kg`} />
            <Connector />
            <FunnelNode gradient={STAGE_GRADIENT.extruder} icon={<img src={extruderIcon} alt="" className="w-3 h-3 object-contain" />} chip label="Extruder" value={`${formatNum(extruder?.outputKg ?? 0)} kg`} />
            <Connector />
            <FunnelNode gradient={STAGE_GRADIENT.looms} icon={<img src={loomsIcon} alt="" className="w-3 h-3 object-contain" />} chip label="Looms" value={`${formatNum(looms?.outputKg ?? 0)} m`} />
            <Connector />
            <FunnelNode gradient={STAGE_GRADIENT.fabric} icon={<Gauge className="w-4 h-4 text-white" />} label="Fabric / Nets" value={`${formatNum(fabric?.outputKg ?? 0)} m`} />
          </div>
        </Card>

        {/* Trend + efficiency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5">
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
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  <Area type="monotone" dataKey="Extruder" stroke={STAGE_COLOR.extruder} strokeWidth={2} fill="url(#fillExtruder)" />
                  <Area type="monotone" dataKey="Looms" stroke={STAGE_COLOR.looms} strokeWidth={2} fill="none" />
                  <Area type="monotone" dataKey="Fabric" stroke={STAGE_COLOR.fabric} strokeWidth={2} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-[13px] font-bold text-slate-900">Stage Efficiency</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={efficiencyRings}
                  innerRadius="30%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={6} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} formatter={((v: number) => `${v.toFixed(1)}%`) as any} />
                  <Legend
                    iconType="circle"
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: 11, color: '#64748b' }}
                    formatter={(value: string) => {
                      const ring = efficiencyRings.find((r) => r.name === value);
                      return `${value} — ${ring ? ring.value.toFixed(1) : 0}%`;
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Employees + Expenses (mock) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5">
            <CardHeader className="p-0 mb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-white" />
                </span>
                Employees <span className="text-[10px] font-medium text-slate-400 normal-case">(illustrative)</span>
              </CardTitle>
              <div className="text-right">
                <p className="text-[18px] font-extrabold text-slate-900 leading-none">{mockEmployeeSnapshot.presentToday}/{mockEmployeeSnapshot.totalEmployees}</p>
                <p className="text-[10px] text-slate-400">present today</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockAttendanceTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e1e0d9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} width={36} domain={[60, 90]} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="present" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3, fill: '#4f46e5' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4 md:p-5">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-white" />
                </span>
                Expenses <span className="text-[10px] font-medium text-slate-400 normal-case">(illustrative)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-48 flex items-center gap-4">
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie data={mockExpenseBreakdown} dataKey="amount" nameKey="category" innerRadius={40} outerRadius={68} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                    {mockExpenseBreakdown.map((entry, i) => (
                      <Cell key={entry.category} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} formatter={((v: number) => formatCurrency(v)) as any} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-1.5">
                {mockExpenseBreakdown.map((e, i) => (
                  <div key={e.category} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                      {e.category}
                    </span>
                    <span className="font-semibold text-slate-900">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
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
  sub,
  valueColor,
}: {
  gradient: string;
  icon: React.ReactNode;
  chip?: boolean;
  label: string;
  value: string;
  sub: string;
  valueColor: string;
}) {
  return (
    <Card className="bg-white border border-slate-100 shadow-lg shadow-slate-200/50 rounded-3xl p-4">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm mb-3`}>
        {chip ? <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center">{icon}</span> : icon}
      </div>
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
      <p className={`text-[26px] font-extrabold leading-none ${valueColor}`}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>
    </Card>
  );
}

function FunnelNode({ gradient, icon, chip, label, value }: { gradient: string; icon: React.ReactNode; chip?: boolean; label: string; value: string }) {
  return (
    <div className="flex-1 flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
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
      <ChevronRight className="w-4 h-4" />
    </div>
  );
}
