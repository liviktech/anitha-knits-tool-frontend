import { useMemo } from 'react';
import { useMonthlyDashboard } from '@/features/dashboard/dashboard-queries';

export interface DeliveryBreakdownRow {
  label: string;
  delivered: number;
}

export function useProductionPdfData(monthStr: string, isSample: boolean) {
  const { dashboardData, isLoading } = useMonthlyDashboard(monthStr, isSample ? 'SAMPLE' : 'PRODUCTION');

  return useMemo(() => {
    if (!dashboardData) return { isLoading: true, data: null };

    const extruderByColor = dashboardData.extruderProduction.byColor;
    const extruderBySize = dashboardData.extruderProduction.bySize;
    const extruderByChemical = dashboardData.extruderProduction.byChemical;
    const extruderTotal = dashboardData.production.extruder.outputKg;

    const loomsByColor = dashboardData.loomsProduction.byColor;
    const loomsBySize = dashboardData.loomsProduction.bySize;
    const loomsByChemical = dashboardData.loomsProduction.byChemical;
    const loomsTotal = dashboardData.production.looms.outputKg;

    const fabricByColor = dashboardData.fabricProduction.byColor;
    const fabricBySize = dashboardData.fabricProduction.bySize;
    const fabricByChemical = dashboardData.fabricProduction.byChemical;
    const fabricTotal = dashboardData.production.fabricChecking.outputKg;

    const colorDeliveryMap = new Map<string, { label: string; delivered: number }>();
    const sizeDeliveryMap = new Map<string, { label: string; delivered: number }>();

    dashboardData.loadSent.items.forEach((item) => {
      const kg = item.loadSent?.fabricWeight ?? 0;
      
      const colorEntry = colorDeliveryMap.get(item.color.id) ?? { label: item.color.name, delivered: 0 };
      colorEntry.delivered += kg;
      colorDeliveryMap.set(item.color.id, colorEntry);

      const sizeEntry = sizeDeliveryMap.get(item.size.id) ?? { label: item.size.name, delivered: 0 };
      sizeEntry.delivered += kg;
      sizeDeliveryMap.set(item.size.id, sizeEntry);
    });

    const deliveryByColor = Array.from(colorDeliveryMap.values());
    const deliveryBySize = Array.from(sizeDeliveryMap.values());
    const deliveryTotal = dashboardData.loadSent.totals.fabricWeightKg;

    return {
      isLoading,
      data: {
        extruderByColor,
        extruderBySize,
        extruderByChemical,
        extruderTotal,
        loomsByColor,
        loomsBySize,
        loomsByChemical,
        loomsTotal,
        fabricByColor,
        fabricBySize,
        fabricByChemical,
        fabricTotal,
        deliveryByColor,
        deliveryBySize,
        deliveryTotal,
      }
    };
  }, [dashboardData, isLoading]);
}
