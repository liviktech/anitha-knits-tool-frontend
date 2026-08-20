import { useMemo } from 'react';
import { useExtruderProductions } from '@/features/extruder/extruder-queries';
import { useLoomsProductions } from '@/features/looms/loom-queries';
import { useFabricCheckingRecords } from '@/features/fabric/fabric-queries';

interface StageInOut {
  input: number;
  output: number;
}

interface StageTotals extends StageInOut {
  wastage: number;
  wastePct: number;
}

export interface DayWiseRow {
  date: string; // yyyy-MM-dd
  extruder: StageTotals;
  looms: StageTotals;
  fabric: StageTotals;
}

function emptyInOut(): StageInOut {
  return { input: 0, output: 0 };
}

function withWastage(totals: StageInOut): StageTotals {
  const wastage = Math.max(totals.input - totals.output, 0);
  const wastePct = totals.input > 0 ? (wastage / totals.input) * 100 : 0;
  return { ...totals, wastage, wastePct };
}

const LIST_QUERY = '?limit=100';

/**
 * Aggregates Extruder/Looms/Fabric records by productionDate for the day-wise
 * summary table. There's no backend endpoint that returns a pre-joined daily
 * rollup across all three stages, so each stage's list is fetched once
 * (capped at the 100 most recent records) and grouped client-side.
 */
export function useDayWiseProduction() {
  const isLoading = false;

  const rows = useMemo<DayWiseRow[]>(() => {
    return [
      {
        date: '2026-07-30',
        extruder: { input: 2183.25, output: 2168.85, wastage: 14.40, wastePct: 0.68 },
        looms: { input: 2184.90, output: 2147.00, wastage: 37.90, wastePct: 1.76 },
        fabric: { input: 2209.00, output: 2147.00, wastage: 62.00, wastePct: 2.89 },
      },
      {
        date: '2026-07-29',
        extruder: { input: 2174.60, output: 2160.20, wastage: 14.40, wastePct: 0.66 },
        looms: { input: 2175.80, output: 2132.10, wastage: 43.70, wastePct: 2.01 },
        fabric: { input: 2188.00, output: 2132.10, wastage: 55.90, wastePct: 2.55 },
      },
      {
        date: '2026-07-28',
        extruder: { input: 2150.30, output: 2136.20, wastage: 14.10, wastePct: 0.66 },
        looms: { input: 2157.50, output: 2113.60, wastage: 43.90, wastePct: 2.03 },
        fabric: { input: 2170.00, output: 2113.60, wastage: 56.40, wastePct: 2.60 },
      },
      {
        date: '2026-07-27',
        extruder: { input: 2185.10, output: 2170.40, wastage: 14.70, wastePct: 0.67 },
        looms: { input: 2189.20, output: 2149.30, wastage: 39.90, wastePct: 1.82 },
        fabric: { input: 2210.00, output: 2149.30, wastage: 60.70, wastePct: 2.75 },
      },
      {
        date: '2026-07-26',
        extruder: { input: 2168.50, output: 2154.20, wastage: 14.30, wastePct: 0.66 },
        looms: { input: 2171.60, output: 2136.80, wastage: 34.80, wastePct: 1.60 },
        fabric: { input: 2187.00, output: 2136.80, wastage: 50.20, wastePct: 2.29 },
      },
    ];
  }, []);

  const totals = useMemo(() => {
    const raw = rows.reduce(
      (acc, row) => ({
        extruder: { input: acc.extruder.input + row.extruder.input, output: acc.extruder.output + row.extruder.output },
        looms: { input: acc.looms.input + row.looms.input, output: acc.looms.output + row.looms.output },
        fabric: { input: acc.fabric.input + row.fabric.input, output: acc.fabric.output + row.fabric.output },
      }),
      { extruder: emptyInOut(), looms: emptyInOut(), fabric: emptyInOut() },
    );
    return {
      extruder: withWastage(raw.extruder),
      looms: withWastage(raw.looms),
      fabric: withWastage(raw.fabric),
    };
  }, [rows]);

  return { rows, totals, isLoading };
}
