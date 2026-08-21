import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateMonthReport, monthOptions, sumReportRows } from './day-wise-report-mock';

interface DayWiseReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_HEADERS = [
  { label: 'Extruder Production', span: 3, bg: '#D6EEF7', fg: '#0B5566' },
  { label: 'Looms Production', span: 4, bg: '#FFF6BF', fg: '#7A6A00' },
  { label: 'Looms Waste', span: 3, bg: '#FBE0C8', fg: '#8A4B12' },
  { label: 'Fabric Checking', span: 3, bg: '#DCEEDB', fg: '#2F6B2F' },
  { label: 'Fabric Waste', span: 5, bg: '#EAE1F5', fg: '#5B3E8A' },
];

const SUB_HEADERS = [
  'DN+', 'Waste', 'LUMS',
  '180', 'DN+180', '180', 'Total',
  'White', 'Blue', 'Total',
  'White', 'Blue', 'Total',
  'FW White 180', 'FW Blue 180', 'White', 'Blue', 'W Total',
];

const BLUE_FILL_COLS = new Set([5, 8, 10]); // 2nd "180", Looms Waste "Blue", Fabric Checking "White"
const BLUE_FILL = '#9DC3E6';

function fmt(n: number): string {
  return n === 0 ? '' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Cell({ value, col, red }: { value: number; col: number; red?: boolean }) {
  return (
    <td
      className="border border-gray-200 px-2 py-1 text-right text-[12.5px] whitespace-nowrap"
      style={{
        background: BLUE_FILL_COLS.has(col) ? BLUE_FILL : undefined,
        color: red ? '#D32F2F' : '#1f2937',
      }}
    >
      {fmt(value)}
    </td>
  );
}

export function DayWiseReportModal({ open, onOpenChange }: DayWiseReportModalProps) {
  const options = useMemo(() => monthOptions(12), []);
  const [selected, setSelected] = useState(`${options[0].year}-${options[0].monthIndex}`);
  const { year, monthIndex } = useMemo(() => {
    const [y, m] = selected.split('-').map(Number);
    return { year: y, monthIndex: m };
  }, [selected]);

  const rows = useMemo(() => generateMonthReport(year, monthIndex), [year, monthIndex]);
  const total = useMemo(() => sumReportRows(rows), [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-col items-start gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <DialogTitle>Day Wise Production & Wastage Report</DialogTitle>
            <p className="text-[12.5px] text-gray-500 font-medium mt-1">Illustrative monthly report — colors match the reference layout.</p>
          </div>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={`${o.year}-${o.monthIndex}`} value={`${o.year}-${o.monthIndex}`}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogHeader>

        <div className="overflow-auto border border-gray-200 rounded-md">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-gray-200 bg-gray-50 px-3 py-1.5 text-left text-[12.5px] font-bold align-middle sticky left-0 z-10">
                  Date
                </th>
                {GROUP_HEADERS.map((g) => (
                  <th
                    key={g.label}
                    colSpan={g.span}
                    className="border border-gray-200 px-2 py-1.5 text-center text-[12px] font-bold uppercase tracking-wide"
                    style={{ background: g.bg, color: g.fg }}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr>
                {SUB_HEADERS.map((h, i) => (
                  <th key={i} className="border border-gray-200 bg-gray-50 px-2 py-1 text-right text-[11.5px] font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const red = row.isHighlighted;
                const values = [
                  row.extruder.dnPlus, row.extruder.waste, row.extruder.lums,
                  row.loomsProduction.c180A, row.loomsProduction.dnPlus180, row.loomsProduction.c180B, row.loomsProduction.total,
                  row.loomsWaste.white, row.loomsWaste.blue, row.loomsWaste.total,
                  row.fabricChecking.white, row.fabricChecking.blue, row.fabricChecking.total,
                  row.fabricWaste.fwWhite180, row.fabricWaste.fwBlue180, row.fabricWaste.white, row.fabricWaste.blue, row.fabricWaste.total,
                ];
                return (
                  <tr key={row.date} className={red ? 'bg-red-50/40' : undefined}>
                    <td
                      className="border border-gray-200 px-3 py-1 text-[12.5px] font-medium whitespace-nowrap sticky left-0 bg-white z-10"
                      style={{ color: red ? '#D32F2F' : '#1f2937' }}
                    >
                      {format(parseISO(row.date), 'd-MMM-yy')}
                    </td>
                    {values.map((v, i) => (
                      <Cell key={i} value={v} col={i} red={red} />
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-200 px-3 py-1.5 text-[12.5px] sticky left-0 bg-gray-100 z-10">TOTAL</td>
                {[
                  total.extruder.dnPlus, total.extruder.waste, total.extruder.lums,
                  total.loomsProduction.c180A, total.loomsProduction.dnPlus180, total.loomsProduction.c180B, total.loomsProduction.total,
                  total.loomsWaste.white, total.loomsWaste.blue, total.loomsWaste.total,
                  total.fabricChecking.white, total.fabricChecking.blue, total.fabricChecking.total,
                  total.fabricWaste.fwWhite180, total.fabricWaste.fwBlue180, total.fabricWaste.white, total.fabricWaste.blue, total.fabricWaste.total,
                ].map((v, i) => (
                  <td
                    key={i}
                    className="border border-gray-200 px-2 py-1.5 text-right text-[12.5px] whitespace-nowrap"
                    style={{ background: BLUE_FILL_COLS.has(i) ? BLUE_FILL : undefined }}
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
