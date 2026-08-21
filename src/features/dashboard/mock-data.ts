// Illustrative placeholder figures for the Employees and Expenses modules,
// which are not yet built. Shared across dashboard designs so both candidates
// present the same underlying numbers, styled differently per design.

export const mockEmployeeSnapshot = {
  totalEmployees: 84,
  presentToday: 78,
  onLeave: 6,
  monthlyWageRun: 412500,
};

export const mockDepartmentHeadcount = [
  { department: 'Extruder', count: 22 },
  { department: 'Looms', count: 34 },
  { department: 'Fabric Checking', count: 18 },
  { department: 'Admin & Stores', count: 10 },
];

export const mockAttendanceTrend = [
  { day: 'Mon', present: 76 },
  { day: 'Tue', present: 79 },
  { day: 'Wed', present: 74 },
  { day: 'Thu', present: 80 },
  { day: 'Fri', present: 81 },
  { day: 'Sat', present: 77 },
  { day: 'Sun', present: 78 },
];

export const mockExpenseBreakdown = [
  { category: 'Raw Material', amount: 185000 },
  { category: 'Wages', amount: 412500 },
  { category: 'Utilities', amount: 64000 },
  { category: 'Maintenance', amount: 38500 },
];

export const mockRawMaterialIntake = {
  receivedThisMonthKg: 12400,
  lastDeliveryDate: '2026-08-18',
  source: 'Parent Company',
};
