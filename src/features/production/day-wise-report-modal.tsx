import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/shared/loader';
import { useDayWiseProduction } from './day-wise-queries';

interface DayWiseReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRODUCTION_GROUPS = [
  { label: 'Extruder Production', span: 3, bg: '#D6EEF7', fg: '#0B5566' },
  { label: 'Looms Production', span: 4, bg: '#FFF6BF', fg: '#7A6A00' },
  { label: 'Looms Waste', span: 3, bg: '#FBE0C8', fg: '#8A4B12' },
  { label: 'Fabric Checking', span: 3, bg: '#DCEEDB', fg: '#2F6B2F' },
  { label: 'Fabric Waste', span: 5, bg: '#EAE1F5', fg: '#5B3E8A' },
];

const DELIVERY_GROUPS = [
  { label: 'Color', span: 3, bg: '#FFEBB5', fg: '#997300' },
  { label: 'Size', span: 5, bg: '#FFEBB5', fg: '#997300' },
  { label: 'Total', span: 1, bg: '#FFEBB5', fg: '#997300' },
];

const PROD_SUB_HEADERS = [
  'DN+', 'Waste', 'LUMS',
  '180', 'DN+180', '180', 'Total',
  'White', 'Blue', 'Total',
  'White', 'Blue', 'Total',
  'FW White 180', 'FW Blue 180', 'White', 'Blue', 'W Total',
];

const DEL_SUB_HEADERS = [
  'Blue', 'White', 'Green',
  '150mm', '160mm', '170mm', '180mm', '190mm',
  'Output'
];


function fmt(n: number): string {
  return n === 0 ? '' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Cell({ value }: { value: string | number }) {
  const displayValue = typeof value === 'number' ? fmt(value) : value;
  return (
    <td className="border border-gray-200 px-2 py-1 text-right text-[12.5px] whitespace-nowrap text-gray-900">
      {displayValue}
    </td>
  );
}

export function DayWiseReportModal({ open, onOpenChange }: DayWiseReportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const { year, monthIndex } = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return { year: y, monthIndex: m - 1 };
  }, [selectedMonth]);

  const { rows: apiRows, totals: apiTotals, isLoading } = useDayWiseProduction(selectedMonth);

  const rows = useMemo(() => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, monthIndex, i + 1);
      const dateStr = format(d, 'yyyy-MM-dd');
      const isHighlighted = d.getDay() === 0;
      const apiRow = apiRows.find(r => r.date === dateStr);

      return {
        date: dateStr,
        isHighlighted,
        extruder: { dnPlus: apiRow?.extruder.output || 0, waste: apiRow?.extruder.wastage || 0, lums: 0 },
        loomsProduction: { c180A: 0, dnPlus180: 0, c180B: 0, total: apiRow?.looms.output || 0 },
        loomsWaste: { white: 0, blue: 0, total: apiRow?.looms.wastage || 0 },
        fabricChecking: { white: 0, blue: 0, total: apiRow?.fabric.output || 0 },
        fabricWaste: { fwWhite180: 0, fwBlue180: 0, white: 0, blue: 0, total: apiRow?.fabric.wastage || 0 },
        delivery: { color: 0, size: 0, output: 0 }
      };
    });
  }, [year, monthIndex, apiRows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-col items-start gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <DialogTitle>Day Wise Production & Wastage Report</DialogTitle>
            <p className="text-[12.5px] text-gray-500 font-medium mt-1">Detailed monthly report — populated from live API endpoints.</p>
          </div>
          <div className="flex items-center gap-6 mr-7">
            {isLoading && <Loader size="sm" className="text-gray-400" />}
            <Input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-40 font-medium bg-white"
            />
          </div>
        </DialogHeader>

        <div className="overflow-auto border border-gray-200 rounded-md">
          <table className="border-collapse text-sm w-full">
            <thead>
              <tr>
                <th rowSpan={3} className="border border-gray-200 bg-gray-50 px-3 py-1.5 text-left text-[12.5px] font-bold align-middle sticky left-0 z-10">
                  Date
                </th>
                <th colSpan={18} className="border border-gray-200 px-2 py-1.5 text-center text-[13.5px] font-extrabold uppercase tracking-widest bg-gray-100 text-gray-800">
                  Production
                </th>
                <th colSpan={9} className="border border-gray-200 px-2 py-1.5 text-center text-[13.5px] font-extrabold uppercase tracking-widest bg-[#FFF4D4] text-[#8A6700]">
                  Delivery
                </th>
              </tr>
              <tr>
                {PRODUCTION_GROUPS.map((g) => (
                  <th
                    key={g.label}
                    colSpan={g.span}
                    className="border border-gray-200 px-2 py-1.5 text-center text-[11.5px] font-bold uppercase tracking-wide"
                    style={{ background: g.bg, color: g.fg }}
                  >
                    {g.label}
                  </th>
                ))}
                {DELIVERY_GROUPS.map((g) => (
                  <th
                    key={g.label}
                    colSpan={g.span}
                    className="border border-gray-200 px-2 py-1.5 text-center text-[11.5px] font-bold uppercase tracking-wide"
                    style={{ background: g.bg, color: g.fg }}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr>
                {PROD_SUB_HEADERS.map((h, i) => (
                  <th key={`p-${i}`} className="border border-gray-200 bg-gray-50 px-2 py-1 text-right text-[11px] font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
                {DEL_SUB_HEADERS.map((h, i) => (
                  <th key={`d-${i}`} className="border border-gray-200 bg-gray-50 px-2 py-1 text-right text-[11px] font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const values = [
                  row.extruder.dnPlus, row.extruder.waste, row.extruder.lums,
                  row.loomsProduction.c180A, row.loomsProduction.dnPlus180, row.loomsProduction.c180B, row.loomsProduction.total,
                  row.loomsWaste.white, row.loomsWaste.blue, row.loomsWaste.total,
                  row.fabricChecking.white, row.fabricChecking.blue, row.fabricChecking.total,
                  row.fabricWaste.fwWhite180, row.fabricWaste.fwBlue180, row.fabricWaste.white, row.fabricWaste.blue, row.fabricWaste.total,
                  0, 0, 0, // Colors
                  0, 0, 0, 0, 0, // Sizes
                  0 // Output
                ];
                return (
                  <tr key={row.date} className="hover:bg-gray-50">
                    <td
                      className="border border-gray-200 px-3 py-1 text-[12.5px] font-medium whitespace-nowrap sticky left-0 z-10 bg-white text-gray-900"
                    >
                      {format(parseISO(row.date), 'd-MMM-yy')}
                    </td>
                    {values.map((v, i) => (
                      <Cell key={i} value={v} />
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-200 px-3 py-1.5 text-[12.5px] sticky left-0 bg-gray-100 z-10">TOTAL</td>
                {[
                  apiTotals.extruder.output, apiTotals.extruder.wastage, 0,
                  0, 0, 0, apiTotals.looms.output,
                  0, 0, apiTotals.looms.wastage,
                  0, 0, apiTotals.fabric.output,
                  0, 0, 0, 0, apiTotals.fabric.wastage,
                  0, 0, 0,
                  0, 0, 0, 0, 0,
                  0
                ].map((v, i) => (
                  <td
                    key={i}
                    className="border border-gray-200 px-2 py-1.5 text-right text-[12.5px] whitespace-nowrap text-gray-900"
                  >
                    {fmt(v)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
