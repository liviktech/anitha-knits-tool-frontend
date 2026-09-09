import { useMemo } from 'react';
import { useMonthlyDashboard } from '@/features/dashboard/dashboard-queries';

export interface DeliveryVariantRow {
  size: { name: string };
  color: { name: string };
  chemical: { name: string };
  delivered: number;
}

export function useProductionPdfData(fromMonthStr: string, toMonthStr: string, isSample: boolean) {
  const { dashboardData, isLoading } = useMonthlyDashboard(fromMonthStr, toMonthStr, isSample ? 'SAMPLE' : 'PRODUCTION');

  return useMemo(() => {
    if (!dashboardData) return { isLoading: true, data: null };

    const extruderByVariantChemical = dashboardData.extruderProduction.byVariantChemical;
    const extruderTotal = dashboardData.production.extruder.outputKg;

    const loomsByVariantChemical = dashboardData.loomsProduction.byVariantChemical;
    const loomsTotal = dashboardData.production.looms.outputKg;

    const fabricByVariantChemical = dashboardData.fabricProduction.byVariantChemical;
    const fabricTotal = dashboardData.production.fabricChecking.outputKg;

    const deliveryMap = new Map<string, DeliveryVariantRow>();
    dashboardData.loadSent.items.forEach((item) => {
      const kg = item.loadSent?.fabricWeight ?? 0;
      const chemicalName = item.chemical?.name ?? 'Unknown';
      const key = `${item.color.id}_${item.size.id}_${item.chemical?.id ?? 'none'}`;
      const entry = deliveryMap.get(key) ?? { size: { name: item.size.name }, color: { name: item.color.name }, chemical: { name: chemicalName }, delivered: 0 };
      entry.delivered += kg;
      deliveryMap.set(key, entry);
    });

    const deliveryByVariantChemical = Array.from(deliveryMap.values());
    const deliveryTotal = dashboardData.loadSent.totals.fabricWeightKg;

    return {
      isLoading,
      data: {
        extruderByVariantChemical,
        extruderTotal,
        loomsByVariantChemical,
        loomsTotal,
        fabricByVariantChemical,
        fabricTotal,
        deliveryByVariantChemical,
        deliveryTotal,
      }
    };
  }, [dashboardData, isLoading]);
}
