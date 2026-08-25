import type { ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Boxes,
  Layers,
  FlaskConical,
  Palette,
  Trash2,
  Truck,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Bell,
  CalendarDays,
  ArrowUpRight,
  ArrowRight,
  Package,
  Gauge,
  Scroll,
  RefreshCw,
} from 'lucide-react';
import extruderIcon from '@/assets/extruder-icon.png';
import loomsIcon from '@/assets/looms-icon.png';
import fabricRolls from '@/assets/fabric-rolls.png';
import wastageBin from '@/assets/wastage-bin.png';
import deliveryTruck from '@/assets/delivery-truck.png';
import {
  rawMaterialStock,
  fabricStock,
  wastageStock,
  fabricDelivered,
  productionOverview,
  lastUpdated,
  dashboardDate,
} from './overview-data';

const kg = (n: number, d = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export function DashboardOverview() {
  return (
    <div id="dashboard-overview" className="flex min-h-full flex-col bg-[#F7F8FA]">
      <style>{`
        #dashboard-overview, #dashboard-overview * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif; }
      `}</style>

      <DashboardHeader />

      <div className="flex-1 p-4 md:p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RawMaterialCard />
          <FabricStockCard />
          <WastageCard />
          <DeliveredCard />
        </div>

        <ProductionOverviewSection />

        <LastUpdatedStrip />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- header --- */

function DashboardHeader() {
  return (
    <header className="flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-gray-900">Dashboard</h1>
        <p className="text-[13.5px] font-medium text-gray-500">Overview of inventory &amp; production</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-gray-800 transition-colors hover:bg-gray-50"
        >
          <CalendarDays className="h-4 w-4 text-gray-500" strokeWidth={1.75} />
          {dashboardDate}
          <ChevronDown className="h-4 w-4 text-gray-400" strokeWidth={2} />
        </button>

        <button
          type="button"
          className="relative flex items-center gap-1 rounded-xl px-1.5 py-2 text-gray-600 transition-colors hover:bg-gray-50"
          aria-label="5 unread notifications"
        >
          <Bell className="h-[22px] w-[22px] text-[#C2410C]" strokeWidth={1.75} />
          <span className="absolute -top-0.5 left-3.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
            5
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" strokeWidth={2} />
        </button>

        <button
          type="button"
          className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-gray-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#046A38] text-[14px] font-bold text-white">
            M
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[13.5px] font-semibold text-gray-900">Manager</span>
            <span className="block text-[12px] font-medium text-gray-500">Anitha Knits</span>
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------ card shell --- */

function SectionCard({
  icon,
  iconBg,
  title,
  subtitle,
  headerFrom,
  children,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  headerFrom: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className={`flex items-center gap-3 bg-gradient-to-r ${headerFrom} to-white px-4 py-3.5`}>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16.5px] font-bold leading-tight text-gray-900">{title}</h2>
          <p className="text-[12.5px] font-medium text-gray-500">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-label={`${title} options`}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3">{children}</div>
    </section>
  );
}

/* --------------------------------------------------------- raw materials --- */

function RawMaterialCard() {
  const [hdpe, chemicals, colors] = rawMaterialStock.groups;

  return (
    <SectionCard
      icon={<Boxes className="h-6 w-6 text-[#15803D]" strokeWidth={1.75} />}
      iconBg="bg-[#F0FDF4]"
      headerFrom="from-[#F3FBF4]"
      title="Raw Material Stock"
      subtitle={`Total ${rawMaterialStock.totalCategories} Categories`}
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200">
        <div className="grid flex-1 grid-cols-1 sm:grid-cols-2">
          <div className="border-gray-200 p-4 sm:border-r">
            <MaterialGroup
              icon={<Layers className="h-[18px] w-[18px] text-[#2563EB]" strokeWidth={2} />}
              iconBg="bg-[#EFF6FF]"
              group={hdpe}
            />
          </div>
          <div className="flex flex-col divide-y divide-gray-200 border-t border-gray-200 sm:border-t-0">
            <div className="p-4">
              <MaterialGroup
                icon={<FlaskConical className="h-[18px] w-[18px] text-[#EA580C]" strokeWidth={2} />}
                iconBg="bg-[#FFF7ED]"
                group={chemicals}
              />
            </div>
            <div className="p-4">
              <MaterialGroup
                icon={<Palette className="h-[18px] w-[18px] text-[#9333EA]" strokeWidth={2} />}
                iconBg="bg-[#FAF5FF]"
                group={colors}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-[#FAFBFC] px-4 py-3">
          <span className="text-[13.5px] font-semibold text-gray-600">Total Raw Material</span>
          <span className="text-[17px] font-bold text-[#15803D]">
            {kg(rawMaterialStock.totalKg)} <span className="text-[12px] font-semibold text-gray-500">kg</span>
          </span>
        </div>
      </div>
    </SectionCard>
  );
}

function MaterialGroup({
  icon,
  iconBg,
  group,
}: {
  icon: ReactNode;
  iconBg: string;
  group: (typeof rawMaterialStock.groups)[number];
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</span>
        <span className="flex-1 text-[15px] font-bold text-gray-900">{group.name}</span>
        <span className="text-[16px] font-bold text-gray-900">
          {kg(group.totalKg)} <span className="text-[11.5px] font-semibold text-gray-500">kg</span>
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 pl-2">
        {group.items.map((item) => (
          <li key={item.name} className="flex items-center gap-2 text-[13px]">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="flex-1 font-medium text-gray-600">{item.name}</span>
            <span className="font-semibold text-gray-700">
              {kg(item.kg)} <span className="text-[11px] font-medium text-gray-500">kg</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------- fabric stock --- */

function FabricStockCard() {
  const donut = fabricStock.topColors.map((c) => ({ name: c.name, value: c.kg, fill: c.color }));

  return (
    <SectionCard
      icon={<Scroll className="h-6 w-6 text-[#2563EB]" strokeWidth={1.75} />}
      iconBg="bg-[#EFF6FF]"
      headerFrom="from-[#F2F7FE]"
      title="Fabric Stock"
      subtitle="Current Available"
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr]">
          <div className="flex items-center gap-2 border-gray-200 p-4 sm:border-r">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1D4ED8]">Total Fabric Stock</p>
              <p className="mt-1 whitespace-nowrap text-[27px] font-bold leading-none text-gray-900">
                {kg(fabricStock.totalKg)} <span className="text-[13px] font-semibold text-gray-500">kg</span>
              </p>
            </div>
            <img
              src={fabricRolls || "/placeholder.svg"}
              alt="Stacked rolls of knitted fabric"
              className="ml-auto h-24 w-auto shrink-0 object-contain mix-blend-multiply"
            />
          </div>

          <div className="flex flex-col divide-y divide-gray-200 border-t border-gray-200 sm:border-t-0">
            <MiniStat
              label="Total Rolls"
              value={fabricStock.totalRolls.toString()}
              icon={<Boxes className="h-[18px] w-[18px] text-[#2563EB]" strokeWidth={2} />}
              iconBg="bg-[#EFF6FF]"
            />
            <MiniStat
              label="Total Colors"
              value={fabricStock.totalColors.toString()}
              icon={<Palette className="h-[18px] w-[18px] text-[#0D9488]" strokeWidth={2} />}
              iconBg="bg-[#F0FDFA]"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col border-t border-gray-200 p-4">
          <p className="text-[13px] font-semibold text-[#1D4ED8]">Top Colors in Stock</p>
          <div className="mt-2 flex flex-1 items-center gap-4">
            <ul className="flex flex-1 flex-col gap-2.5">
              {fabricStock.topColors.map((c) => (
                <li key={c.name} className="flex items-center gap-2.5 text-[13.5px]">
                  <span
                    className="h-[11px] w-[11px] shrink-0 rounded-full"
                    style={{ background: c.color }}
                  />
                  <span className="flex-1 font-medium text-gray-700">{c.name}</span>
                  <span className="font-semibold text-gray-800">
                    {kg(c.kg)} <span className="text-[11px] font-medium text-gray-500">kg</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="h-[104px] w-[104px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={30}
                    outerRadius={52}
                    startAngle={90}
                    endAngle={-270}
                    stroke="#fff"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function MiniStat({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-[#1D4ED8]">{label}</p>
        <p className="text-[22px] font-bold leading-tight text-gray-900">{value}</p>
      </div>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</span>
    </div>
  );
}

/* --------------------------------------------------------------- wastage --- */

function WastageCard() {
  return (
    <SectionCard
      icon={<Trash2 className="h-6 w-6 text-[#EA580C]" strokeWidth={1.75} />}
      iconBg="bg-[#FFF7ED]"
      headerFrom="from-[#FEF6F0]"
      title="Wastage Stock"
      subtitle="Today Overview"
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr]">
          <div className="flex items-center gap-2 border-gray-200 p-4 sm:border-r">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-500">Total Wastage</p>
              <p className="mt-1 whitespace-nowrap text-[27px] font-bold leading-none text-gray-900">
                {kg(wastageStock.totalKg)} <span className="text-[13px] font-semibold text-gray-500">kg</span>
              </p>
            </div>
            <img
              src={wastageBin || "/placeholder.svg"}
              alt="Bin filled with fabric wastage"
              className="ml-auto h-[92px] w-auto shrink-0 object-contain mix-blend-multiply"
            />
          </div>

          <div className="flex flex-col divide-y divide-gray-200 border-t border-gray-200 sm:border-t-0">
            <div className="flex-1 px-4 py-3">
              <p className="text-[13px] font-semibold text-gray-500">Today Wastage</p>
              <p className="text-[22px] font-bold leading-tight text-gray-900">
                {kg(wastageStock.todayKg)} <span className="text-[12px] font-semibold text-gray-500">kg</span>
              </p>
            </div>
            <div className="flex-1 px-4 py-3">
              <p className="text-[12.5px] font-medium text-gray-500">vs Yesterday</p>
              <p className="flex items-center gap-1 text-[17px] font-bold text-[#DC2626]">
                +{wastageStock.vsYesterdayPct}%
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col border-t border-gray-200 p-4">
          <p className="text-[14px] font-semibold text-gray-700">Wastage By Type</p>
          <ul className="mt-2.5 flex flex-col gap-3">
            {wastageStock.byType.map((t) => (
              <li key={t.name} className="flex items-center gap-2.5 text-[13.5px]">
                <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-[#F97316]" />
                <span className="flex-1 font-medium text-gray-700">{t.name}</span>
                <span className="font-semibold text-gray-800">
                  {kg(t.kg)} <span className="text-[11px] font-medium text-gray-500">kg</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------- delivered --- */

function DeliveredCard() {
  return (
    <SectionCard
      icon={<Truck className="h-6 w-6 text-[#15803D]" strokeWidth={1.75} />}
      iconBg="bg-[#F0FDF4]"
      headerFrom="from-[#F3FBF4]"
      title="Fabric Delivered"
      subtitle="Delivery Overview"
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200">
        <div className="flex items-start gap-2 p-4 pb-0">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-500">Total Delivered</p>
            <p className="mt-1 whitespace-nowrap text-[27px] font-bold leading-none text-gray-900">
              {kg(fabricDelivered.totalKg)} <span className="text-[13px] font-semibold text-gray-500">kg</span>
            </p>
          </div>
          <img
            src={deliveryTruck || "/placeholder.svg"}
            alt="Delivery truck"
            className="ml-auto h-[76px] w-auto shrink-0 object-contain mix-blend-multiply"
          />
        </div>

        <div className="mx-4 mt-3 grid grid-cols-2 border-t border-gray-200">
          <div className="border-r border-gray-200 py-3 pr-4">
            <p className="text-[13px] font-semibold text-gray-500">Total Orders</p>
            <p className="text-[22px] font-bold leading-tight text-gray-900">{fabricDelivered.totalOrders}</p>
          </div>
          <div className="py-3 pl-4">
            <p className="text-[13px] font-semibold text-gray-500">This Month</p>
            <p className="text-[22px] font-bold leading-tight text-gray-900">
              {kg(fabricDelivered.thisMonthKg)} <span className="text-[12px] font-semibold text-gray-500">kg</span>
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col border-t border-gray-200 p-4">
          <p className="text-[14px] font-semibold text-gray-700">Delivered by Color</p>

          <table className="mt-2 w-full">
            <thead>
              <tr className="border-b border-gray-200 text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                <th className="pb-1.5 text-left font-bold">Color</th>
                <th className="pb-1.5 text-right font-bold">Delivered (kg)</th>
                <th className="pb-1.5 text-right font-bold">Orders</th>
              </tr>
            </thead>
            <tbody>
              {fabricDelivered.byColor.map((c) => (
                <tr key={c.name} className="text-[13.5px]">
                  <td className="py-[7px]">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="h-[11px] w-[11px] shrink-0 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span className="font-medium text-gray-700">{c.name}</span>
                    </span>
                  </td>
                  <td className="py-[7px] text-right font-semibold text-gray-800">{kg(c.kg)}</td>
                  <td className="py-[7px] text-right font-semibold text-gray-800">{c.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B4A2F] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0F5C3B]"
          >
            <span className="flex-1 text-center">View Delivery Details</span>
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

/* --------------------------------------------------- production overview --- */

function ProductionOverviewSection() {
  const { rawMaterialInKg, rawMaterialSource, extruder, looms, fabric } = productionOverview;

  return (
    <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <h2 className="text-[17px] font-bold text-gray-900">Production Overview</h2>
      <p className="text-[12.5px] font-medium text-gray-500">
        Raw material → extruder → looms → fabric, at a glance.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={<Package className="h-[18px] w-[18px] text-[#475569]" strokeWidth={2} />}
          iconBg="bg-[#F1F5F9]"
          label="Raw Material In (KG)"
          value={rawMaterialInKg.toLocaleString('en-US')}
          valueColor="text-gray-900"
          sub={`from ${rawMaterialSource}`}
        />
        <KpiTile
          icon={<img src={extruderIcon || "/placeholder.svg"} alt="" className="h-[18px] w-[18px] object-contain" />}
          iconBg="bg-[#EFF6FF]"
          label="Extruder Output (KG)"
          value={kg(extruder.outputKg)}
          valueColor="text-[#2563EB]"
          sub={`${extruder.efficiencyPct}% efficiency`}
        />
        <KpiTile
          icon={<img src={loomsIcon || "/placeholder.svg"} alt="" className="h-[18px] w-[18px] object-contain" />}
          iconBg="bg-[#FFF7ED]"
          label="Looms Output (MTRS)"
          value={kg(looms.outputMtrs)}
          valueColor="text-[#EA580C]"
          sub={`${looms.efficiencyPct}% efficiency`}
        />
        <KpiTile
          icon={<Gauge className="h-[18px] w-[18px] text-[#0D9488]" strokeWidth={2} />}
          iconBg="bg-[#F0FDFA]"
          label="Fabric Output (MTRS)"
          value={kg(fabric.outputMtrs)}
          valueColor="text-[#0D9488]"
          sub={`${fabric.efficiencyPct}% efficiency`}
        />
      </div>

      <div className="mt-3 rounded-xl border border-gray-200 bg-[#FAFBFC] p-3">
        <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
          Production Flow
        </p>
        <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          <FlowNode
            icon={<Package className="h-[17px] w-[17px] text-[#475569]" strokeWidth={2} />}
            iconBg="bg-[#F1F5F9]"
            label="Raw Material"
            value={`${rawMaterialInKg.toLocaleString('en-US')} kg`}
          />
          <FlowArrow />
          <FlowNode
            icon={<img src={extruderIcon || "/placeholder.svg"} alt="" className="h-[17px] w-[17px] object-contain" />}
            iconBg="bg-[#EFF6FF]"
            label="Extruder"
            value={`${kg(extruder.outputKg, 1)} kg`}
          />
          <FlowArrow />
          <FlowNode
            icon={<img src={loomsIcon || "/placeholder.svg"} alt="" className="h-[17px] w-[17px] object-contain" />}
            iconBg="bg-[#FFF7ED]"
            label="Looms"
            value={`${looms.outputMtrs.toLocaleString('en-US')} m`}
          />
          <FlowArrow />
          <FlowNode
            icon={<Gauge className="h-[17px] w-[17px] text-[#0D9488]" strokeWidth={2} />}
            iconBg="bg-[#F0FDFA]"
            label="Fabric / Nets"
            value={`${fabric.outputMtrs.toLocaleString('en-US')} m`}
          />
        </div>
      </div>
    </section>
  );
}

function KpiTile({
  icon,
  iconBg,
  label,
  value,
  valueColor,
  sub,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  valueColor: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
          <p className={`mt-1 text-[24px] font-bold leading-none tabular-nums ${valueColor}`}>{value}</p>
          <p className="mt-1.5 text-[11.5px] font-medium text-gray-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function FlowNode({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="truncate text-[14px] font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex shrink-0 items-center justify-center text-gray-300 lg:px-0.5">
      <ChevronRight className="h-4 w-4 rotate-90 lg:rotate-0" strokeWidth={2.5} />
    </div>
  );
}

/* ---------------------------------------------------------- last updated --- */

function LastUpdatedStrip() {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-[#F0FDF4] px-4 py-3">
      <CalendarDays className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-gray-600">Last Updated</p>
        <p className="text-[13px] font-medium text-gray-500">{lastUpdated}</p>
      </div>
      <button
        type="button"
        aria-label="Refresh dashboard data"
        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-800"
      >
        <RefreshCw className="h-4.5 w-4.5" strokeWidth={2} />
      </button>
    </div>
  );
}
