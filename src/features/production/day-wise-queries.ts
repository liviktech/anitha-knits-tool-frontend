// API commented out for now — this hook serves static data.
// import { useQuery } from '@tanstack/react-query';
// import { fetchJson } from '@/lib/api-client';
import { staticDayWiseRows, staticDayWiseTotals, staticDayWiseSummary } from './static-entry-data';

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

// interface ApiStageTotals {
//   inputKg: number;
//   outputKg: number;
//   wastageKg: number;
//   wastePct: number;
//   efficiencyPct?: number;
// }
//
// interface DashboardProductionResponse {
//   success: boolean;
//   data: {
//     range: { dateFrom: string; dateTo: string };
//     summary: {
//       extruder: ApiStageTotals;
//       looms: ApiStageTotals;
//       fabricChecking: ApiStageTotals;
//     };
//     daily: Array<{
//       date: string;
//       extruder: ApiStageTotals;
//       looms: ApiStageTotals;
//       fabricChecking: ApiStageTotals;
//     }>;
//   };
// }
//
// const emptyTotals: StageTotals = { input: 0, output: 0, wastage: 0, wastePct: 0 };

export const dashboardProductionKey = ['dashboard', 'production'] as const;

export function useDayWiseProduction(_monthStr?: string) {
  // STATIC DATA — the API call below is commented out for now.
  return {
    rows: staticDayWiseRows as DayWiseRow[],
    totals: staticDayWiseTotals,
    isLoading: false,
    apiSummary: staticDayWiseSummary,
  };

  /* ---- Original API implementation (restore by deleting the block above) ----
  const queryKey = monthStr ? [...dashboardProductionKey, monthStr] : dashboardProductionKey;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      let url = '/dashboard/production';
      if (monthStr) {
        const [year, month] = monthStr.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        url += `?date_from=${monthStr}-01&date_to=${monthStr}-${lastDay}`;
      }
      return fetchJson<DashboardProductionResponse>(url);
    },
  });

  const rows = (data?.data?.daily ?? [])
    .map((d) => ({
      date: d.date,
      extruder: {
        input: d.extruder.inputKg,
        output: d.extruder.outputKg,
        wastage: d.extruder.wastageKg,
        wastePct: d.extruder.wastePct,
      },
      looms: {
        input: d.looms.inputKg,
        output: d.looms.outputKg,
        wastage: d.looms.wastageKg,
        wastePct: d.looms.wastePct,
      },
      fabric: {
        input: d.fabricChecking.inputKg,
        output: d.fabricChecking.outputKg,
        wastage: d.fabricChecking.wastageKg,
        wastePct: d.fabricChecking.wastePct,
      },
    }))
    // Most recent day first, regardless of the order the API returns.
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const totals = data?.data?.summary
    ? {
        extruder: {
          input: data.data.summary.extruder.inputKg,
          output: data.data.summary.extruder.outputKg,
          wastage: data.data.summary.extruder.wastageKg,
          wastePct: data.data.summary.extruder.wastePct,
        },
        looms: {
          input: data.data.summary.looms.inputKg,
          output: data.data.summary.looms.outputKg,
          wastage: data.data.summary.looms.wastageKg,
          wastePct: data.data.summary.looms.wastePct,
        },
        fabric: {
          input: data.data.summary.fabricChecking.inputKg,
          output: data.data.summary.fabricChecking.outputKg,
          wastage: data.data.summary.fabricChecking.wastageKg,
          wastePct: data.data.summary.fabricChecking.wastePct,
        },
      }
    : { extruder: emptyTotals, looms: emptyTotals, fabric: emptyTotals };

  const apiSummary = data?.data?.summary;

  return { rows, totals, isLoading, apiSummary };
  ---- end original API implementation ---- */
}
