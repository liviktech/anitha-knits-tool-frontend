// Static figures for the Dashboard overview screen. Mirrors the approved design
// mock exactly; swap these for API-backed values once the endpoints land.

export const rawMaterialStock = {
  totalCategories: 3,
  totalKg: 6480,
  groups: [
    {
      name: 'HDPE',
      totalKg: 6000,
      items: [
        { name: 'Haldia', kg: 1500, color: '#3B82F6' },
        { name: 'Ghail', kg: 1500, color: '#8B5CF6' },
        { name: 'Opel', kg: 1500, color: '#14B8A6' },
        { name: 'Reliance', kg: 1500, color: '#22C55E' },
      ],
    },
    {
      name: 'Chemicals',
      totalKg: 300,
      items: [
        { name: 'ACM', kg: 150, color: '#F97316' },
        { name: 'DN+MB', kg: 150, color: '#EF4444' },
      ],
    },
    {
      name: 'Colors',
      totalKg: 180,
      items: [
        { name: 'Blue', kg: 60, color: '#3B82F6' },
        { name: 'White', kg: 60, color: '#A855F7' },
        { name: 'Green', kg: 60, color: '#22C55E' },
      ],
    },
  ],
};

export const fabricStock = {
  totalKg: 8745.6,
  totalRolls: 128,
  totalColors: 24,
  topColors: [
    { name: 'White', kg: 3250.4, color: '#D1D5DB' },
    { name: 'Blue', kg: 2840.3, color: '#1D4ED8' },
    { name: 'Green', kg: 2654.9, color: '#15803D' },
  ],
};

export const wastageStock = {
  totalKg: 356.4,
  todayKg: 18.6,
  vsYesterdayPct: 6.2,
  byType: [
    { name: 'Extruder', kg: 128.4 },
    { name: 'Looms Production', kg: 156.2 },
    { name: 'Fabric Checking', kg: 71.8 },
  ],
};

export const fabricDelivered = {
  totalKg: 6245.75,
  totalOrders: 42,
  thisMonthKg: 1245.3,
  byColor: [
    { name: 'White', kg: 2456.9, orders: 18, color: '#D1D5DB' },
    { name: 'Blue', kg: 2378.4, orders: 16, color: '#1D4ED8' },
    { name: 'Green', kg: 1410.45, orders: 8, color: '#15803D' },
  ],
};

export const productionOverview = {
  rawMaterialInKg: 12400,
  rawMaterialSource: 'Parent Company',
  extruder: { outputKg: 9831.3, efficiencyPct: 123.3 },
  looms: { outputMtrs: 1835, efficiencyPct: 87.4 },
  fabric: { outputMtrs: 2368, efficiencyPct: 88.1 },
};

export const lastUpdated = '25 May, 2025 10:30 AM';
export const dashboardDate = '25 May, 2025';
