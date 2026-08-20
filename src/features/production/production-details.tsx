import { useMemo, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { parseISO, format } from 'date-fns';
import { Calendar, Printer, Plus, Edit, Trash2, Filter, Download, Layers } from 'lucide-react';
import { Loader } from '@/components/shared/loader';
import extruderIcon from '@/assets/extruder-icon.png';
import loomsIcon from '@/assets/looms-icon.png';
import { ExtruderEntry } from '@/features/extruder/extruder-entry';
import { LoomEntry } from '@/features/looms/loom-entry';
import { FabricEntry } from '@/features/fabric/fabric-entry';
import { useExtruderSummary } from '@/features/extruder/extruder-queries';
import { useLoomsSummary } from '@/features/looms/loom-queries';
import { useFabricCheckingSummary } from '@/features/fabric/fabric-queries';
import { useDayWiseProduction } from './day-wise-queries';
import { DayDetails } from './day-details';
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

function ExtruderRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <ExtruderEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function LoomRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <LoomEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function FabricRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <FabricEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function DayDetailsRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <DayDetails onClose={() => navigate('/production')} />
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
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
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Production & Wastage</h1>
          <p className="text-sm text-gray-500">Track daily production and wastage across all conversion processes</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2 font-normal">
            Jul 2026
            <Calendar className="w-4 h-4 text-gray-500" />
          </Button>
          <Button className="flex items-center gap-2 uppercase tracking-wide text-xs font-semibold" onClick={() => setIsNewEntryOpen(true)}>
            <Plus className="w-4 h-4" />
            Add New Entry
          </Button>
          <Button variant="outline" size="icon">
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Extruder Production */}
        <Card className="bg-green-50/40 border-green-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-green-200" onClick={() => navigate('/production/extruder')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="bg-green-600 text-white w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold">1</div>
              Extruder Production
            </CardTitle>
            <div className="p-2 bg-green-50 rounded-lg overflow-hidden">
              <img src={extruderIcon} alt="Extruder Production" className="w-9 h-9 object-cover scale-150" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 rounded-lg border border-green-200 bg-white p-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Production (KG)</p>
                <p className="text-lg font-bold text-gray-900">{extruderSummary.output.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Wastage (KG)</p>
                <p className="text-lg font-bold text-gray-900">{extruderSummary.wastage.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Efficiency</p>
                <p className="text-lg font-bold text-green-600">{efficiency.toFixed(2)}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Waste %</p>
                <p className="text-sm font-semibold">{wastePct.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Input (KG)</p>
                <p className="text-sm font-semibold">{extruderSummary.input.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Looms Production */}
        <Card className="bg-blue-50/40 border-blue-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-blue-200" onClick={() => navigate('/production/loom')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="bg-blue-600 text-white w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold">2</div>
              Looms Production
            </CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg overflow-hidden">
              <img src={loomsIcon} alt="Looms Production" className="w-9 h-9 object-cover scale-150" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 rounded-lg border border-blue-200 bg-white p-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Production (kg)</p>
                <p className="text-lg font-bold text-gray-900">{loomsSummary.output.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Wastage (kg)</p>
                <p className="text-lg font-bold text-gray-900">{loomsSummary.wastage.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Efficiency</p>
                <p className="text-lg font-bold text-blue-600">{loomsEfficiency.toFixed(2)}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Waste %</p>
                <p className="text-sm font-semibold">{loomsWastePct.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Input (kg)</p>
                <p className="text-sm font-semibold">{loomsSummary.input.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fabric Production */}
        <Card className="bg-violet-50/40 border-violet-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-violet-200" onClick={() => navigate('/production/fabric')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="bg-violet-600 text-white w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold">3</div>
              Fabric Production
            </CardTitle>
            <div className="p-2 bg-violet-50 rounded-lg">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 rounded-lg border border-violet-200 bg-white p-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Production (kg)</p>
                <p className="text-lg font-bold text-gray-900">{fabricSummary.checked.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Wastage (kg)</p>
                <p className="text-lg font-bold text-gray-900">{fabricSummary.wastage.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Efficiency</p>
                <p className="text-lg font-bold text-violet-600">{fabricEfficiency.toFixed(2)}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Waste %</p>
                <p className="text-sm font-semibold">{fabricWastePct.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Input (kg)</p>
                <p className="text-sm font-semibold">{fabricSummary.input.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table Area */}
      <Card className="shadow-sm mt-4">
        <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Day Wise Production & Wastage Details</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="flex gap-2 font-normal uppercase tracking-wide text-xs">
              <Filter className="w-4 h-4" /> Filters
            </Button>
            <Button variant="outline" size="sm" className="flex gap-2 font-normal uppercase tracking-wide text-xs">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead rowSpan={2} className="text-center font-semibold align-middle border-r border-b min-w-[100px]">Date</TableHead>
                <TableHead colSpan={4} className="text-green-700 font-semibold bg-green-50/50 border-r border-b">
                  <span className="flex items-center justify-center gap-2">
                    <span className="bg-green-600 text-white w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold">1</span>
                    Extruder Production (KG)
                  </span>
                </TableHead>
                <TableHead colSpan={4} className="text-blue-700 font-semibold bg-blue-50/50 border-r border-b">
                  <span className="flex items-center justify-center gap-2">
                    <span className="bg-blue-600 text-white w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold">2</span>
                    Looms Production (KG)
                  </span>
                </TableHead>
                <TableHead colSpan={4} className="text-violet-700 font-semibold bg-violet-50/50 border-r border-b">
                  <span className="flex items-center justify-center gap-2">
                    <span className="bg-violet-600 text-white w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold">3</span>
                    Fabric Production (KG)
                  </span>
                </TableHead>
                <TableHead rowSpan={2} className="text-center font-semibold align-middle border-b w-[120px]">Actions</TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent bg-gray-50/50">
                {/* Extruder */}
                <TableHead className="text-center text-green-700 font-medium text-xs border-r">Input</TableHead>
                <TableHead className="text-center text-green-700 font-medium text-xs border-r">Output</TableHead>
                <TableHead className="text-center text-green-700 font-medium text-xs border-r">Wastage</TableHead>
                <TableHead className="text-center text-green-700 font-medium text-xs border-r">Waste %</TableHead>
                {/* Looms */}
                <TableHead className="text-center text-blue-700 font-medium text-xs border-r">Input</TableHead>
                <TableHead className="text-center text-blue-700 font-medium text-xs border-r">Output</TableHead>
                <TableHead className="text-center text-blue-700 font-medium text-xs border-r">Wastage</TableHead>
                <TableHead className="text-center text-blue-700 font-medium text-xs border-r">Waste %</TableHead>
                {/* Fabric */}
                <TableHead className="text-center text-violet-700 font-medium text-xs border-r">Input</TableHead>
                <TableHead className="text-center text-violet-700 font-medium text-xs border-r">Output</TableHead>
                <TableHead className="text-center text-violet-700 font-medium text-xs border-r">Wastage</TableHead>
                <TableHead className="text-center text-violet-700 font-medium text-xs border-r">Waste %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDayWise ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader size="sm" /> Loading day-wise production...
                    </div>
                  </TableCell>
                </TableRow>
              ) : pagedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-24 text-center text-gray-500">No production records yet.</TableCell>
                </TableRow>
              ) : (
                pagedRows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="text-center font-medium text-green-700 border-r cursor-pointer hover:underline" onClick={() => navigate('/production/day-details')}>
                      {format(parseISO(row.date), 'd MMM, yyyy')}
                    </TableCell>

                    {/* Extruder */}
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.extruder.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.extruder.output.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.extruder.wastage.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.extruder.wastePct.toFixed(2)}%</TableCell>

                    {/* Looms */}
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.looms.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.looms.output.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.looms.wastage.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.looms.wastePct.toFixed(2)}%</TableCell>

                    {/* Fabric */}
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.fabric.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.fabric.output.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.fabric.wastage.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-gray-700 border-r font-medium">{row.fabric.wastePct.toFixed(2)}%</TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-center gap-4">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {!loadingDayWise && dayWiseRows.length > 0 && (
                <TableRow className="bg-gray-50/80 font-bold hover:bg-gray-50/80">
                  <TableCell className="text-center border-r">Total</TableCell>
                  {/* Extruder Total */}
                  <TableCell className="text-center bg-green-100/30 text-green-700 border-r">{dayWiseTotals.extruder.input.toFixed(2)}</TableCell>
                  <TableCell className="text-center bg-green-100/30 text-green-700 border-r">{dayWiseTotals.extruder.output.toFixed(2)}</TableCell>
                  <TableCell className="text-center bg-green-100/30 text-green-700 border-r">{dayWiseTotals.extruder.wastage.toFixed(2)}</TableCell>
                  <TableCell className="text-center border-r">{dayWiseTotals.extruder.wastePct.toFixed(2)}%</TableCell>
                  {/* Looms Total */}
                  <TableCell className="text-center bg-blue-100/30 text-blue-700 border-r">{dayWiseTotals.looms.input.toFixed(2)}</TableCell>
                  <TableCell className="text-center bg-blue-100/30 text-blue-700 border-r">{dayWiseTotals.looms.output.toFixed(2)}</TableCell>
                  <TableCell className="text-center bg-blue-100/30 text-blue-700 border-r">{dayWiseTotals.looms.wastage.toFixed(2)}</TableCell>
                  <TableCell className="text-center border-r">{dayWiseTotals.looms.wastePct.toFixed(2)}%</TableCell>
                  {/* Fabric Total */}
                  <TableCell className="text-center bg-violet-100/30 text-violet-700 border-r">{dayWiseTotals.fabric.input.toFixed(2)}</TableCell>
                  <TableCell className="text-center bg-violet-100/30 text-violet-700 border-r">{dayWiseTotals.fabric.output.toFixed(2)}</TableCell>
                  <TableCell className="text-center bg-violet-100/30 text-violet-700 border-r">{dayWiseTotals.fabric.wastage.toFixed(2)}</TableCell>
                  <TableCell className="text-center border-r">{dayWiseTotals.fabric.wastePct.toFixed(2)}%</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-gray-500">
          <div>
            {dayWiseRows.length === 0
              ? 'No entries'
              : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, dayWiseRows.length)} of ${dayWiseRows.length} entries`}
          </div>
          <div className="flex flex-wrap gap-1 items-center">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>&lt;</Button>
            {getPageNumbers(currentPage, totalPages).map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="px-2">...</span>
              ) : (
                <Button
                  key={p}
                  variant={p === currentPage ? 'outline' : 'ghost'}
                  size="icon"
                  className={p === currentPage ? 'h-8 w-8 bg-green-50 text-green-700 border-green-200' : 'h-8 w-8'}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>&gt;</Button>
          </div>
          <div className="flex items-center gap-2">
            Rows per page:
            <select
              className="border rounded p-1"
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
      
      {isNewEntryOpen && <NewEntry onClose={() => setIsNewEntryOpen(false)} />}
    </div>
  );
}

export function ProductionDetails() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="extruder" element={<ExtruderRoute />} />
      <Route path="loom" element={<LoomRoute />} />
      <Route path="fabric" element={<FabricRoute />} />
      <Route path="day-details" element={<DayDetailsRoute />} />
    </Routes>
  );
}
