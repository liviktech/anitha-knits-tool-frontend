// Mirrors production-design-2.tsx's local stageTheme (not exported there) so the Sample
// Production day-detail view keeps the same per-stage colour language as real Production.
export const stageTheme = {
  extruder: {
    circle: 'bg-[#0B8457]',
    text: 'text-[#0B8457]',
    iconBg: 'bg-[#0B8457]',
    iconColor: 'text-white',
    pillBg: 'bg-emerald-50',
    pillText: 'text-emerald-700',
    pillBorder: 'border-emerald-100',
  },
  looms: {
    circle: 'bg-[#1D4E89]',
    text: 'text-[#1D4E89]',
    iconBg: 'bg-[#1D4E89]',
    iconColor: 'text-white',
    pillBg: 'bg-blue-50',
    pillText: 'text-blue-700',
    pillBorder: 'border-blue-100',
  },
  fabric: {
    circle: 'bg-[#6D3FA0]',
    text: 'text-[#6D3FA0]',
    iconBg: 'bg-[#6D3FA0]',
    iconColor: 'text-white',
    pillBg: 'bg-purple-50',
    pillText: 'text-purple-700',
    pillBorder: 'border-purple-100',
  },
  fabricDelivered: {
    circle: 'bg-[#61401E]',
    text: 'text-[#61401E]',
    iconBg: 'bg-[#61401E]',
    iconColor: 'text-white',
    pillBg: 'bg-[#f2caa0]',
    pillText: 'text-[#61401E]',
    pillBorder: 'border-gray-400',
  },
} as const;
