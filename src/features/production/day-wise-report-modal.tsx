import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/shared/loader';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDayWiseProduction } from './day-wise-queries';
import { useLoadSentRecords } from '@/features/inventory/load-sent-queries';

interface DayWiseReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRODUCTION_GROUPS = [
  { label: 'Extruder Production', span: 4, bg: '#D6EEF7', fg: '#0B5566' },
  { label: 'Looms Production', span: 4, bg: '#FFF6BF', fg: '#7A6A00' },
  { label: 'Fabric Checking', span: 3, bg: '#DCEEDB', fg: '#2F6B2F' },
  { label: 'Fabric Waste', span: 5, bg: '#EAE1F5', fg: '#5B3E8A' },
];

const DELIVERY_GROUPS = [
  { label: 'Color', span: 3, bg: '#FFEBB5', fg: '#997300' },
  { label: 'Size', span: 5, bg: '#FFEBB5', fg: '#997300' },
  { label: 'Total', span: 1, bg: '#FFEBB5', fg: '#997300' },
];

const PROD_SUB_HEADERS = [
  'HDPE', 'Looms Waste', 'LUMS', 'Total',
  '180', 'DN+180', '180', 'Total',
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

function Cell({ value, isLast }: { value: string | number; isLast?: boolean }) {
  const displayValue = typeof value === 'number' ? fmt(value) : value;
  return (
    <TableCell className={`${isLast ? '' : 'border-r'} border-gray-100 px-2 py-1 text-right text-[12.5px] whitespace-nowrap text-gray-900`}>
      {displayValue}
    </TableCell>
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
        extruder: {
          hdpe: apiRow?.extruder.input || 0,
          loomsWaste: apiRow?.extruder.yarnWasteKg || 0,
          lums: apiRow?.extruder.lumpsKg || 0,
          total: apiRow?.extruder.output || 0
        },
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

  const escapeCsvField = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const handleDownloadCsv = () => {
    const prodHeaders: string[] = [];
    let si = 0;
    PRODUCTION_GROUPS.forEach(g => {
      for (let i = 0; i < g.span; i++) { prodHeaders.push(`${g.label} - ${PROD_SUB_HEADERS[si]}`); si++; }
    });
    const delHeaders: string[] = [];
    si = 0;
    DELIVERY_GROUPS.forEach(g => {
      for (let i = 0; i < g.span; i++) { delHeaders.push(`Delivery ${g.label} - ${DEL_SUB_HEADERS[si]}`); si++; }
    });
    const header = ['Date', ...prodHeaders, ...delHeaders];

    const dataRows = rows.map(row => {
      const values = [
        row.extruder.hdpe, row.extruder.loomsWaste, row.extruder.lums, row.extruder.total,
        row.loomsProduction.c180A, row.loomsProduction.dnPlus180, row.loomsProduction.c180B, row.loomsProduction.total,
        row.fabricChecking.white, row.fabricChecking.blue, row.fabricChecking.total,
        row.fabricWaste.fwWhite180, row.fabricWaste.fwBlue180, row.fabricWaste.white, row.fabricWaste.blue, row.fabricWaste.total,
        row.delivery.blue, row.delivery.white, row.delivery.green,
        row.delivery.s150, row.delivery.s160, row.delivery.s170, row.delivery.s180, row.delivery.s190,
        row.delivery.output
      ];
      return [format(parseISO(row.date), 'd-MMM-yy'), ...values.map(v => v.toFixed(2))];
    });

    const totalRow = [
      'TOTAL',
      ...[
        apiTotals.extruder.input, apiTotals.extruder.yarnWasteKg || 0, apiTotals.extruder.lumpsKg || 0, apiTotals.extruder.output,
        0, 0, 0, apiTotals.looms.output,
        0, 0, apiTotals.fabric.output,
        0, 0, 0, 0, apiTotals.fabric.wastage,
        deliveryTotals.blue, deliveryTotals.white, deliveryTotals.green,
        deliveryTotals.s150, deliveryTotals.s160, deliveryTotals.s170, deliveryTotals.s180, deliveryTotals.s190,
        deliveryTotals.output
      ].map(v => v.toFixed(2)),
    ];

    const csvLines = [header, ...dataRows, totalRow].map(row => row.map(escapeCsvField).join(','));
    const csvContent = '﻿' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `production-report-${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-col items-start gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <DialogTitle>Day Wise Production & Wastage Report</DialogTitle>
          </div>
          <div className="flex items-center gap-3 mr-7">
            {isLoading && <Loader size="sm" className="text-gray-400" />}
            <Input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-40 font-medium bg-white"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-full border-[#004D40]/30 text-[#004D40] hover:bg-[#004D40]/10"
              onClick={handleDownloadCsv}
              disabled={rows.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead rowSpan={3} className="h-auto border-r border-gray-100 bg-gray-50 px-3 py-1.5 text-left text-[12.5px] font-extrabold uppercase tracking-wide text-gray-500 align-middle sticky left-0 z-10">
                  Date
                </TableHead>
                <TableHead colSpan={18} className="h-auto border-r border-gray-100 px-2 py-1.5 text-center text-[13.5px] font-extrabold uppercase tracking-widest bg-gray-100 text-gray-800">
                  Production
                </TableHead>
                <TableHead colSpan={9} className="h-auto px-2 py-1.5 text-center text-[13.5px] font-extrabold uppercase tracking-widest bg-[#FFF4D4] text-[#8A6700]">
                  Delivery
                </TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                {PRODUCTION_GROUPS.map((g) => (
                  <TableHead
                    key={g.label}
                    colSpan={g.span}
                    className="h-auto border-r border-gray-100 px-2 py-1.5 text-center text-[11.5px] font-extrabold uppercase tracking-wide"
                    style={{ background: g.bg, color: g.fg }}
                  >
                    {g.label}
                  </TableHead>
                ))}
                {DELIVERY_GROUPS.map((g, i) => (
                  <TableHead
                    key={g.label}
                    colSpan={g.span}
                    className={`h-auto ${i === DELIVERY_GROUPS.length - 1 ? '' : 'border-r'} border-gray-100 px-2 py-1.5 text-center text-[11.5px] font-extrabold uppercase tracking-wide`}
                    style={{ background: g.bg, color: g.fg }}
                  >
                    {g.label}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow className="hover:bg-transparent">
                {PROD_SUB_HEADERS.map((h, i) => (
                  <TableHead key={`p-${i}`} className="h-auto border-r border-gray-100 bg-gray-50 px-2 py-1 text-right text-[10.5px] font-extrabold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
                {DEL_SUB_HEADERS.map((h, i) => (
                  <TableHead key={`d-${i}`} className={`h-auto ${i === DEL_SUB_HEADERS.length - 1 ? '' : 'border-r'} border-gray-100 bg-gray-50 px-2 py-1 text-right text-[10.5px] font-extrabold uppercase tracking-wide text-gray-500 whitespace-nowrap`}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? rows.map((row) => {
                const values = [
                  row.extruder.hdpe, row.extruder.loomsWaste, row.extruder.lums, row.extruder.total,
                  row.loomsProduction.c180A, row.loomsProduction.dnPlus180, row.loomsProduction.c180B, row.loomsProduction.total,
                  row.fabricChecking.white, row.fabricChecking.blue, row.fabricChecking.total,
                  row.fabricWaste.fwWhite180, row.fabricWaste.fwBlue180, row.fabricWaste.white, row.fabricWaste.blue, row.fabricWaste.total,
                  row.delivery.blue, row.delivery.white, row.delivery.green,
                  row.delivery.s150, row.delivery.s160, row.delivery.s170, row.delivery.s180, row.delivery.s190,
                  row.delivery.output
                ];
                return (
                  <TableRow key={row.date} className="hover:bg-gray-50/70">
                    <TableCell className="border-r border-gray-100 px-3 py-1 text-[12.5px] font-medium whitespace-nowrap sticky left-0 z-10 bg-white text-gray-900">
                      {format(parseISO(row.date), 'd-MMM-yy')}
                    </TableCell>
                    {values.map((v, i) => (
                      <Cell key={i} value={v} isLast={i === values.length - 1} />
                    ))}
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={28} className="px-3 py-6 !text-center text-gray-500">
                    No production or delivery records found for this month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-gray-50 font-bold hover:bg-gray-50">
                <TableCell className="border-r border-gray-100 px-3 py-1.5 text-[12.5px] sticky left-0 bg-gray-50 z-10">TOTAL</TableCell>
                {[
                  apiTotals.extruder.input, apiTotals.extruder.yarnWasteKg || 0, apiTotals.extruder.lumpsKg || 0, apiTotals.extruder.output,
                  0, 0, 0, apiTotals.looms.output,
                  0, 0, apiTotals.fabric.output,
                  0, 0, 0, 0, apiTotals.fabric.wastage,
                  deliveryTotals.blue, deliveryTotals.white, deliveryTotals.green,
                  deliveryTotals.s150, deliveryTotals.s160, deliveryTotals.s170, deliveryTotals.s180, deliveryTotals.s190,
                  deliveryTotals.output
                ].map((v, i, arr) => (
                  <TableCell
                    key={i}
                    className={`${i === arr.length - 1 ? '' : 'border-r'} border-gray-100 px-2 py-1.5 text-right text-[12.5px] whitespace-nowrap text-gray-900`}
                  >
                    {fmt(v)}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
