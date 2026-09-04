import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';
import type { InventoryType } from '@/features/inventory/inventory-queries';

export interface WastageCategorySummary {
  code: string;
  name: string;
  stage: string;
  quantityKg: number;
}

export interface ExtruderProductionVariantSummary {
  color: { id: string; name: string };
  size: { id: string; name: string };
  production: number;
  lumsKg: number;
  yarnWasteKg: number;
  total: number;
}

export interface ExtruderProductionColorSummary {
  color: { id: string; name: string };
  production: number;
  lumsKg: number;
  yarnWasteKg: number;
  waste: number;
  total: number;
}

export interface LoomsProductionVariantSummary {
  color: { id: string; name: string };
  size: { id: string; name: string };
  production: number;
  waste: number;
  total: number;
}

export interface LoomsProductionColorSummary {
  color: { id: string; name: string };
  production: number;
  waste: number;
  total: number;
}

export interface FabricProductionVariantSummary {
  color: { id: string; name: string };
  size: { id: string; name: string };
  fabricInputKg: number;
  outputKg: number;
  fwWasteKg: number;
  bwWasteKg: number;
  total: number;
}

export interface FabricProductionColorSummary {
  color: { id: string; name: string };
  production: number;
  fwWasteKg: number;
  bwWasteKg: number;
  total: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  weightKg: number;
  bagCount: number | null;
}

export interface LoadSentItem {
  id: string;
  productionDate: string;
  color: { id: string; name: string };
  size: { id: string; name: string };
  loadSent: { fabricWeight: number; fwWeight: number; bwWeight: number } | null;
}

export interface StockBalance {
  color: { id: string; name: string };
  size: { id: string; name: string };
  availableFabricStockKg: number;
  availableFwStockKg: number;
  availableBwStockKg: number;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    range: { month: number; year: number; dateFrom: string; dateTo: string };
    inventory: Record<InventoryType, { totalWeightKg: number; items: InventoryItem[] }>;
    loadSent: {
      items: LoadSentItem[];
      totals: { fabricWeightKg: number; fwWeightKg: number; bwWeightKg: number };
      daily: { date: string; quantityKg: number }[];
    };
    fabricProduction: {
      byVariant: FabricProductionVariantSummary[];
      byColor: FabricProductionColorSummary[];
      overall: { fabricInputKg: number; outputKg: number };
    };
    production: {
      extruder: { inputKg: number; outputKg: number };
      looms: { inputKg: number; outputKg: number };
      fabricChecking: { inputKg: number; outputKg: number };
    };
    wastage: {
      byType: WastageCategorySummary[];
      totalKg: number;
    };
    extruderProduction: {
      byVariant: ExtruderProductionVariantSummary[];
      byColor: ExtruderProductionColorSummary[];
      overall: { production: number };
    };
    loomsProduction: {
      byVariant: LoomsProductionVariantSummary[];
      byColor: LoomsProductionColorSummary[];
      overall: { production: number };
    };
    stockBalance: StockBalance[];
  };
}

export const monthlyDashboardKey = ['dashboard', 'monthly'] as const;

export function useMonthlyDashboard(monthStr?: string) {
  const queryKey = monthStr ? [...monthlyDashboardKey, monthStr] : monthlyDashboardKey;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      let url = '/dashboard';
      if (monthStr) {
        const [year, month] = monthStr.split('-');
        url += `?year=${year}&month=${month}`;
      }
      return fetchJson<DashboardResponse>(url);
    },
  });

  return { dashboardData: data?.data, isLoading };
}
