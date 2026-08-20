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
  const { data: extruderData, isLoading: loadingExtruder } = useExtruderProductions(LIST_QUERY);
  const { data: loomsData, isLoading: loadingLooms } = useLoomsProductions(LIST_QUERY);
  const { data: fabricData, isLoading: loadingFabric } = useFabricCheckingRecords(LIST_QUERY);

  const isLoading = loadingExtruder || loadingLooms || loadingFabric;

  const rows = useMemo<DayWiseRow[]>(() => {
    const byDate = new Map<string, { extruder: StageInOut; looms: StageInOut; fabric: StageInOut }>();

    const bucket = (isoDate: string) => {
      const key = isoDate.slice(0, 10);
      let entry = byDate.get(key);
      if (!entry) {
        entry = { extruder: emptyInOut(), looms: emptyInOut(), fabric: emptyInOut() };
        byDate.set(key, entry);
      }
      return entry;
    };

    for (const item of extruderData?.data ?? []) {
      const entry = bucket(item.productionDate);
      entry.extruder.input += item.extruder?.rawMaterialKg ?? 0;
      entry.extruder.output += item.extruder?.yarnOutputKg ?? 0;
    }
    for (const item of loomsData?.data ?? []) {
      const entry = bucket(item.productionDate);
      entry.looms.input += item.loom?.yarnInputKg ?? 0;
      entry.looms.output += item.loom?.fabricOutputKg ?? 0;
    }
    for (const item of fabricData?.data ?? []) {
      const entry = bucket(item.productionDate);
      entry.fabric.input += item.fabricCheck?.fabricInputKg ?? 0;
      entry.fabric.output += (item.fabricCheck?.firstGradeKg ?? 0) + (item.fabricCheck?.secondGradeKg ?? 0);
    }

    return Array.from(byDate.entries())
      .map(([date, totals]) => ({
        date,
        extruder: withWastage(totals.extruder),
        looms: withWastage(totals.looms),
        fabric: withWastage(totals.fabric),
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [extruderData, loomsData, fabricData]);

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
