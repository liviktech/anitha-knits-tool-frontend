import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronUp,
  ChevronDown,
  ShoppingBasket,
  FlaskConical,
  Palette,
  Ruler,
  Pencil,
  Trash2,
  Plus,
  Trash,
  Layers,
  Coins,
  Truck,
  Factory,
  Building2,
  Grid3x3,
  PackageOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProductionHeader } from './production-details';
import {
  entriesByTab,
  inventoryBalances,
  colorSwatch,
  type GroupIcon,
  type ProductionEntry,
  type TabId,
} from './production-entry-data';

const TABS: { id: TabId; label: string; icon: typeof Factory }[] = [
  { id: 'extruder', label: 'Extruder Production', icon: Factory },
  { id: 'looms', label: 'Looms Production', icon: Building2 },
  { id: 'checking', label: 'Fabric Checking', icon: Grid3x3 },
  { id: 'delivered', label: 'Fabric Delivered', icon: Truck },
];

const GROUP_ICONS: Record<GroupIcon, typeof Layers> = {
  material: PackageOpen,
  waste: Trash,
  kora: Coins,
  yarn: Layers,
  delivery: Truck,
};

function BalanceColumn({
  title,
  icon: Icon,
  rows,
  className,
}: {
  title: string;
  icon: typeof Layers;
  rows: { name: string; value: string }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#004D40]/10">
          <Icon className="h-4 w-4 text-[#004D40]" />
        </span>
        <span className="text-[11.5px] font-bold uppercase tracking-wider text-gray-600">{title}</span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between text-[13px]">
            <span className="text-gray-700">{row.name}</span>
            <span className="font-semibold text-gray-900">{row.value} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorDot({ color }: { color: keyof typeof colorSwatch }) {
  return (
    <span
      className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300"
      style={{ backgroundColor: colorSwatch[color] }}
      aria-hidden="true"
    />
  );
}

function EntryCard({ entry }: { entry: ProductionEntry }) {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Row actions */}
      <div className="absolute right-3.5 top-3.5 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={`Edit ${entry.size} ${entry.color} entry`}
          className="h-8 w-8 rounded-lg border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#004D40]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Delete ${entry.size} ${entry.color} entry`}
          className="h-8 w-8 rounded-lg border-red-200 bg-white text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5">
        {/* Identity panel */}
        <div className="flex shrink-0 flex-row items-center gap-6 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 lg:w-[190px] lg:flex-col lg:items-start lg:gap-3">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
              <Ruler className="h-3.5 w-3.5 text-[#004D40]" />
              Size
            </span>
            <span className="text-[22px] font-bold leading-none text-gray-900">{entry.size}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">Color</span>
            <span className="flex items-center gap-2 text-[14px] font-semibold text-gray-800">
              <ColorDot color={entry.color} />
              {entry.color}
            </span>
          </div>
        </div>

        {/* Metric groups */}
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-5 lg:pr-20">
          {entry.groups.map((group, index) => {
            const GroupIconCmp = GROUP_ICONS[group.icon];
            return (
              <div
                key={group.title}
                className={`flex flex-1 flex-col gap-3 ${
                  index > 0 ? 'border-t border-gray-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0' : ''
                }`}
              >
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <GroupIconCmp className="h-4 w-4 text-gray-400" />
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-gray-700">
                    {group.title}
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-x-4 gap-y-3">
                  {group.metrics.map((metric) => (
                    <div key={metric.label} className="flex flex-col gap-1">
                      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        {metric.label}
                      </span>
                      <span className="text-[14.5px] font-semibold text-gray-900">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calculated result */}
        <div className="flex shrink-0 flex-col justify-center gap-1.5 self-stretch rounded-lg border border-[#004D40]/20 bg-[#E8F3EF] px-4 py-3 lg:mt-11 lg:w-[248px]">
          <span className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-wider text-[#004D40]">
            <Layers className="h-4 w-4" />
            {entry.result.label}
          </span>
          <span className="text-[22px] font-bold leading-tight text-[#004D40]">{entry.result.value}</span>
          <span className="w-fit rounded bg-[#004D40]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#004D40]">
            Calculated
          </span>
        </div>
      </div>
    </div>
  );
}

interface ProductionEntryTabsProps {
  onClose: () => void;
}

export function ProductionEntryTabs({ onClose }: ProductionEntryTabsProps) {
  const { setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle } = useProductionHeader();
  const [date, setDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<TabId>('checking');
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);

  useEffect(() => {
    setHeaderTitle('Add new Daily production details');
    setShowBackButton(true);
    setOnBackClick(() => onClose);
    setHeaderRight(
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex h-auto items-center rounded-md border border-gray-300 bg-white px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50"
          >
            <span className="mr-3 text-sm font-semibold text-gray-800">{format(date, 'dd MMM, yyyy')}</span>
            <CalendarIcon className="h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar mode="single" selected={date} onSelect={(value) => value && setDate(value)} autoFocus />
        </PopoverContent>
      </Popover>
    );

    return () => {
      setHeaderTitle(null);
      setHeaderRight(null);
      setShowBackButton(false);
      setOnBackClick(undefined);
    };
  }, [setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle, onClose, date]);

  const entries = entriesByTab[activeTab];

  return (
    <div className="flex flex-1 flex-col bg-[#004D40]/5">
      <div className="flex-1 overflow-y-auto p-3">
        {/* Inventory balances */}
        <section className="mb-3 rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setIsInventoryOpen((open) => !open)}
            aria-expanded={isInventoryOpen}
            className="flex w-full items-center justify-between rounded-t-xl border-b border-gray-200 bg-[#FAF9F5] px-5 py-3.5 text-left"
          >
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-gray-800">
              Inventory Balances
            </h2>
            {isInventoryOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {isInventoryOpen && (
            <div className="grid grid-cols-1 gap-5 px-5 py-4 sm:grid-cols-3 sm:divide-x sm:divide-gray-200">
              <BalanceColumn title="HDPE Balance" icon={ShoppingBasket} rows={inventoryBalances.hdpe} />
              <BalanceColumn
                title="Chemical Balance"
                icon={FlaskConical}
                rows={inventoryBalances.chemical}
                className="sm:pl-5"
              />
              <BalanceColumn
                title="Color Balance"
                icon={Palette}
                rows={inventoryBalances.color}
                className="sm:pl-5"
              />
            </div>
          )}
        </section>

        {/* Tabs + entries */}
        <section className="rounded-xl border border-gray-200 bg-white/60 shadow-sm">
          <div className="flex flex-wrap items-end gap-1.5 border-b border-gray-200 px-3 pt-3" role="tablist">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 rounded-t-lg border border-b-0 px-4 py-3 text-[12.5px] font-bold uppercase tracking-wide transition-colors ${
                    isActive
                      ? 'border-gray-200 bg-[#E8F3EF] text-[#004D40]'
                      : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded ${
                      isActive ? 'bg-[#004D40]/15 text-[#004D40]' : 'bg-gray-200/70 text-gray-500'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5 p-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}

            <Button
              variant="outline"
              className="w-fit gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-5 py-5 text-[13.5px] font-semibold text-gray-700 hover:border-[#004D40]/40 hover:bg-[#E8F3EF] hover:text-[#004D40]"
            >
              <Plus className="h-4 w-4" />
              Add new entry
            </Button>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-4 mb-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 bg-white px-6 font-semibold text-gray-700 shadow-sm"
          >
            Close
          </Button>
          <Button className="bg-[#004D40] px-7 font-semibold text-white shadow-sm hover:bg-[#00382e]">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
