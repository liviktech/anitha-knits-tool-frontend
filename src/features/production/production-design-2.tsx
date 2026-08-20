import { useMemo, useState } from 'react';
import '@fontsource-variable/hanken-grotesk';
import { parseISO, format } from 'date-fns';
import { Calendar, Plus, Edit, Trash2, Filter, Download, Layers, FileSpreadsheet, Search, ClipboardList, Gauge } from 'lucide-react';
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

function DayDetailView({
  date,
  onClose,
  dayWiseRows,
  setDate,
}: {
  date: string;
  onClose: () => void;
  dayWiseRows: any[];
  setDate: (d: string) => void;
}) {
  const row = dayWiseRows.find((r) => r.date === date) || dayWiseRows[0];
  const formattedDate = format(parseISO(date), 'dd MMM, yyyy');

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
      {/* Left Column */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Detail Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold text-[#004D40] flex items-center gap-2 leading-none">
              <Calendar className="w-[22px] h-[22px]" />
              {formattedDate}
            </h2>
            <p className="text-[12.5px] text-gray-500 font-medium mt-2">
              Detailed production metrics for the selected date.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-[34px] px-4 text-[#00897B] border-[#00897B]/20 font-bold uppercase tracking-wider text-[11px] gap-2 hover:bg-[#00897B]/5 bg-white"
            >
              <Edit className="w-3.5 h-3.5" /> EDIT ENTRY
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-[34px] w-[34px] text-red-400 border-red-100 hover:bg-red-50 bg-white"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-[34px] ml-2 text-gray-500 bg-white"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Extruder Card */}
          <Card className="rounded-[16px] shadow-sm border border-gray-100 overflow-hidden bg-white p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-[#00897B] text-white w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[13px] font-bold">1</span>
                <span className="font-bold text-[#004D40] text-[15px]">Extruder</span>
              </div>
              <img src={extruderIcon} alt="Extruder" className="w-[26px] h-[26px] object-contain opacity-70" />
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">PRODUCTION (KG)</p>
                <p className="text-[26px] font-extrabold text-gray-900 leading-none">{formatNum(row.extruder.output)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">EFFICIENCY</p>
                <p className="text-[18px] font-bold text-[#00A87E] leading-none">{row.extruder.wastePct > 0 ? (100 - row.extruder.wastePct).toFixed(2) : 99.32}%</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-[#F5F8F7] rounded-lg p-3">
                <p className="text-[10.5px] font-medium text-gray-500 mb-1">Input</p>
                <p className="text-[14px] font-semibold text-gray-800">{formatNum(row.extruder.input)}</p>
              </div>
              <div className="flex-1 bg-[#F5F8F7] rounded-lg p-3">
                <p className="text-[10.5px] font-medium text-gray-500 mb-1">Wastage (KG)</p>
                <p className="text-[14px] font-semibold text-red-500">
                  {formatNum(row.extruder.wastage)} <span className="text-gray-500 text-[12px] font-medium ml-1">({row.extruder.wastePct.toFixed(2)}%)</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Looms Card */}
          <Card className="rounded-[16px] shadow-sm border border-gray-100 overflow-hidden bg-white p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-[#004D40] text-white w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[13px] font-bold">2</span>
                <span className="font-bold text-[#004D40] text-[15px]">Looms</span>
              </div>
              <img src={loomsIcon} alt="Looms" className="w-[26px] h-[26px] object-contain opacity-70" />
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">PRODUCTION (MTRS)</p>
                <p className="text-[26px] font-extrabold text-gray-900 leading-none">{formatNum(row.looms.output)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">EFFICIENCY</p>
                <p className="text-[18px] font-bold text-[#00A87E] leading-none">{row.looms.wastePct > 0 ? (100 - row.looms.wastePct).toFixed(2) : 98.24}%</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-[#F5F8F7] rounded-lg p-3">
                <p className="text-[10.5px] font-medium text-gray-500 mb-1">Input</p>
                <p className="text-[14px] font-semibold text-gray-800">{formatNum(row.looms.input)}</p>
              </div>
              <div className="flex-1 bg-[#F5F8F7] rounded-lg p-3">
                <p className="text-[10.5px] font-medium text-gray-500 mb-1">Wastage (MTRS)</p>
                <p className="text-[14px] font-semibold text-red-500">
                  {formatNum(row.looms.wastage)} <span className="text-gray-500 text-[12px] font-medium ml-1">({row.looms.wastePct.toFixed(2)}%)</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Fabric Card */}
          <Card className="rounded-[16px] shadow-sm border border-gray-100 overflow-hidden bg-white p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-[#004D40] text-white w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[13px] font-bold">3</span>
                <span className="font-bold text-[#004D40] text-[15px]">Fabric</span>
              </div>
              <Layers className="w-[24px] h-[24px] text-gray-400 opacity-80" />
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">PRODUCTION (MTRS)</p>
                <p className="text-[26px] font-extrabold text-gray-900 leading-none">{formatNum(row.fabric.output)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">EFFICIENCY</p>
                <p className="text-[18px] font-bold text-[#00A87E] leading-none">{row.fabric.wastePct > 0 ? (100 - row.fabric.wastePct).toFixed(2) : 96.68}%</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-[#F5F8F7] rounded-lg p-3">
                <p className="text-[10.5px] font-medium text-gray-500 mb-1">Input</p>
                <p className="text-[14px] font-semibold text-gray-800">{formatNum(row.fabric.input)}</p>
              </div>
              <div className="flex-1 bg-[#F5F8F7] rounded-lg p-3">
                <p className="text-[10.5px] font-medium text-gray-500 mb-1">Wastage (MTRS)</p>
                <p className="text-[14px] font-semibold text-red-500">
                  {formatNum(row.fabric.wastage)} <span className="text-gray-500 text-[12px] font-medium ml-1">({row.fabric.wastePct.toFixed(2)}%)</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Breakdown Table */}
        <Card className="rounded-[16px] shadow-sm border border-gray-100 overflow-hidden bg-white mt-1">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-bold text-[#004D40] flex items-center gap-2 text-[15px]">
              <ClipboardList className="w-[18px] h-[18px]" /> Stage Breakdown - {formattedDate}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-white hover:bg-white">
                  <TableHead className="text-[9.5px] font-extrabold uppercase tracking-widest text-gray-600 h-[48px] w-[180px] pl-6">STAGE</TableHead>
                  <TableHead className="text-[9.5px] font-extrabold uppercase tracking-widest text-gray-600 h-[48px]">DATE/TIME</TableHead>
                  <TableHead className="text-[9.5px] font-extrabold uppercase tracking-widest text-gray-600 h-[48px]">SPECS (SIZE/COLOR/BRAND)</TableHead>
                  <TableHead className="text-[9.5px] font-extrabold uppercase tracking-widest text-gray-600 h-[48px] text-center">INPUT / RAW MATERIAL</TableHead>
                  <TableHead className="text-[9.5px] font-extrabold uppercase tracking-widest text-gray-600 h-[48px] text-center">PROCESS DETAILS</TableHead>
                  <TableHead className="text-[9.5px] font-extrabold uppercase tracking-widest text-red-500 h-[48px] text-center">WASTAGE BREAKDOWN</TableHead>
                  <TableHead className="text-[9.5px] font-extrabold uppercase tracking-widest text-gray-600 h-[48px] text-center">FINAL OUTPUT</TableHead>
                  <TableHead className="text-[9.5px] font-extrabold uppercase tracking-widest text-gray-600 h-[48px] text-center">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Extruder Row */}
                <TableRow className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <TableCell className="py-5 pl-6 font-bold text-[#004D40] text-[13px] flex items-center gap-2.5">
                    <span className="bg-[#00897B] text-white w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px]">1</span>
                    Extruder (KG)
                  </TableCell>
                  <TableCell className="py-4 text-gray-600 text-xs font-medium">
                    {formattedDate}<br/>08:30 AM
                  </TableCell>
                  <TableCell className="py-4 text-[11px] text-gray-800">
                    <span className="font-semibold text-gray-500">Size:</span> 40"<br/>
                    <span className="font-semibold text-gray-500">Color:</span> Milky White<br/>
                    <span className="font-semibold text-gray-500">Brand:</span> Premium
                  </TableCell>
                  <TableCell className="py-4 text-center font-bold text-gray-900 text-[13px]">{formatNum(row.extruder.input)} kg</TableCell>
                  <TableCell className="py-4 text-center text-[11px] text-gray-600">
                    Bags: 87<br/>
                    Chems: 12.5 kg
                  </TableCell>
                  <TableCell className="py-4 text-center text-[11px] text-red-500 font-medium">
                    Loose: 8.20 kg<br/>
                    Lumps: 6.20 kg
                  </TableCell>
                  <TableCell className="py-4 text-center font-bold text-[#004D40] text-[13px]">{formatNum(row.extruder.output)} kg</TableCell>
                  <TableCell className="py-4 text-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-[#00897B]"><Edit className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
                
                {/* Looms Row */}
                <TableRow className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <TableCell className="py-5 pl-6 font-bold text-[#004D40] text-[13px] flex items-center gap-2.5">
                    <span className="bg-[#004D40] text-white w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px]">2</span>
                    Looms (MTRS)
                  </TableCell>
                  <TableCell className="py-4 text-gray-600 text-xs font-medium">
                    {formattedDate}<br/>11:15 AM
                  </TableCell>
                  <TableCell className="py-4 text-[11px] text-gray-800">
                    <span className="font-semibold text-gray-500">Width:</span> 38"<br/>
                    <span className="font-semibold text-gray-500">Mesh:</span> 10x10
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <div className="font-bold text-gray-900 text-[13px]">{formatNum(row.looms.input)} kg</div>
                    <div className="text-[9px] text-gray-400 font-medium">(Input Weight)</div>
                  </TableCell>
                  <TableCell className="py-4 text-center text-xs text-gray-400">-</TableCell>
                  <TableCell className="py-4 text-center text-[11px] text-red-500 font-medium">
                    Waste: {formatNum(row.looms.wastage)} kg
                  </TableCell>
                  <TableCell className="py-4 text-center font-bold text-[#004D40] text-[13px]">{formatNum(row.looms.output)} m</TableCell>
                  <TableCell className="py-4 text-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-[#00897B]"><Edit className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>

                {/* Fabric Row */}
                <TableRow className="hover:bg-gray-50 transition-colors">
                  <TableCell className="py-5 pl-6 font-bold text-[#004D40] text-[13px] flex items-center gap-2.5">
                    <span className="bg-[#004D40] text-white w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px]">3</span>
                    Fabric (MTRS)
                  </TableCell>
                  <TableCell className="py-4 text-gray-600 text-xs font-medium">
                    {formattedDate}<br/>03:45 PM
                  </TableCell>
                  <TableCell className="py-4 text-[11px] text-gray-800">
                    <span className="font-semibold text-gray-500">Type:</span> Circular
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <div className="font-bold text-gray-900 text-[13px]">{formatNum(row.fabric.input)} m</div>
                    <div className="text-[9px] text-gray-400 font-medium">(Received)</div>
                  </TableCell>
                  <TableCell className="py-4 text-center text-[11px] text-gray-600">
                    Rolled: {formatNum(row.fabric.output)} m
                  </TableCell>
                  <TableCell className="py-4 text-center text-[11px] text-red-500 font-medium">
                    Wastage: 42.00 m<br/>
                    Bit Waste: 20.00 m
                  </TableCell>
                  <TableCell className="py-4 text-center font-bold text-[#004D40] text-[13px]">{formatNum(row.fabric.output)} m</TableCell>
                  <TableCell className="py-4 text-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-[#00897B]"><Edit className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Right Column (Sidebar) */}
      <div className="w-[270px] lg:flex-shrink-0 flex flex-col border-l border-gray-100/50 bg-white shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
        <div className="p-5 pb-4 bg-[#004D40]/5 border-b border-gray-200 flex flex-col gap-3">
          <h3 className="font-semibold text-[#003140] text-[15px]">Production Dates</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search dates..." 
              className="w-full h-[38px] pl-9 pr-3 rounded-[6px] border border-gray-200 text-[13px] text-gray-600 bg-white focus:outline-none focus:border-[#00897B] focus:ring-1 focus:ring-[#00897B]/20"
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[600px] p-4">
          {dayWiseRows.map((dr) => {
            const isSelected = dr.date === date;
            const dFormat = format(parseISO(dr.date), 'dd MMM, yyyy');
            return (
              <div 
                key={dr.date}
                className={`p-3.5 rounded-[6px] cursor-pointer transition-colors border ${isSelected ? 'bg-[#EBF1F0] border-[#B5CBC8]' : 'hover:bg-gray-50 border-transparent'}`}
                onClick={() => setDate(dr.date)}
              >
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-[#003140] text-[15px]">{dFormat}</div>
                  {isSelected && (
                    <span className="bg-[#BDE8DF] text-[#00796B] text-[11px] font-medium px-2 py-0.5 rounded-[4px]">Current</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 text-[12px] text-[#2F4A47] font-medium">
                  <Layers className="w-3.5 h-3.5 text-[#5F7D7A]" />
                  3 Stages
                  <Gauge className="w-3.5 h-3.5 text-[#5F7D7A] ml-2" />
                  6,462 kg/m
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ProductionDesign2() {
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div>
          <h1 className="text-[22px] font-bold text-black leading-tight">Daily Production & Wastage</h1>
          <p className="text-[12.5px] text-gray-500 font-medium mt-1">Track daily production and wastage across all conversion processes</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-gray-400 rounded-md px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
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

      {isNavigating ? (
        <div className="flex-1 flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-3 text-[#00897B]">
            <Loader size="xl" />
            <p className="font-semibold text-sm">Loading daily details...</p>
          </div>
        </div>
      ) : selectedDate ? (
        <DayDetailView 
          date={selectedDate} 
          onClose={() => setSelectedDate(null)} 
          dayWiseRows={dayWiseRows} 
          setDate={(d) => {
            setIsNavigating(true);
            setTimeout(() => {
              setSelectedDate(d);
              setIsNavigating(false);
            }, 300);
          }}
        />
      ) : (
        <div className="p-3 flex flex-col gap-2">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="bg-white rounded-[14px] p-1.5 hover:shadow-md transition-all">
            <div className="bg-[#00897B]/5 border border-[#B8DCD0] rounded-[10px] h-full flex flex-col">
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
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                    <p className="text-[18px] font-bold text-[#004D40] leading-none">2,650.85</p>
                    {/* <p className="text-[18px] font-bold text-[#004D40] leading-none">{extruderSummary.output.toFixed(2)}</p> */}
                  </div>
                  <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                    <p className="text-[17px] font-bold text-[#004D40] leading-none">132.54</p>
                    {/* <p className="text-[17px] font-bold text-[#004D40] leading-none">{extruderSummary.wastage.toFixed(2)} </p> */}
                  </div>
                  <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">EFFICIENCY</p>
                    <p className="text-[17px] font-bold text-[#00A87E] leading-none">{efficiency.toFixed(2)}%</p>
                  </div>
                </div>
                <div className="flex items-center px-1">
                  <div className="flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTE %</p>
                    <p className="text-[17px] font-bold text-gray-900 leading-none">{wastePct.toFixed(2)}%</p>
                  </div>
                  <div className="flex-[1.7]">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1">LUMS WASTAGE (KG)</p>
                    <p className="text-[17px] font-bold text-gray-900 leading-none">0.00</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="bg-white rounded-[14px] p-1.5 hover:shadow-md transition-all">
            <div className="bg-[#004D40]/5 border border-[#B8D8D5] rounded-[10px] h-full flex flex-col">
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
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                    <p className="text-[18px] font-bold text-gray-900 leading-none">{loomsSummary.output.toFixed(2)}</p>
                  </div>
                  <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                    <p className="text-[17px] font-bold text-gray-900 leading-none">{loomsSummary.wastage.toFixed(2)}</p>
                  </div>
                  <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">EFFICIENCY</p>
                    <p className="text-[17px] font-bold text-[#00A87E] leading-none">{loomsEfficiency.toFixed(2)}%</p>
                  </div>
                </div>
                <div className="flex items-center px-1">
                  <div className="flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTE %</p>
                    <p className="text-[17px] font-bold text-gray-900 leading-none">{loomsWastePct.toFixed(2)}%</p>
                  </div>
                  <div className="flex-[1.7]">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1">100 WASTAGE (KG)</p>
                    <p className="text-[17px] font-bold text-gray-900 leading-none">0.00</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="bg-white rounded-[14px] p-1.5 hover:shadow-md transition-all">
            <div className="bg-[#004D40]/5 border border-[#C5D8C2] rounded-[10px] h-full flex flex-col">
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
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                    <p className="text-[18px] font-bold text-gray-900 leading-none">{fabricSummary.checked.toFixed(2)}</p>
                  </div>
                  <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                    <p className="text-[17px] font-bold text-gray-900 leading-none">{fabricSummary.wastage.toFixed(2)}</p>
                  </div>
                  <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1 whitespace-nowrap">EFFICIENCY</p>
                    <p className="text-[17px] font-bold text-[#00A87E] leading-none">{fabricEfficiency.toFixed(2)}%</p>
                  </div>
                </div>
                <div className="flex items-center px-1">
                  <div className="flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTE %</p>
                    <p className="text-[17px] font-bold text-gray-900 leading-none">{fabricWastePct.toFixed(2)}%</p>
                  </div>
                  <div className="flex-[1.7]">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTAGE VALUE (KG)</p>
                    <p className="text-[17px] font-bold text-gray-900 leading-none">0.00</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Data Table Area */}
        <Card className="shadow-sm mt-2 border-0 bg-white rounded-xl overflow-hidden">
          <CardHeader className="flex flex-col gap-3 border-b border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between bg-white">
            <CardTitle className="text-[19px] font-bold text-[#004D40] leading-tight flex items-center gap-2">
              <img src="/Table-icon.jpg" alt="" className="w-6 h-6 object-contain rounded-sm" />
              Day Wise Production & Wastage Details
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
                <TableRow className="hover:bg-transparent border-b border-gray-300">
                  <TableHead rowSpan={2} className="text-center font-bold text-gray-800 align-middle border-r border-gray-300 min-w-[120px] bg-white text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead colSpan={4} className="text-[#004D40] font-bold bg-[#004D40]/5 border-r border-gray-200 py-3 text-xs uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">
                      <span className="bg-[#004D40] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">1</span>
                      EXTRUDER PRODUCTION (KG)
                    </span>
                  </TableHead>
                  <TableHead colSpan={4} className="text-[#004D40] font-bold bg-[#004D40]/5 border-r border-gray-200 py-3 text-xs uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">
                      <span className="bg-[#004D40] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">2</span>
                      LOOMS PRODUCTION (KG)
                    </span>
                  </TableHead>
                  <TableHead colSpan={4} className="text-[#004D40] font-bold bg-[#004D40]/5 border-r border-gray-200 py-3 text-xs uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">
                      <span className="bg-[#004D40] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">3</span>
                      FABRIC PRODUCTION (KG)
                    </span>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center font-extrabold text-gray-800 align-middle border-gray-200 w-[120px] bg-white text-xs uppercase tracking-wider">Actions</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent bg-white border-b border-gray-200">
                  {/* Extruder */}
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Input</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Output</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Wastage</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-200 h-10">Waste %</TableHead>
                  {/* Looms */}
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Input</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Output</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Wastage</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-200 h-10">Waste %</TableHead>
                  {/* Fabric */}
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Input</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Output</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Wastage</TableHead>
                  <TableHead className="text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-10">Waste %</TableHead>
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
                      <TableCell 
                        className="text-center font-bold text-[#004D40] border-r border-gray-200 text-[14px] py-4 cursor-pointer hover:underline"
                        onClick={() => {
                          setIsNavigating(true);
                          setTimeout(() => {
                            setSelectedDate(row.date);
                            setIsNavigating(false);
                          }, 500);
                        }}
                      >
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
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.extruder.input)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.extruder.output)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.extruder.wastage)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px] border-r border-gray-200">{dayWiseTotals.extruder.wastePct.toFixed(2)}%</TableCell>
                    {/* Looms Total */}
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.looms.input)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.looms.output)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.looms.wastage)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px] border-r border-gray-200">{dayWiseTotals.looms.wastePct.toFixed(2)}%</TableCell>
                    {/* Fabric Total */}
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.fabric.input)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.fabric.output)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.fabric.wastage)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{dayWiseTotals.fabric.wastePct.toFixed(2)}%</TableCell>
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
      )}
      {isNewEntryOpen && <NewEntry onClose={() => setIsNewEntryOpen(false)} />}
    </div>
  );
}
