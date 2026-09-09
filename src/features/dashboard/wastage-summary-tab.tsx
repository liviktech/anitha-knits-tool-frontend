import { DetailBreakdownCard, SectionSummaryCard } from './card';
import {
  FABRIC_STOCK_SIZES,
  fabricStockCardTheme,
  deliveryColorClass,
  toChemicalTable,
  formatNum,
} from './dashboard-utils';
import { buildWastageChemicalRows, buildSampleWastageTotals } from './dashboard-data-hooks';
import type { DashboardDataResult, } from './dashboard-data-hooks';
import type { ExtruderSummaryColorRow } from './dashboard-utils';

export type WastageMode = 'production' | 'sample';

// ─── FabricStockCard ──────────────────────────────────────────────────────────

interface FabricStockCardProps {
  rows: ExtruderSummaryColorRow[];
  total: number;
}

export function FabricStockCard({ rows, total }: FabricStockCardProps) {
  return (
    <SectionSummaryCard title="Fabric Stock" total={total} isEmpty={rows.length === 0} emptyMessage="No fabric stock records yet.">
      {rows.map((row) => {
        const theme = fabricStockCardTheme(row.color);
        return (
          <DetailBreakdownCard
            key={row.color}
            title={row.color}
            total={row.production}
            theme={{ cardBg: theme.bg, cardBorder: theme.border, labelColor: deliveryColorClass(row.color) }}
            rows={[]}
            table={toChemicalTable(row)}
            emptyMessage="No stock recorded yet."
          />
        );
      })}
    </SectionSummaryCard>
  );
}

// ─── WastageCard ──────────────────────────────────────────────────────────────

interface WastageCardProps {
  looseWaste: number;
  lums: number;
  extruderWasteByChemical: { color: string; chemicals: { chemical: string; sizes: { size: string; lums: number; yarnWaste: number }[] }[] }[];
  loomsWasteByColor: { color: string; loomsWaste: number }[];
  loomsWasteByChemical: { color: string; chemicals: { chemical: string; sizes: { size: string; loomsWaste: number }[] }[] }[];
  fabricWasteByColor: { color: string; fabricWaste: number; bitWaste: number }[];
  fabricWasteByChemical: { color: string; chemicals: { chemical: string; sizes: { size: string; fabricWaste: number; bitWaste: number }[] }[] }[];
}

function WastageCard({
  looseWaste, lums,
  extruderWasteByChemical,
  loomsWasteByColor, loomsWasteByChemical,
  fabricWasteByColor, fabricWasteByChemical,
}: WastageCardProps) {
  const extruderTotal = lums + looseWaste;
  const loomsWasteTotal = loomsWasteByColor.reduce((sum, r) => sum + r.loomsWaste, 0);
  const fabricWasteTotal = fabricWasteByColor.reduce((sum, r) => sum + r.fabricWaste + r.bitWaste, 0);

  const renderChemicalTable = (
    color: string,
    chemicals: any[],
    getRowDefs: (chem: any) => { label: string; values: Record<string, number> }[],
  ) => {
    const rowTotal = chemicals.reduce((s1, c) => {
      const rows = getRowDefs(c).filter((r) => Object.values(r.values).some((v) => v > 0));
      return s1 + rows.reduce((s2, r) => s2 + Object.values(r.values).reduce((s3, v) => s3 + v, 0), 0);
    }, 0);

    const theme = fabricStockCardTheme(color);

    return (
      <div key={color} className={`${theme.bg} border ${theme.border} rounded-[14px] shadow-sm flex flex-col overflow-hidden mt-2 mb-2`}>
        <div className={`flex items-center justify-between px-4 py-2.5 bg-white/40 border-b ${theme.border}`}>
          <span className={`text-[17px] font-bold ${deliveryColorClass(color)}`}>{color}</span>
          <span className={`text-[14px] font-bold ${deliveryColorClass(color)}`}>
            Total : <span className="font-inter">{formatNum(rowTotal)}</span> kg
          </span>
        </div>

        {rowTotal === 0 ? (
          <div className="flex items-center justify-center py-5">
            <p className="text-xs text-gray-400 italic">No wastage recorded yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-3">
            {chemicals.map((chem) => {
              const columns = [...FABRIC_STOCK_SIZES];
              const tableRows = getRowDefs(chem).filter((r) => Object.values(r.values).some((v) => v > 0));
              const chemTotal = tableRows.reduce((sum, r) => sum + Object.values(r.values).reduce((s, v) => s + v, 0), 0);
              if (chemTotal === 0) return null;
              return (
                <DetailBreakdownCard
                  key={chem.chemical}
                  title={chem.chemical}
                  total={chemTotal}
                  theme={{ cardBg: 'bg-white', cardBorder: 'border-gray-200', labelColor: 'text-gray-700' }}
                  rows={[]}
                  table={{ columns: [...columns], rows: tableRows }}
                  emptyMessage="No waste recorded yet."
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <SectionSummaryCard title="Extruder Wastage" total={extruderTotal} totalColorClassName="text-[#0B5566]">
          {extruderWasteByChemical.map((row) =>
            renderChemicalTable(row.color, row.chemicals, (chem) => [
              { label: 'LOOMS WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.yarnWaste])) },
              { label: 'LUMPS WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.lums])) },
            ]),
          )}
        </SectionSummaryCard>
      </div>

      <div className="flex flex-col">
        <SectionSummaryCard title="Looms Wastage" total={loomsWasteTotal} totalColorClassName="text-[#7A6A00]">
          {loomsWasteByChemical.map((row) =>
            renderChemicalTable(row.color, row.chemicals, (chem) => [
              { label: 'LOOMS WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.loomsWaste])) },
            ]),
          )}
        </SectionSummaryCard>
      </div>

      <div className="flex flex-col">
        <SectionSummaryCard title="Fabric Checking Wastage" total={fabricWasteTotal} totalColorClassName="text-[#2F6B2F]">
          {fabricWasteByChemical.map((row) =>
            renderChemicalTable(row.color, row.chemicals, (chem) => [
              { label: 'FABRIC WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.fabricWaste])) },
              { label: 'BIT WASTE', values: Object.fromEntries(chem.sizes.map((s: any) => [s.size, s.bitWaste])) },
            ]),
          )}
        </SectionSummaryCard>
      </div>
    </div>
  );
}

// ─── WastageTabContent ────────────────────────────────────────────────────────

type WastageTabContentProps = Pick<
  DashboardDataResult,
  | 'looseWasteKg' | 'lumsWasteKg'
  | 'extruderProductionsData' | 'loomsProductionsData' | 'fabricCheckingData'
  | 'sampleExtruderData' | 'sampleLoomsData' | 'sampleFabricData'
  | 'loomsWasteByColor' | 'fabricWasteByColor'
  | 'obWastage'
> & {
  currentMonthStr: string;
  wastageMode: WastageMode;
  onWastageModeChange: (mode: WastageMode) => void;
};

export function WastageTabContent({
  currentMonthStr,
  looseWasteKg, lumsWasteKg,
  extruderProductionsData, loomsProductionsData, fabricCheckingData,
  sampleExtruderData, sampleLoomsData, sampleFabricData,
  loomsWasteByColor, fabricWasteByColor,
  obWastage,
  wastageMode,
  onWastageModeChange,
}: WastageTabContentProps) {
  const { sampleLooseWaste, sampleLums, sampleLoomsWasteByColor, sampleFabricWasteByColor } = buildSampleWastageTotals(
    sampleExtruderData, sampleLoomsData, sampleFabricData, currentMonthStr,
  );

  const isProd = wastageMode === 'production';

  return (
    <div className="flex flex-col gap-3">
      {/* Production / Sample toggle */}
      <div className="flex justify-end">
        <div className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 p-0.5 text-xs font-semibold shadow-sm">
          {(['production', 'sample'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onWastageModeChange(mode)}
              className={`rounded-full px-4 py-1.5 capitalize transition-all duration-200 ${
                wastageMode === mode ? 'bg-[#004D40] text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <WastageCard
        looseWaste={isProd ? looseWasteKg : sampleLooseWaste}
        lums={isProd ? lumsWasteKg : sampleLums}
        extruderWasteByChemical={buildWastageChemicalRows(isProd ? extruderProductionsData : sampleExtruderData, 'extruder', currentMonthStr, isProd ? obWastage : [])}
        loomsWasteByColor={isProd ? loomsWasteByColor : sampleLoomsWasteByColor}
        loomsWasteByChemical={buildWastageChemicalRows(isProd ? loomsProductionsData : sampleLoomsData, 'looms', currentMonthStr, isProd ? obWastage : [])}
        fabricWasteByColor={isProd ? fabricWasteByColor : sampleFabricWasteByColor}
        fabricWasteByChemical={buildWastageChemicalRows(isProd ? fabricCheckingData : sampleFabricData, 'fabric', currentMonthStr, isProd ? obWastage : [])}
      />
    </div>
  );
}
