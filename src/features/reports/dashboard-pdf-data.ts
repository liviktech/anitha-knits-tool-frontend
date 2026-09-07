import { useMemo } from 'react';
import { useMonthlyDashboard } from '@/features/dashboard/dashboard-queries';
import { useOpeningBalanceWastage, useOpeningBalanceFabricStock } from '@/features/admin-panel/opening-balance-queries';
import { useExtruderProductions } from '@/features/extruder/extruder-queries';

const FABRIC_STOCK_SIZES = ['150cm', '160cm', '170cm', '180cm', '190cm'] as const;
const FABRIC_COLORS = ['Blue', 'Green', 'White'] as const;

export function useDashboardReportData(monthStr: string, isSample: boolean = false) {
  const { dashboardData, isLoading: loadingDashboard } = useMonthlyDashboard(monthStr, isSample ? 'SAMPLE' : undefined);
  const { data: obWastageRes } = useOpeningBalanceWastage('?limit=100');
  const obWastage = obWastageRes?.data || [];

  const { data: obFabricStockRes } = useOpeningBalanceFabricStock('?limit=100');
  const obFabricStock = obFabricStockRes?.data || [];

  return useMemo(() => {
    if (!dashboardData) return null;

    const extruderByColorMap = new Map((dashboardData.extruderProduction?.byColor || []).map(r => [r.color.name, r]));
    const loomsByColorMap = new Map((dashboardData.loomsProduction?.byColor || []).map(r => [r.color.name, r]));
    const fabricByColorMap = new Map((dashboardData.fabricProduction.byColor || []).map(r => [r.color.name, r]));

    const extruderByColor = FABRIC_COLORS.map(color => ({
      color,
      production: extruderByColorMap.get(color)?.production ?? 0,
    }));
    const extruderTotal = dashboardData.extruderProduction?.overall.production || 0;

    const loomsByColor = FABRIC_COLORS.map(color => ({
      color,
      production: loomsByColorMap.get(color)?.production ?? 0,
    }));
    const loomsTotal = dashboardData.loomsProduction?.overall.production || 0;

    const fabricByColor = FABRIC_COLORS.map(color => ({
      color,
      production: fabricByColorMap.get(color)?.production ?? 0,
    }));
    const fabricTotal = dashboardData.fabricProduction.overall.outputKg || 0;

    const yarnBalanceByColor = FABRIC_COLORS.map(color => {
      const yarnProduced = extruderByColorMap.get(color)?.production ?? 0;
      const loomsRow = loomsByColorMap.get(color);
      const yarnConsumed = (loomsRow?.production ?? 0) + (loomsRow?.waste ?? 0);
      return { color, balance: Math.max(0, yarnProduced - yarnConsumed) };
    });

    const fabricInputByColorMap = new Map<string, number>();
    (dashboardData.fabricProduction.byVariant || []).forEach(r => {
      fabricInputByColorMap.set(r.color.name, (fabricInputByColorMap.get(r.color.name) ?? 0) + r.fabricInputKg);
    });

    const obKoraByColor = new Map<string, number>();
    if (!isSample) {
      obFabricStock.forEach(r => {
        if (r.color?.name) {
          const colorName = r.color.name.trim();
          const normalized = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase();
          obKoraByColor.set(normalized, (obKoraByColor.get(normalized) ?? 0) + r.koraBalanceKg);
        }
      });
    }

    const koraBalanceByColor = FABRIC_COLORS.map(color => {
      const obKora = obKoraByColor.get(color) ?? 0;
      const loomsOutput = loomsByColorMap.get(color)?.production ?? 0;
      const fabricInput = fabricInputByColorMap.get(color) ?? 0;
      return { color, balance: Math.max(0, obKora + loomsOutput - fabricInput) };
    });

    const fabricStockByColor = (() => {
      const byColor = new Map<string, { color: string; stockBySize: Record<string, number> }>();
      const getRow = (color: string) => {
        const existing = byColor.get(color);
        if (existing) return existing;
        const row = { color, stockBySize: {} as Record<string, number> };
        byColor.set(color, row);
        return row;
      };
      FABRIC_COLORS.forEach((color) => getRow(color));
      (dashboardData.stockBalance || []).forEach(r => {
        const row = getRow(r.color.name);
        row.stockBySize[r.size.name] = (row.stockBySize[r.size.name] || 0) + r.availableFabricStockKg;
      });

      if (!isSample) {
        obFabricStock.forEach(r => {
          if (r.color?.name && r.size?.name) {
            const colorName = r.color.name.trim();
            const normalizedColor = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase();
            const row = getRow(normalizedColor);
            row.stockBySize[r.size.name] = (row.stockBySize[r.size.name] || 0) + r.fabricStockKg;
          }
        });
      }
      return Array.from(byColor.values());
    })();
    const totalFabricStock = fabricStockByColor.reduce(
      (sum, row) => sum + Object.values(row.stockBySize).reduce((s, v) => s + v, 0),
      0,
    );

    const deliveriesByColor = FABRIC_COLORS.map(color => {
      const deliveries = (dashboardData.loadSent.items || [])
        .filter(item => item.color.name === color)
        .map(item => ({
          id: item.id,
          date: item.productionDate,
          size: item.size.name,
          kg: item.loadSent?.fabricWeight ?? 0,
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      return { color, deliveries, total: deliveries.reduce((sum, d) => sum + d.kg, 0) };
    });
    const totalDelivered = dashboardData.loadSent.totals.fabricWeightKg || 0;

    // Wastage data
    const obWastageByColor = new Map<string, { lums: number, loose: number, looms: number, fw: number, bw: number }>();
    if (!isSample) {
      obWastage.forEach(r => {
        const rawColor = r.color?.name || 'Unknown';
        const color = rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase();
        if (!obWastageByColor.has(color)) {
          obWastageByColor.set(color, { lums: 0, loose: 0, looms: 0, fw: 0, bw: 0 });
        }
        const current = obWastageByColor.get(color)!;
        current.lums += r.extruderLumpsKg || 0;
        current.loose += r.extruderLoomsWasteKg || 0;
        current.looms += r.loomsYarnWasteKg || 0;
        current.fw += r.fabricWasteKg || 0;
        current.bw += r.fabricBitwasteKg || 0;
      });
    }

    let totalObLums = 0;
    let totalObLoose = 0;
    obWastageByColor.forEach(v => {
      totalObLums += v.lums;
      totalObLoose += v.loose;
    });

    const looseWasteKg = (dashboardData.wastage.byType.find(w => w.code === 'YARN_WASTE')?.quantityKg || 0) + totalObLoose;
    const lumsWasteKg = (dashboardData.wastage.byType.find(w => w.code === 'LUMPS')?.quantityKg || 0) + totalObLums;

    const extruderByVariantMap = new Map((dashboardData.extruderProduction?.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
    const extruderWasteByVariant = FABRIC_COLORS.map(color => {
      const sizes = FABRIC_STOCK_SIZES.map(size => {
        const variantKey = `${color}_${size}`;
        const r = extruderByVariantMap.get(variantKey);
        return { size, lums: r?.lumsKg ?? 0, yarnWaste: r?.yarnWasteKg ?? 0 };
      });
      return { color, sizes };
    });

    const loomsByVariantMap = new Map((dashboardData.loomsProduction?.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
    const loomsWasteByVariant = FABRIC_COLORS.map(color => {
      const sizes = FABRIC_STOCK_SIZES.map(size => {
        const variantKey = `${color}_${size}`;
        const r = loomsByVariantMap.get(variantKey);
        return { size, loomsWaste: r?.waste ?? 0 };
      });
      return { color, sizes };
    });

    const fabricByVariantMap = new Map((dashboardData.fabricProduction.byVariant || []).map(r => [`${r.color.name}_${r.size.name}`, r]));
    const fabricWasteByVariant = FABRIC_COLORS.map(color => {
      const sizes = FABRIC_STOCK_SIZES.map(size => {
        const variantKey = `${color}_${size}`;
        const r = fabricByVariantMap.get(variantKey);
        return { size, fabricWaste: r?.fwWasteKg ?? 0, bitWaste: r?.bwWasteKg ?? 0 };
      });
      return { color, sizes };
    });

    return {
      extruderByColor,
      extruderTotal,
      loomsByColor,
      loomsTotal,
      fabricByColor,
      fabricTotal,
      yarnBalanceByColor,
      koraBalanceByColor,
      fabricStockByColor,
      totalFabricStock,
      deliveriesByColor,
      totalDelivered,
      // Wastage specific
      extruderWasteByVariant,
      loomsWasteByVariant,
      fabricWasteByVariant,
      looseWasteKg,
      lumsWasteKg,
    };
  }, [dashboardData, obFabricStock, obWastage, isSample]);
}
