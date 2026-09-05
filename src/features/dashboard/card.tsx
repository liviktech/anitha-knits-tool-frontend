import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function deliveryColorClass(color: string): string {
  const normalizedColor = color.toLowerCase();
  if (normalizedColor === 'blue') return 'text-[#0088CC]';
  if (normalizedColor === 'green') return 'text-[#5BA300]';
  return 'text-gray-700';
}

export interface ProductionSummaryCardTheme {
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  totalColor: string;
}

export interface ProductionSummaryCardRow {
  color: string;
  production: number;
}

export interface ProductionSummaryCardProps {
  title: string;
  total: number;
  rows: ProductionSummaryCardRow[];
  theme: ProductionSummaryCardTheme;
  rowLabelClassName?: string;
}

export function ProductionSummaryCard({ title, total, rows, theme, rowLabelClassName = 'text-[13.5px]' }: ProductionSummaryCardProps) {
  return (
    <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 self-start py-0`}>
      <CardHeader className="flex flex-row items-center justify-between pb-1! pt-3 px-4">
        <CardTitle className={`text-[17px] font-extrabold ${theme.titleColor} flex items-center gap-3`}>
          {title}
        </CardTitle>
        <span className={`text-[14px] font-bold ${theme.totalColor}`}>Total : <span className="font-inter">{formatNum(total)}</span> kg</span>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0 flex flex-col">
        <div className="w-full">
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.color} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                <span className={`font-semibold ${rowLabelClassName} ${deliveryColorClass(row.color)}`}>{row.color}</span>
                <span className="font-bold font-inter text-gray-900">{row.production > 0 ? `${formatNum(row.production)} kg` : '--'}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Per-group breakdown card — the "one card per color, rows per size" shape
 * used by the Fabric Stock section. Reused for any section that needs the
 * same visual: a themed mini-card with a title/total header and a divided
 * list of label/value rows underneath.
 */
export interface DetailBreakdownCardTheme {
  cardBg: string;
  cardBorder: string;
  labelColor: string;
}

export interface DetailBreakdownCardRow {
  label: string;
  value: number;
  /** Unique key for the row, for cases where multiple rows can share the same label (e.g. per-delivery rows). Defaults to `label`. */
  id?: string;
}

export interface DetailBreakdownCardProps {
  title: string;
  total: number;
  theme: DetailBreakdownCardTheme;
  rows: DetailBreakdownCardRow[];
  emptyMessage?: string;
  /** Shown instead of the formatted value when a row's value is 0 or less. Omit to always show the formatted value. */
  zeroDisplay?: string;
  /**
   * 'list' (default) — Fabric Stock's single bordered container with rows divided by hairlines.
   * 'boxed' — each row as its own separate bordered box (matches the Extruder/Looms/Fabric
   * Production summary cards' row style), stacked with a gap instead of dividers.
   */
  layout?: 'list' | 'boxed';
}

export function DetailBreakdownCard({ title, total, theme, rows, emptyMessage = 'No records yet.', zeroDisplay, layout = 'list' }: DetailBreakdownCardProps) {
  const hasRows = rows.length > 0;
  const renderValue = (value: number) => (value > 0 || !zeroDisplay ? `${formatNum(value)} kg` : zeroDisplay);
  return (
    <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 h-full py-0`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-2 px-3">
        <CardTitle className={`text-[17px] font-bold flex items-center gap-2 ${theme.labelColor}`}>
          {title}
        </CardTitle>
        <span className={`text-[14px] font-bold ${theme.labelColor}`}>Total : <span className="font-inter">{formatNum(total)}</span> kg</span>
      </CardHeader>
      <CardContent className="px-2 pb-2 flex-1 flex flex-col">
        {!hasRows ? (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-xs text-gray-400 italic">{emptyMessage}</p>
          </div>
        ) : layout === 'boxed' ? (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id ?? row.label} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                <span className="font-semibold text-[13px] text-gray-600">{row.label}</span>
                <span className="font-bold font-inter text-gray-900">{renderValue(row.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full border border-gray-300 rounded-lg bg-white divide-y divide-gray-200 overflow-hidden">
            {rows.map((row) => (
              <div key={row.id ?? row.label} className="flex items-center justify-between px-3 py-2 text-[13px]">
                <span className="font-semibold text-gray-600">{row.label}</span>
                <span className="font-bold font-inter text-gray-900">{renderValue(row.value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Outer section wrapper — the "Fabric Stock" card shell: a titled white card
 * with a grand total in the header, wrapping a responsive grid of
 * DetailBreakdownCards (one per group, e.g. per color).
 */
export interface SectionSummaryCardProps {
  title: string;
  total: number;
  totalColorClassName?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

export function SectionSummaryCard({
  title,
  total,
  totalColorClassName = 'text-[#2F6B2F]',
  isLoading = false,
  loadingMessage = 'Loading...',
  isEmpty = false,
  emptyMessage = 'No records yet.',
  children,
}: SectionSummaryCardProps) {
  return (
    <Card className="font-hanken bg-white border border-gray-400 shadow-lg shadow-slate-200/50 rounded-3xl p-2 md:p-2 gap-2 flex flex-col transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-300/40 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 fill-mode-both">
      <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-gray-400 pt-0 pb-0!">
        <CardTitle className="font-hanken font-bold text-xl px-1">{title}</CardTitle>
        <div className="flex items-center gap-3">
          <span className={`text-[14px] font-bold px-2 ${totalColorClassName}`}>Total : <span className="font-inter">{formatNum(total)}</span> kg</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400 italic">{loadingMessage}</p>
          </div>
        ) : isEmpty ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400 italic">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Outer "Raw Materials" section wrapper — a plain titled white card (no header
 * total, unlike SectionSummaryCard) holding a 3-up grid of RawMaterialCards.
 */
export interface RawMaterialsSectionProps {
  title?: string;
  children: ReactNode;
}

export function RawMaterialsSection({ title = 'Raw Materials', children }: RawMaterialsSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-2" style={{ fontFamily: "'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif" }}>
      <p className="font-bold text-xl px-0.5 text-left pb-2">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {children}
      </div>
    </div>
  );
}

/** One inventory item row inside a RawMaterialCard (e.g. one HDPE brand, one chemical). */
export interface RawMaterialCardItem {
  name: string;
  weight: number;
  bags?: number;
}

export interface RawMaterialCardProps {
  icon: string;
  iconAlt: string;
  title: string;
  totalWeight: number;
  /** Text color class for the header total figure — cards differ here (e.g. HDPE's `text-brown-400`). */
  totalValueClassName?: string;
  hoverBorderClassName: string;
  items: RawMaterialCardItem[];
  /** Full gap/margin classes for the items row — cards differ here (e.g. `gap-x-10 gap-y-3` vs `gap-x-9 gap-y-3 mt-1`). */
  itemsGapClassName: string;
  /** Shows the "( N Bags )" line under each item's weight — only the HDPE card uses this. */
  showBags?: boolean;
  /** 'styled' (default) renders "kg" as a small gray span; 'plain' appends "kg" inline; 'inline-bags' renders "{weight}kg / {bags} bags" on one line. */
  weightSuffixVariant?: 'styled' | 'plain' | 'inline-bags';
  emptyMessage: string;
  /** Full override for the header row's alignment/spacing — pages differ here (e.g. `items-start mb-1` vs `items-center mb-2`). */
  headerRowClassName?: string;
  /** Full override for the items wrapper's top padding — pages differ here (e.g. `pt-2` vs `pt-1`). */
  contentWrapperClassName?: string;
  className?: string;
}

export function RawMaterialCard({
  icon,
  iconAlt,
  title,
  totalWeight,
  totalValueClassName = 'text-gray-800',
  hoverBorderClassName,
  items,
  itemsGapClassName,
  showBags = false,
  weightSuffixVariant = 'styled',
  emptyMessage,
  headerRowClassName = 'flex justify-between items-start mb-1 relative z-10',
  contentWrapperClassName = 'mt-auto relative z-10 pt-2 border-t border-gray-50',
  className = '',
}: RawMaterialCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card ${hoverBorderClassName} transition-colors flex flex-col ${className}`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
        <img src={icon} alt="" className="w-26 h-26 object-contain" />
      </div>
      <div className={headerRowClassName}>
        <div className="flex items-center gap-2">
          <div><img src={icon} alt={iconAlt} className="w-12 h-12 object-contain" /></div>
          <h3 className="font-extrabold text-gray-800 text-lg">{title}</h3>
        </div>
        <div className={`text-lg font-bold ${totalValueClassName} leading-none`}>{totalWeight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
      </div>
      <div className={contentWrapperClassName}>
        {items.length > 0 ? (
          <div className={`flex flex-wrap items-center ${itemsGapClassName} ${items.length === 1 ? 'justify-center' : 'justify-start'}`}>
            {items.map((item) => (
              <div key={item.name} className={`flex flex-col gap-0.5 text-sm ${items.length === 1 ? 'items-center text-center' : 'items-start text-left'}`}>
                <span className="font-medium text-gray-500">{item.name}</span>
                {weightSuffixVariant === 'inline-bags' ? (
                  <span className="font-extrabold text-[#004D40]">{item.weight.toFixed(2)}kg / {item.bags} bags</span>
                ) : weightSuffixVariant === 'plain' ? (
                  <span className="font-extrabold text-[#004D40]">{item.weight.toFixed(2)}kg </span>
                ) : (
                  <span className="font-extrabold text-[#004D40]">{item.weight.toFixed(2)}<span className="text-gray-500 font-normal text-[12px] ml-0.5">kg</span></span>
                )}
                {showBags && (
                  <span className="text-xs font-medium text-gray-500">( {item.bags} Bags )</span>
                )}
              </div>
            ))}
          </div>
        ) : <span className="text-xs text-gray-400 italic">{emptyMessage}</span>}
      </div>
    </div>
  );
}
