import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';

interface StageInOut {
  input: number;
  output: number;
}

interface StageTotals extends StageInOut {
  wastage: number;
  wastePct: number;
  yarnWasteKg?: number;
  lumpsKg?: number;
}

export interface DayWiseRow {
  date: string; // yyyy-MM-dd
  extruder: StageTotals;
  looms: StageTotals;
  fabric: StageTotals;
}

interface ApiStageTotals {
  inputKg: number;
  outputKg: number;
  wastageKg: number;
  wastePct: number;
  efficiencyPct?: number;
  yarnWasteKg?: number;
  lumpsKg?: number;
}

interface DashboardProductionResponse {
  success: boolean;
  data: {
    range: { dateFrom: string; dateTo: string };
    summary: {
      extruder: ApiStageTotals;
      looms: ApiStageTotals;
      fabricChecking: ApiStageTotals;
    };
    daily: Array<{
      date: string;
      extruder: ApiStageTotals;
      looms: ApiStageTotals;
      fabricChecking: ApiStageTotals;
    }>;
  };
}

const emptyTotals: StageTotals = { input: 0, output: 0, wastage: 0, wastePct: 0, yarnWasteKg: 0, lumpsKg: 0 };

export const dashboardProductionKey = ['dashboard', 'production'] as const;

export function useDayWiseProduction(monthStr?: string) {
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
        yarnWasteKg: d.extruder.yarnWasteKg || 0,
        lumpsKg: d.extruder.lumpsKg || 0,
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
          yarnWasteKg: data.data.summary.extruder.yarnWasteKg || 0,
          lumpsKg: data.data.summary.extruder.lumpsKg || 0,
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
}
