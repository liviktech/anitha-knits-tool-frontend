import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { Calendar, Printer, Plus, Eye, Edit, Trash2, Filter, Download, Loader2 } from 'lucide-react';
import { ExtruderEntry } from './extruder-entry';
import { LoomEntry } from './loom-entry';
import { FabricEntry } from './fabric-entry';
import { DayDetails } from './day-details';
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

const data = [
  { date: '30 Jul, 2026', exIn: '2,183.25', exOut: '2,168.85', exWastage: '14.40', exWastePct: '0.68%', lmIn: '2,184.90', lmOut: '2,147.00', lmWastage: '37.90', lmWastePct: '1.76%', fbIn: '2,209.00', fbOut: '2,147.00', fbWastage: '62.00', fbWastePct: '2.89%' },
  { date: '29 Jul, 2026', exIn: '2,174.60', exOut: '2,160.20', exWastage: '14.40', exWastePct: '0.66%', lmIn: '2,175.80', lmOut: '2,132.10', lmWastage: '43.70', lmWastePct: '2.01%', fbIn: '2,188.00', fbOut: '2,132.10', fbWastage: '55.90', fbWastePct: '2.55%' },
  { date: '28 Jul, 2026', exIn: '2,150.30', exOut: '2,136.20', exWastage: '14.10', exWastePct: '0.66%', lmIn: '2,157.50', lmOut: '2,113.60', lmWastage: '43.90', lmWastePct: '2.03%', fbIn: '2,170.00', fbOut: '2,113.60', fbWastage: '56.40', fbWastePct: '2.60%' },
  { date: '27 Jul, 2026', exIn: '2,185.10', exOut: '2,170.40', exWastage: '14.70', exWastePct: '0.67%', lmIn: '2,189.20', lmOut: '2,149.30', lmWastage: '39.90', lmWastePct: '1.82%', fbIn: '2,210.00', fbOut: '2,149.30', fbWastage: '60.70', fbWastePct: '2.75%' },
  { date: '26 Jul, 2026', exIn: '2,168.50', exOut: '2,154.20', exWastage: '14.30', exWastePct: '0.66%', lmIn: '2,171.60', lmOut: '2,136.80', lmWastage: '34.80', lmWastePct: '1.60%', fbIn: '2,187.00', fbOut: '2,136.80', fbWastage: '50.20', fbWastePct: '2.29%' },
];

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
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [extruderSummary, setExtruderSummary] = useState({ input: 0, output: 0, wastage: 0, lums: 0 });

  useEffect(() => {
    const fetchExtruderSummary = async () => {
      setLoadingSummary(true);
      try {
        const response = await fetch('/api/v1/extruder-productions?limit=100');
        if (!response.ok) throw new Error('Failed to fetch extruder productions');
        const result = await response.json();
        const totals = (result.items ?? []).reduce(
          (acc: typeof extruderSummary, item: any) => {
            const loose = item.waste?.looseWasteKg ?? 0;
            const lums = item.waste?.lumsWasteKg ?? 0;
            acc.input += item.totalWeightKg ?? 0;
            acc.output += item.loomsWeightKg ?? 0;
            acc.wastage += loose + lums;
            acc.lums += lums;
            return acc;
          },
          { input: 0, output: 0, wastage: 0, lums: 0 },
        );
        setExtruderSummary(totals);
      } catch (error) {
        console.error('Error fetching extruder summary:', error);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchExtruderSummary();
  }, []);

  if (loadingSummary) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading production details...
        </div>
      </div>
    );
  }

  const efficiency = extruderSummary.input > 0 ? (extruderSummary.output / extruderSummary.input) * 100 : 0;
  const wastePct = extruderSummary.input > 0 ? (extruderSummary.wastage / extruderSummary.input) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Production & Wastage</h1>
          <p className="text-sm text-gray-500">Track daily production and wastage across all conversion processes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2 font-normal">
            30 Jul, 2026
            <Calendar className="w-4 h-4 text-gray-500" />
          </Button>
          <Button className="bg-[#4338ca] hover:bg-[#3730a3] text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Entry
          </Button>
          <Button variant="outline" size="icon">
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Extruder Production */}
        <Card className="border-green-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-green-200" onClick={() => navigate('/production/extruder')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <div className="bg-green-700 text-white w-6 h-6 rounded flex items-center justify-center text-xs">1</div>
              Extruder Production
            </CardTitle>
            <div className="p-1.5 bg-green-50 rounded-lg">
              {/* Mock Icon */}
              <div className="w-6 h-6 text-green-700 border-2 border-green-700 rounded-sm" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Production (KG)</p>
                <p className="text-lg font-bold text-green-700">{extruderSummary.output.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Wastage (KG)</p>
                <p className="text-lg font-bold text-green-700">{extruderSummary.wastage.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Efficiency</p>
                <p className="text-lg font-bold text-green-700">{efficiency.toFixed(2)}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Waste %</p>
                <p className="text-sm font-semibold">{wastePct.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">LUMS Wastage (KG)</p>
                <p className="text-sm font-semibold">{extruderSummary.lums.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Looms Production */}
        <Card className="border-blue-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-blue-200" onClick={() => navigate('/production/loom')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <div className="bg-blue-700 text-white w-6 h-6 rounded flex items-center justify-center text-xs">2</div>
              Looms Production
            </CardTitle>
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 text-blue-700 border-2 border-blue-700 rounded-sm" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Production (Mtrs)</p>
                <p className="text-lg font-bold text-blue-700">2,147.00</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Wastage (Mtrs)</p>
                <p className="text-lg font-bold text-blue-700">37.90</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Efficiency</p>
                <p className="text-lg font-bold text-blue-700">98.24%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Waste %</p>
                <p className="text-sm font-semibold">1.76%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">180 Wastage (Mtrs)</p>
                <p className="text-sm font-semibold">0.00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fabric Production */}
        <Card className="border-purple-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-purple-200" onClick={() => navigate('/production/fabric')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <div className="bg-purple-700 text-white w-6 h-6 rounded flex items-center justify-center text-xs">3</div>
              Fabric Production
            </CardTitle>
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <div className="w-6 h-6 text-purple-700 border-2 border-purple-700 rounded-sm" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Production (Mtrs)</p>
                <p className="text-lg font-bold text-purple-700">2,147.00</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Wastage (Mtrs)</p>
                <p className="text-lg font-bold text-purple-700">62.00</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Efficiency</p>
                <p className="text-lg font-bold text-purple-700">96.68%</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Waste % (White)</p>
                <p className="text-sm font-semibold">2.89%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Waste % (Blue)</p>
                <p className="text-sm font-semibold">2.89%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Wastage Value (Mtrs)</p>
                <p className="text-sm font-semibold">0.00</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table Area */}
      <Card className="shadow-sm mt-4">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base font-semibold">Day Wise Production & Wastage Details</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex gap-2 font-normal">
              <Filter className="w-4 h-4" /> Filters
            </Button>
            <Button variant="outline" size="sm" className="flex gap-2 font-normal">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead rowSpan={2} className="text-center font-semibold align-middle border-r border-b min-w-[100px]">Date</TableHead>
                <TableHead colSpan={4} className="text-center text-green-700 font-semibold bg-green-50/50 border-r border-b">1 Extruder Production (KG)</TableHead>
                <TableHead colSpan={4} className="text-center text-blue-700 font-semibold bg-blue-50/50 border-r border-b">2 Looms Production (Mtrs)</TableHead>
                <TableHead colSpan={4} className="text-center text-purple-700 font-semibold bg-purple-50/50 border-r border-b">3 Fabric Production (Mtrs)</TableHead>
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
                <TableHead className="text-center text-purple-700 font-medium text-xs border-r">Input</TableHead>
                <TableHead className="text-center text-purple-700 font-medium text-xs border-r">Output</TableHead>
                <TableHead className="text-center text-purple-700 font-medium text-xs border-r">Wastage</TableHead>
                <TableHead className="text-center text-purple-700 font-medium text-xs border-r">Waste %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center font-medium text-blue-700 border-r cursor-pointer hover:underline" onClick={() => navigate('/production/day-details')}>{row.date}</TableCell>

                  {/* Extruder */}
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.exIn}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.exOut}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.exWastage}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.exWastePct}</TableCell>

                  {/* Looms */}
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.lmIn}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.lmOut}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.lmWastage}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.lmWastePct}</TableCell>

                  {/* Fabric */}
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.fbIn}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.fbOut}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.fbWastage}</TableCell>
                  <TableCell className="text-center text-gray-700 border-r font-medium">{row.fbWastePct}</TableCell>

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
              ))}

              {/* Total Row */}
              <TableRow className="bg-gray-50/80 font-bold hover:bg-gray-50/80">
                <TableCell className="text-center border-r">Total</TableCell>
                {/* Extruder Total */}
                <TableCell className="text-center bg-purple-100/30 border-r">10,861.75</TableCell>
                <TableCell className="text-center bg-purple-100/30 border-r">10,789.85</TableCell>
                <TableCell className="text-center bg-purple-100/30 border-r">71.90</TableCell>
                <TableCell className="text-center border-r">0.66%</TableCell>
                {/* Looms Total */}
                <TableCell className="text-center bg-purple-100/30 border-r">10,878.00</TableCell>
                <TableCell className="text-center bg-purple-100/30 border-r">10,678.80</TableCell>
                <TableCell className="text-center bg-purple-100/30 border-r">199.20</TableCell>
                <TableCell className="text-center border-r">1.83%</TableCell>
                {/* Fabric Total */}
                <TableCell className="text-center bg-purple-100/30 border-r">10,964.00</TableCell>
                <TableCell className="text-center bg-purple-100/30 border-r">10,678.80</TableCell>
                <TableCell className="text-center bg-purple-100/30 border-r">285.20</TableCell>
                <TableCell className="text-center border-r">2.60%</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t p-4 text-sm text-gray-500">
          <div>Showing 5 of 30 entries</div>
          <div className="flex gap-1 items-center">
            <Button variant="outline" size="icon" className="h-8 w-8">&lt;</Button>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-blue-50 text-blue-700 border-blue-200">1</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">2</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">3</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">4</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">5</Button>
            <span className="px-2">...</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">6</Button>
            <Button variant="outline" size="icon" className="h-8 w-8">&gt;</Button>
          </div>
          <div className="flex items-center gap-2">
            Rows per page:
            <select className="border rounded p-1">
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </Card>
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
