import { DetailBreakdownCard, SectionSummaryCard, ExtruderSummaryCard } from './card';
import { fabricStockCardTheme, deliveryColorClass, toChemicalTable } from './dashboard-utils';
import { FabricStockCard } from './wastage-summary-tab';
import type { DashboardDataResult } from './dashboard-data-hooks';

type Props = Pick<
  DashboardDataResult,
  | 'extruderColorRows' | 'extruderGrandTotal'
  | 'loomsColorRows' | 'loomsGrandTotal'
  | 'fabricColorRows' | 'fabricGrandTotal'
  | 'yarnBalanceByColor' | 'yarnBalanceByVariant' | 'yarnBalanceColorRows'
  | 'koraBalanceByColor' | 'koraBalanceByVariant' | 'koraBalanceColorRows'
  | 'fabricStockColorRows' | 'totalFabricStockKg'
  | 'fabricDeliveredColorRows' | 'monthDeliveriesByColor' | 'selectedMonthDeliveryTotal'
>;

export function ProductionSummaryTab({
  extruderColorRows, extruderGrandTotal,
  loomsColorRows, loomsGrandTotal,
  fabricColorRows, fabricGrandTotal,
  yarnBalanceByColor, yarnBalanceByVariant, yarnBalanceColorRows,
  koraBalanceByColor, koraBalanceByVariant, koraBalanceColorRows,
  fabricStockColorRows, totalFabricStockKg,
  fabricDeliveredColorRows, monthDeliveriesByColor, selectedMonthDeliveryTotal,
}: Props) {
  return (
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

      {/* Yarn Balance */}
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

      {/* Kora Balance */}
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

      {/* Fabric Stock */}
      <div className="w-full">
        <FabricStockCard rows={fabricStockColorRows} total={totalFabricStockKg} />
      </div>

      {/* Fabric Delivered */}
      <div className="w-full">
        <SectionSummaryCard
          title="Fabric Delivered"
          total={selectedMonthDeliveryTotal}
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
}
