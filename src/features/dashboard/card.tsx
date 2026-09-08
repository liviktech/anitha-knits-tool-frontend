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
  /** Optional sub-label under the color name — e.g. the chemical(s) used for that color. */
  detail?: string;
  /** Optional breakdown of production (e.g. by chemical) to display under the color row. */
  subItems?: { label: string; value: number }[];
}

export interface ProductionSummaryCardProps {
  title: string;
  total: number;
  rows: ProductionSummaryCardRow[];
  theme: ProductionSummaryCardTheme;
  rowLabelClassName?: string;
  /** Shown when every row has no production recorded (so there's nothing to list). */
  emptyMessage?: string;
}

export function ProductionSummaryCard({ title, total, rows, theme, rowLabelClassName = 'text-[13.5px]', emptyMessage = 'No production recorded yet.' }: ProductionSummaryCardProps) {
  // Only colors with actual production are shown — an empty "--" row for every
  // untouched color just adds noise once a card has any real data to show.
  const recordedRows = rows.filter((row) => row.production > 0);
  return (
    <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 py-0 h-full`}>
      <CardHeader className="flex flex-row items-center justify-between pb-1! pt-3 px-4">
        <CardTitle className={`text-[17px] font-extrabold ${theme.titleColor} flex items-center gap-3`}>
          {title}
        </CardTitle>
        <span className={`text-[14px] font-bold ${theme.totalColor}`}>Total : <span className="font-inter">{formatNum(total)}</span> kg</span>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0 flex-1 flex flex-col">
        {recordedRows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-xs text-gray-400 italic">{emptyMessage}</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="space-y-2">
              {recordedRows.map((row) => (
                <div key={row.color} className="flex flex-col border border-gray-400 rounded-md px-3 py-2 bg-white">
                  <div className="flex items-center justify-between relative">
                    <span className={`font-semibold ${rowLabelClassName} ${deliveryColorClass(row.color)} shrink-0`}>{row.color}</span>
                    {row.detail && <span className="absolute left-1/2 -translate-x-1/2 text-[11px] font-medium text-gray-500 truncate max-w-[40%] text-center">{row.detail}</span>}
                    <span className="font-bold font-inter text-gray-900 shrink-0">{formatNum(row.production)} kg</span>
                  </div>
                  {row.subItems && row.subItems.length > 0 && (
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                      {row.subItems.map((sub, idx) => (
                        <div key={sub.label} className={`flex flex-col ${idx === 0 ? 'items-start' : idx === row.subItems!.length - 1 ? 'items-end' : 'items-center'}`}>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{sub.label}</span>
                          <span className="text-[11px] font-bold font-inter text-gray-700">{formatNum(sub.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
  /** Optional sub-label shown to the right of `label` on the same line — e.g. the chemical(s) used for that row's color. */
  detail?: string;
}

/** One chemical's row in the chemical-x-size table (see `DetailBreakdownCardProps.table`). */
export interface DetailBreakdownTableRow {
  label: string;
  /** Value per column (size); a missing/zero entry renders as "-" for that column. */
  values: Record<string, number>;
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
  /**
   * When set, renders a chemical(rows) x size(columns) table instead of the normal `rows` list —
   * used by Yarn Balance / Kora Balance / Fabric Stock / Fabric Delivered so a color that used
   * more than one chemical this month shows each chemical's own figures, not just a blended total.
   * The card's own header (title/total) is unchanged either way.
   */
  table?: {
    columns: string[];
    rows: DetailBreakdownTableRow[];
  };
}

export function DetailBreakdownCard({ title, total, theme, rows, emptyMessage = 'No records yet.', zeroDisplay, layout = 'list', table }: DetailBreakdownCardProps) {
  const hasRows = table ? table.rows.length > 0 : rows.length > 0;
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
        ) : table ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-row items-center px-1">
              <div className="w-[80px] shrink-0" />
              <div className={`flex-1 flex flex-row items-center ${table.columns.length === 1 ? 'justify-start' : 'justify-between'}`}>
                {table.columns.map((col) => (
                  <span key={col} className={`flex-1 text-[10px] text-gray-500 font-bold uppercase tracking-wide ${table.columns.length === 1 ? 'text-left' : 'text-center'}`}>{col}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {table.rows.map((row) => (
                <div key={row.label} className="flex flex-row items-start border border-gray-200 rounded p-1.5 bg-[#f8fafc] gap-1">
                  <span className="w-[80px] shrink-0 text-[11px] font-bold text-gray-600 uppercase tracking-wide leading-tight break-words">{row.label}</span>
                  <div className={`flex-1 flex flex-row items-center pt-px ${table.columns.length === 1 ? 'justify-start' : 'justify-between'}`}>
                    {table.columns.map((col) => {
                      const value = row.values[col] ?? 0;
                      return (
                        <span key={col} className={`flex-1 text-[11px] font-inter font-bold text-gray-800 ${table.columns.length === 1 ? 'text-left' : 'text-center'}`}>
                          {value > 0 ? formatNum(value) : '-'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : layout === 'boxed' ? (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id ?? row.label} className="flex items-center justify-between border border-gray-400 rounded-md px-3 py-2 bg-white">
                <span className="flex items-baseline gap-1.5 min-w-0">
                  <span className="font-semibold text-[13px] text-gray-600 shrink-0">{row.label}</span>
                  {row.detail && <span className="text-[11px] font-medium text-gray-400 truncate">{row.detail}</span>}
                </span>
                <span className="font-bold font-inter text-gray-900 shrink-0 pl-2">{renderValue(row.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full border border-gray-300 rounded-lg bg-white divide-y divide-gray-200 overflow-hidden">
            {rows.map((row) => (
              <div key={row.id ?? row.label} className="flex items-center justify-between px-3 py-2 text-[13px]">
                <span className="flex items-baseline gap-1.5 min-w-0">
                  <span className="font-semibold text-gray-600 shrink-0">{row.label}</span>
                  {row.detail && <span className="text-[11px] font-medium text-gray-400 truncate">{row.detail}</span>}
                </span>
                <span className="font-bold font-inter text-gray-900 shrink-0 pl-2">{renderValue(row.value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Per-color wastage breakdown — like DetailBreakdownCard, but each row is a size
 * with one or more waste-type columns (e.g. Lums/Loose, or Fabric/Bit) shown side
 * by side, plus a Total column (that row's waste types summed). The color name,
 * the waste-type column labels, and the card's grand total all share one header
 * line, with the per-row totals aligned underneath that header total.
 */
export interface WasteVariantCardColumn {
  key: string;
  label: string;
}

export interface WasteVariantCardRow {
  size: string;
  /** Waste amount per column key; a missing/zero entry renders as "--" for that column. */
  values: Record<string, number>;
}

export interface WasteVariantCardProps {
  title: string;
  total: number;
  theme: DetailBreakdownCardTheme;
  columns: WasteVariantCardColumn[];
  rows: WasteVariantCardRow[];
  emptyMessage?: string;
}

export function WasteVariantCard({ title, total, theme, columns, rows, emptyMessage = 'No waste recorded yet.' }: WasteVariantCardProps) {
  const recordedRows = rows.filter((row) => columns.some((col) => (row.values[col.key] ?? 0) > 0));
  return (
    <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 h-full py-0`}>
      <CardHeader className="flex flex-col pb-2 pt-2 px-3 gap-2">
        <div className="w-full flex flex-row items-center justify-between">
          <CardTitle className={`min-w-0 text-[17px] font-bold flex items-center gap-2 ${theme.labelColor}`}>
            {title}
          </CardTitle>
          <span className={`shrink-0 text-center text-[14px] font-bold whitespace-nowrap ${theme.labelColor}`}>Total : <span className="font-inter">{formatNum(total)}</span> kg</span>
        </div>
        {recordedRows.length > 0 && (
          <div className="w-full flex flex-row items-end gap-1 relative h-4">
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex gap-1">
              {columns.map((col) => (
                <span key={col.key} className="w-24 shrink-0 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{col.label}</span>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-2 flex-1 flex flex-col">
        {recordedRows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-xs text-gray-400 italic">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recordedRows.map((row) => {
              const rowTotal = columns.reduce((sum, col) => sum + (row.values[col.key] ?? 0), 0);
              return (
                <div key={row.size} className="flex items-center gap-1 border border-gray-400 rounded-md px-3 py-2 bg-white relative">
                  <span className="w-20 min-w-0 font-semibold text-[13px] text-gray-600">{row.size}</span>
                  <div className="absolute left-1/2 -translate-x-1/2 flex gap-1 items-center">
                    {columns.map((col) => {
                      const value = row.values[col.key] ?? 0;
                      return (
                        <span key={col.key} className="w-24 shrink-0 text-center font-bold font-inter text-gray-900">
                          {value > 0 ? formatNum(value) : '--'}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex-1" />
                  <span className="shrink-0 text-right font-bold font-inter text-gray-900 whitespace-nowrap">{formatNum(rowTotal)} kg</span>
                </div>
              );
            })}
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
        ) : (
          emptyMessage && <p className="text-sm italic text-gray-400 mt-2 text-center">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

export interface ExtruderSummaryCardRow {
  color: string;
  production: number;
  uniqueSizeCount: number;
  chemicals: {
    chemical: string;
    production: number;
    sizes: { size: string; production: number }[];
  }[];
}

export interface ExtruderSummaryCardProps {
  title: string;
  total: number;
  rows: ExtruderSummaryCardRow[];
  theme: ProductionSummaryCardTheme;
  rowLabelClassName?: string;
}

export function ExtruderSummaryCard({ title, total, rows, theme, rowLabelClassName = 'text-[13.5px]' }: ExtruderSummaryCardProps) {
  return (
    <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-[14px] hover:shadow-md transition-all flex flex-col gap-0 h-full py-0`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-2 px-3">
        <CardTitle className={`text-[15px] font-bold ${theme.titleColor}`}>{title}</CardTitle>
        <span className={`text-[12px] font-bold whitespace-nowrap ${theme.totalColor}`}>
          Total : <span className="font-inter">{formatNum(total)}</span> kg
        </span>
      </CardHeader>
      <CardContent className="px-2 pb-2 flex-1 flex flex-col">
        {rows.filter(row => row.production > 0 || row.chemicals.length > 0).length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-xs text-gray-400 italic">No production recorded yet.</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="space-y-2">
              {rows.filter(row => row.production > 0 || row.chemicals.length > 0).map((row) => {
                const allSizes = Array.from(new Set(row.chemicals.flatMap(c => c.sizes.map(s => s.size)))).sort((a, b) => a.localeCompare(b));
                return (
                  <div key={row.color} className="flex flex-col border border-gray-400 rounded-md p-2 bg-white gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${rowLabelClassName} ${deliveryColorClass(row.color)} shrink-0`}>{row.color}</span>

                      </div>
                      <span className="font-bold font-inter text-[12px] text-gray-900 shrink-0">{formatNum(row.production)} kg</span>
                    </div>

                    {row.chemicals.length > 0 && (
                      <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-1.5">
                        {allSizes.length > 0 && (
                          <div className="flex flex-row items-center px-1">
                            <div className="w-[64px] shrink-0"></div>
                            <div className={`flex-1 flex flex-row items-center ${allSizes.length === 1 ? 'justify-start' : 'justify-between'}`}>
                              {allSizes.map(size => (
                                <span key={size} className={`flex-1 text-[10px] text-gray-500 font-bold uppercase tracking-wide ${allSizes.length === 1 ? 'text-left' : 'text-center'}`}>{size}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          {row.chemicals.map(chem => (
                            <div key={chem.chemical} className="flex flex-row items-center border border-gray-200 rounded p-1.5 bg-[#f8fafc]">
                              <span className="w-[64px] shrink-0 text-[11px] font-bold text-gray-600 uppercase tracking-wide truncate">{chem.chemical}</span>
                              <div className={`flex-1 flex flex-row items-center ${allSizes.length === 1 ? 'justify-start' : 'justify-between'}`}>
                                {allSizes.map(size => {
                                  const s = chem.sizes.find(x => x.size === size);
                                  return (
                                    <span key={size} className={`flex-1 text-[11px] font-inter font-bold text-gray-800 ${allSizes.length === 1 ? 'text-left' : 'text-center'}`}>
                                      {s ? formatNum(s.production) : '-'}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
