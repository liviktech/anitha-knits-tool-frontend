import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/shared/loader';
import { useDayWiseProduction } from './day-wise-queries';
import { useLoadSentRecords } from '@/features/inventory/load-sent-queries';

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
  '150cm', '160cm', '170cm', '180cm', '190cm',
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

  const { rows: apiRows, totals: apiTotals, isLoading: isProdLoading } = useDayWiseProduction(selectedMonth);

  const firstDay = useMemo(() => format(new Date(year, monthIndex, 1), 'yyyy-MM-dd'), [year, monthIndex]);
  const lastDay = useMemo(() => format(new Date(year, monthIndex + 1, 0), 'yyyy-MM-dd'), [year, monthIndex]);
  const { data: loadSentData, isLoading: isLoadSentLoading } = useLoadSentRecords(`?date_from=${firstDay}&date_to=${lastDay}&limit=100`);
  const loadSentRecords = loadSentData?.data || [];

  const rows = useMemo(() => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Aggregate loadSentRecords by date
    const deliveryByDate: Record<string, any> = {};
    loadSentRecords.forEach((record) => {
      // Use record.productionDate if available, else record.date
      const d = (record as any).productionDate || record.date;
      if (!d) return;

      if (!deliveryByDate[d]) {
        deliveryByDate[d] = {
          colors: { Blue: 0, White: 0, Green: 0 },
          sizes: { '150mm': 0, '160mm': 0, '170mm': 0, '180mm': 0, '190mm': 0 },
          total: 0
        };
      }
      const w = record.loadSent?.fabricWeight ?? record.fabricWeight ?? 0;
      const c = record.color?.name || '';
      const s = record.size?.name || '';

      if (c === 'Blue') deliveryByDate[d].colors.Blue += w;
      else if (c === 'White') deliveryByDate[d].colors.White += w;
      else if (c === 'Green') deliveryByDate[d].colors.Green += w;

      if (s === '150mm') deliveryByDate[d].sizes['150mm'] += w;
      else if (s === '160mm') deliveryByDate[d].sizes['160mm'] += w;
      else if (s === '170mm') deliveryByDate[d].sizes['170mm'] += w;
      else if (s === '180mm') deliveryByDate[d].sizes['180mm'] += w;
      else if (s === '190mm') deliveryByDate[d].sizes['190mm'] += w;

      deliveryByDate[d].total += w;
    });

    const allRows = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, monthIndex, i + 1);
      const dateStr = format(d, 'yyyy-MM-dd');
      const isHighlighted = d.getDay() === 0;
      const apiRow = apiRows.find(r => r.date === dateStr);
      const del = deliveryByDate[dateStr] || {
        colors: { Blue: 0, White: 0, Green: 0 },
        sizes: { '150mm': 0, '160mm': 0, '170mm': 0, '180mm': 0, '190mm': 0 },
        total: 0
      };

      return {
        date: dateStr,
        isHighlighted,
        hasData: !!apiRow || deliveryByDate[dateStr],
        extruder: { dnPlus: apiRow?.extruder.output || 0, waste: apiRow?.extruder.wastage || 0, lums: 0 },
        loomsProduction: { c180A: 0, dnPlus180: 0, c180B: 0, total: apiRow?.looms.output || 0 },
        loomsWaste: { white: 0, blue: 0, total: apiRow?.looms.wastage || 0 },
        fabricChecking: { white: 0, blue: 0, total: apiRow?.fabric.output || 0 },
        fabricWaste: { fwWhite180: 0, fwBlue180: 0, white: 0, blue: 0, total: apiRow?.fabric.wastage || 0 },
        delivery: {
          blue: del.colors.Blue, white: del.colors.White, green: del.colors.Green,
          s150: del.sizes['150mm'], s160: del.sizes['160mm'], s170: del.sizes['170mm'], s180: del.sizes['180mm'], s190: del.sizes['190mm'],
          output: del.total
        }
      };
    });

    return allRows.filter(r => r.hasData);
  }, [year, monthIndex, apiRows, loadSentRecords]);

  // Calculate delivery totals
  const deliveryTotals = useMemo(() => {
    const t = {
      blue: 0, white: 0, green: 0,
      s150: 0, s160: 0, s170: 0, s180: 0, s190: 0,
      output: 0
    };
    rows.forEach(r => {
      t.blue += r.delivery.blue; t.white += r.delivery.white; t.green += r.delivery.green;
      t.s150 += r.delivery.s150; t.s160 += r.delivery.s160; t.s170 += r.delivery.s170; t.s180 += r.delivery.s180; t.s190 += r.delivery.s190;
      t.output += r.delivery.output;
    });
    return t;
  }, [rows]);

  const isLoading = isProdLoading || isLoadSentLoading;

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
              {rows.length > 0 ? rows.map((row) => {
                const values = [
                  row.extruder.dnPlus, row.extruder.waste, row.extruder.lums,
                  row.loomsProduction.c180A, row.loomsProduction.dnPlus180, row.loomsProduction.c180B, row.loomsProduction.total,
                  row.loomsWaste.white, row.loomsWaste.blue, row.loomsWaste.total,
                  row.fabricChecking.white, row.fabricChecking.blue, row.fabricChecking.total,
                  row.fabricWaste.fwWhite180, row.fabricWaste.fwBlue180, row.fabricWaste.white, row.fabricWaste.blue, row.fabricWaste.total,
                  row.delivery.blue, row.delivery.white, row.delivery.green,
                  row.delivery.s150, row.delivery.s160, row.delivery.s170, row.delivery.s180, row.delivery.s190,
                  row.delivery.output
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
              }) : (
                <tr>
                  <td colSpan={28} className="border border-gray-200 px-3 py-6 text-center text-gray-500">
                    No production or delivery records found for this month.
                  </td>
                </tr>
              )}
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
                  deliveryTotals.blue, deliveryTotals.white, deliveryTotals.green,
                  deliveryTotals.s150, deliveryTotals.s160, deliveryTotals.s170, deliveryTotals.s180, deliveryTotals.s190,
                  deliveryTotals.output
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
