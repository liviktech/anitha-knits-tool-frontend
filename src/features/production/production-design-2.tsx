import { useMemo, useState } from 'react';
import '@fontsource-variable/hanken-grotesk';
import { parseISO, format } from 'date-fns';
import { Calendar, Plus, Edit, Trash2, Filter, Download, Layers } from 'lucide-react';
import { Loader } from '@/components/shared/loader';
import extruderIcon from '@/assets/extruder-icon.png';
import loomsIcon from '@/assets/looms-icon.png';
import { useExtruderSummary } from '@/features/extruder/extruder-queries';
import { useLoomsSummary } from '@/features/looms/loom-queries';
import { useFabricCheckingSummary } from '@/features/fabric/fabric-queries';
import { useDayWiseProduction } from './day-wise-queries';
import { NewEntry } from './new-entry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis');
    result.push(p);
    prev = p;
  }
  return result;
}

export function ProductionDesign2() {
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const { summary: extruderSummary, isLoading: loadingSummary } = useExtruderSummary();
  const { summary: loomsSummary } = useLoomsSummary();
  const { summary: fabricSummary } = useFabricCheckingSummary();
  const { rows: dayWiseRows, totals: dayWiseTotals, isLoading: loadingDayWise } = useDayWiseProduction();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(dayWiseRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(
    () => dayWiseRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [dayWiseRows, currentPage, pageSize],
  );

  if (loadingSummary) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader size="xl" />
          Loading production details...
        </div>
      </div>
    );
  }

  const efficiency = extruderSummary.input > 0 ? (extruderSummary.output / extruderSummary.input) * 100 : 0;
  const wastePct = extruderSummary.input > 0 ? (extruderSummary.wastage / extruderSummary.input) * 100 : 0;

  const loomsEfficiency = loomsSummary.input > 0 ? (loomsSummary.output / loomsSummary.input) * 100 : 0;
  const loomsWastePct = loomsSummary.input > 0 ? (loomsSummary.wastage / loomsSummary.input) * 100 : 0;

  const fabricEfficiency = fabricSummary.input > 0 ? (fabricSummary.checked / fabricSummary.input) * 100 : 0;
  const fabricWastePct = fabricSummary.input > 0 ? (fabricSummary.wastage / fabricSummary.input) * 100 : 0;

  return (
    <div id="production-design-2-page" className="flex flex-col bg-[#004D40]/5 min-h-screen">
      <style>{`#production-design-2-page, #production-design-2-page * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }`}</style>
      {/* Header Area */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-5 bg-white border-b border-gray-100">
        <div>
          <h1 className="text-[22px] font-bold text-[#004D40] leading-tight">Daily Production & Wastage</h1>
          <p className="text-[12px] text-gray-500 font-medium mt-1">Track daily production and wastage across all conversion processes</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-md px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <span className="text-sm font-semibold text-gray-700 mr-3">30 Jul, 2026</span>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <Button 
            className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)]" 
            onClick={() => setIsNewEntryOpen(true)}
          >
            <Plus className="w-3 h-3" />
            ADD NEW ENTRY
          </Button>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="bg-white rounded-[14px] p-1.5 hover:shadow-md transition-all">
          <div className="bg-[#00897B]/5 border border-[#00897B] rounded-[10px] h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
              <CardTitle className="text-[19px] font-extrabold text-[#00897B] flex items-center gap-3">
                <div className="bg-[#00897B] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">1</div>
                Extruder Production
              </CardTitle>
              <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <img src={extruderIcon} alt="Extruder" className="w-[35px] h-[35px] object-contain opacity-90" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
              <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
                <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                  <p className="text-[18px] font-bold text-[#004D40] leading-none">2,650.85</p>
                  {/* <p className="text-[18px] font-bold text-[#004D40] leading-none">{extruderSummary.output.toFixed(2)}</p> */}
                </div>
                <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                  <p className="text-[17px] font-bold text-[#004D40] leading-none">132.54</p>
                  {/* <p className="text-[17px] font-bold text-[#004D40] leading-none">{extruderSummary.wastage.toFixed(2)} </p> */}
                </div>
                <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">EFFICIENCY</p>
                  <p className="text-[17px] font-bold text-[#00A87E] leading-none">{efficiency.toFixed(2)}%</p>
                </div>
              </div>
              <div className="flex items-center px-1">
                <div className="flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">WASTE %</p>
                  <p className="text-[17px] font-bold text-gray-900 leading-none">{wastePct.toFixed(2)}%</p>
                </div>
                <div className="flex-[1.7]">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">LUMS WASTAGE (KG)</p>
                  <p className="text-[17px] font-bold text-gray-900 leading-none">0.00</p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        <Card className="bg-white rounded-[14px] p-1.5 hover:shadow-md transition-all">
          <div className="bg-[#004D40]/5 border border-[#004D40] rounded-[10px] h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
              <CardTitle className="text-[19px] font-extrabold text-[#004D40] flex items-center gap-3">
                <div className="bg-[#004D40] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">2</div>
                Looms Production
              </CardTitle>
              <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <img src={loomsIcon} alt="Looms" className="w-[35px] h-[35px] object-contain opacity-90" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
              <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
                <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                  <p className="text-[18px] font-bold text-gray-900 leading-none">{loomsSummary.output.toFixed(2)}</p>
                </div>
                <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                  <p className="text-[17px] font-bold text-gray-900 leading-none">{loomsSummary.wastage.toFixed(2)}</p>
                </div>
                <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">EFFICIENCY</p>
                  <p className="text-[17px] font-bold text-[#00A87E] leading-none">{loomsEfficiency.toFixed(2)}%</p>
                </div>
              </div>
              <div className="flex items-center px-1">
                <div className="flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">WASTE %</p>
                  <p className="text-[17px] font-bold text-gray-900 leading-none">{loomsWastePct.toFixed(2)}%</p>
                </div>
                <div className="flex-[1.7]">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">100 WASTAGE (KG)</p>
                  <p className="text-[17px] font-bold text-gray-900 leading-none">0.00</p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        <Card className="bg-white rounded-[14px] p-1.5 hover:shadow-md transition-all">
          <div className="bg-[#004D40]/5 border border-[#004D40] rounded-[10px] h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
              <CardTitle className="text-[19px] font-extrabold text-[#004D40] flex items-center gap-3">
                <div className="bg-[#004D40] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">3</div>
                Fabric Production
              </CardTitle>
              <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#004D40] flex items-center justify-center">
                 <Layers className="w-[35px] h-[35px] opacity-90" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
              <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
                <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                  <p className="text-[18px] font-bold text-gray-900 leading-none">{fabricSummary.checked.toFixed(2)}</p>
                </div>
                <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                  <p className="text-[17px] font-bold text-gray-900 leading-none">{fabricSummary.wastage.toFixed(2)}</p>
                </div>
                <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1 whitespace-nowrap">EFFICIENCY</p>
                  <p className="text-[17px] font-bold text-[#00A87E] leading-none">{fabricEfficiency.toFixed(2)}%</p>
                </div>
              </div>
              <div className="flex items-center px-1">
                <div className="flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">WASTE %</p>
                  <p className="text-[17px] font-bold text-gray-900 leading-none">{fabricWastePct.toFixed(2)}%</p>
                </div>
                <div className="flex-[1.7]">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">WASTAGE VALUE (KG)</p>
                  <p className="text-[17px] font-bold text-gray-900 leading-none">0.00</p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Data Table Area */}
      <Card className="shadow-sm mt-2 border-0 bg-white rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b border-gray-100 pb-4 pt-5 px-6 sm:flex-row sm:items-center sm:justify-between bg-white">
          <CardTitle className="text-[17px] font-bold text-gray-800 flex items-center gap-2">
            <span className="text-gray-400">📝</span> Day Wise Production & Wastage Details
          </CardTitle>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="flex gap-2 font-bold uppercase tracking-wider text-[11px] h-9 px-4 text-gray-600 border-gray-200">
              <Filter className="w-[14px] h-[14px]" /> FILTERS
            </Button>
            <Button variant="outline" size="sm" className="flex gap-2 font-bold uppercase tracking-wider text-[11px] h-9 px-4 text-gray-600 border-gray-200">
              <Download className="w-[14px] h-[14px]" /> EXPORT
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200">
                <TableHead rowSpan={2} className="text-center font-bold text-gray-800 align-middle border-r border-gray-200 min-w-[120px] bg-white text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead colSpan={4} className="text-[#004D40] font-bold bg-[#004D40]/5 border-r border-gray-200 py-3 text-xs uppercase tracking-wider">
                  <span className="flex items-center justify-center gap-2">
                    <span className="bg-[#004D40] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">1</span>
                    EXTRUDER PRODUCTION (KG)
                  </span>
                </TableHead>
                <TableHead colSpan={4} className="text-[#004D40] font-bold bg-[#004D40]/5 border-r border-gray-200 py-3 text-xs uppercase tracking-wider">
                  <span className="flex items-center justify-center gap-2">
                    <span className="bg-[#004D40] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">2</span>
                    LOOMS PRODUCTION (KG)
                  </span>
                </TableHead>
                <TableHead colSpan={4} className="text-[#004D40] font-bold bg-[#004D40]/5 border-r border-gray-200 py-3 text-xs uppercase tracking-wider">
                  <span className="flex items-center justify-center gap-2">
                    <span className="bg-[#004D40] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">3</span>
                    FABRIC PRODUCTION (KG)
                  </span>
                </TableHead>
                <TableHead rowSpan={2} className="text-center font-bold text-gray-800 align-middle border-gray-200 w-[120px] bg-white text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent bg-white border-b border-gray-200">
                {/* Extruder */}
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Input</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Output</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Wastage</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider border-r border-gray-200 h-10">Waste %</TableHead>
                {/* Looms */}
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Input</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Output</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Wastage</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider border-r border-gray-200 h-10">Waste %</TableHead>
                {/* Fabric */}
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Input</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Output</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Wastage</TableHead>
                <TableHead className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-wider h-10">Waste %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {loadingDayWise ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 font-medium">
                      <Loader size="sm" /> Loading records...
                    </div>
                  </TableCell>
                </TableRow>
              ) : pagedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-32 text-center text-gray-500 font-medium">No production records found.</TableCell>
                </TableRow>
              ) : (
                pagedRows.map((row) => (
                  <TableRow key={row.date} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <TableCell className="text-center font-bold text-[#004D40] border-r border-gray-200 text-[14px] py-4">
                      {format(parseISO(row.date), 'dd MMM, yyyy')}
                    </TableCell>

                    {/* Extruder */}
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.extruder.input)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.extruder.output)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.extruder.wastage)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4 border-r border-gray-200">{row.extruder.wastePct.toFixed(2)}%</TableCell>

                    {/* Looms */}
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.looms.input)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.looms.output)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.looms.wastage)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4 border-r border-gray-200">{row.looms.wastePct.toFixed(2)}%</TableCell>

                    {/* Fabric */}
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.fabric.input)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.fabric.output)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{formatNum(row.fabric.wastage)}</TableCell>
                    <TableCell className="text-center text-gray-800 font-medium text-[14px] py-4">{row.fabric.wastePct.toFixed(2)}%</TableCell>

                    {/* Actions */}
                    <TableCell className="py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-[#004D40]/30 text-[#004D40] hover:bg-[#004D40]/10">
                          <Edit className="h-[14px] w-[14px]" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-red-200 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-[14px] w-[14px]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {!loadingDayWise && dayWiseRows.length > 0 && (
                <TableRow className="bg-white font-bold hover:bg-white border-t-2 border-gray-300">
                  <TableCell className="text-center border-r border-gray-200 text-gray-900 text-[14px] py-4">TOTAL</TableCell>
                  {/* Extruder Total */}
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.extruder.input)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.extruder.output)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.extruder.wastage)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px] border-r border-gray-200">{dayWiseTotals.extruder.wastePct.toFixed(2)}%</TableCell>
                  {/* Looms Total */}
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.looms.input)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.looms.output)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.looms.wastage)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px] border-r border-gray-200">{dayWiseTotals.looms.wastePct.toFixed(2)}%</TableCell>
                  {/* Fabric Total */}
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.fabric.input)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.fabric.output)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px]">{formatNum(dayWiseTotals.fabric.wastage)}</TableCell>
                  <TableCell className="text-center text-[#004D40] text-[14px]">{dayWiseTotals.fabric.wastePct.toFixed(2)}%</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-4 text-sm text-gray-500 bg-white">
          <div className="font-medium text-gray-600 text-xs">
            {dayWiseRows.length === 0
              ? 'No entries'
              : `Showing ${Math.min(pageSize, dayWiseRows.length - (currentPage - 1) * pageSize)} of ${dayWiseRows.length} entries`}
          </div>
          <div className="flex flex-wrap gap-1 items-center">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-gray-200 text-gray-600" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>&lt;</Button>
            {getPageNumbers(currentPage, totalPages).map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
              ) : (
                <Button
                  key={p}
                  variant={p === currentPage ? 'outline' : 'ghost'}
                  size="icon"
                  className={p === currentPage ? 'h-8 w-8 rounded-md bg-[#004D40] text-white hover:bg-[#00382e] border-[#004D40]' : 'h-8 w-8 rounded-md text-gray-600 hover:bg-gray-100'}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-gray-200 text-gray-600" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>&gt;</Button>
          </div>
          <div className="flex items-center gap-2 font-medium text-gray-600 text-xs">
            Rows per page:
            <select
              className="border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 font-semibold bg-white"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </Card>
      </div>
      {isNewEntryOpen && <NewEntry onClose={() => setIsNewEntryOpen(false)} />}
    </div>
  );
}
