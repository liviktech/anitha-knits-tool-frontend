import { useState } from 'react';
import { Search, Wallet, Banknote, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';
import { useEmployees, usePayrollSummary, useSavedPayrollRecords, useMarketValueAllocations } from './employee-queries';

export type PayrollRow = ReturnType<typeof buildPayrollRows>[number];

function buildPayrollRows(
  employees: ReturnType<typeof useEmployees>['data'],
  savedRecords: ReturnType<typeof useSavedPayrollRecords>['data'],
  payrollSummary: ReturnType<typeof usePayrollSummary>['data'],
  marketValueAllocations: ReturnType<typeof useMarketValueAllocations>['data'],
) {
  return (employees ?? []).map(emp => {
    const saved = (savedRecords ?? []).find(s => s.employeeId === emp.id);
    const summary = (payrollSummary ?? []).find(s => s.id === emp.id);
    return {
      ...emp,
      customUserId: emp.employeeDetails?.customUserId,
      baseSalary: saved ? Number(saved.baseSalary) : (summary?.baseSalary || emp.employeeDetails?.salary || 0),
      daysWorked: saved ? Number(saved.daysWorked) : (summary?.daysWorked || 0),
      grossSalary: saved ? Number(saved.grossSalary) : 0,
      advanceDeduction: saved ? Number(saved.advanceDeduction) : (summary?.advanceDeduction || 0),
      marketValueBonus: saved ? Number(saved.marketValueBonus) : ((marketValueAllocations ?? {})[emp.id] || 0),
      marketValueDeduction: saved ? Number(saved.marketValueDeduction) : (summary?.marketValueDeduction || 0),
      otherDeduction: saved ? Number(saved.otherDeduction || 0) : (summary?.otherDeduction || 0),
      netSalary: saved ? Number(saved.netSalary) : 0,
      status: saved?.status || 'Pending',
    };
  });
}

interface PayrollTableProps {
  month: number;
  year: number;
  onMonthYearChange: (month: number, year: number) => void;
  onOpenValueModal: () => void;
  onOpenAdvanceModal: () => void;
  onEditRow: (row: PayrollRow) => void;
  onDeleteRow: (row: PayrollRow) => void;
}

export function PayrollTable({
  month,
  year,
  onMonthYearChange,
  onOpenValueModal,
  onOpenAdvanceModal,
  onEditRow,
  onDeleteRow,
}: PayrollTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollPageSize, setPayrollPageSize] = useState(10);

  const { data: employees = [] } = useEmployees();
  const { data: savedRecords = [] } = useSavedPayrollRecords(month, year);
  const { data: marketValueAllocations = {} } = useMarketValueAllocations(month, year);
  const { data: payrollSummary = [], isLoading: isPayrollLoading } = usePayrollSummary(month, year);

  const filteredPayroll = buildPayrollRows(employees, savedRecords, payrollSummary, marketValueAllocations).filter(p =>
    (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const payrollTotalPages = Math.max(1, Math.ceil(filteredPayroll.length / payrollPageSize));
  const payrollCurrentPage = Math.min(payrollPage, payrollTotalPages);
  const pagedPayroll = filteredPayroll.slice(
    (payrollCurrentPage - 1) * payrollPageSize,
    payrollCurrentPage * payrollPageSize,
  );

  return (
    <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="border-b border-emerald-400 p-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            type="text"
            placeholder="Search Employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-44 sm:w-60 pl-8 bg-gray-50/50 border-gray-400 text-xs rounded-lg font-hanken"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={`${year}-${month.toString().padStart(2, '0')}`}
            max={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m] = e.target.value.split('-');
                onMonthYearChange(parseInt(m, 10), parseInt(y, 10));
              }
            }}
            className="h-8 text-xs w-40 border-gray-400 bg-gray-50/50"
          />
          <Button size="sm" variant="outline" className="h-8 text-sm font-semibold bg-[#004D40] hover:bg-[#00382e] hover:text-white text-white" onClick={onOpenValueModal}>
            <Wallet className="w-3.5 h-3.5 mr-1" /> Machine, Market & Other
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-sm font-semibold bg-[#004D40] hover:bg-[#00382e] hover:text-white text-white" onClick={onOpenAdvanceModal}>
            <Banknote className="w-3.5 h-3.5 mr-1" /> Salary Advance
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
        <Table className="border-collapse font-hanken">
          <TableHeader className="bg-emerald-50/30 sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-b border-gray-300">
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 w-[100px] px-5 py-2 border-r border-gray-300">Emp ID</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-5 py-2 border-r border-gray-300">Name</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right px-5 py-2 border-r border-gray-300">Base Salary</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-center px-5 py-2 border-r border-gray-300">Days Worked</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right px-5 py-2 border-r border-gray-300">Gross Salary</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right text-amber-700 px-5 py-2 border-r border-gray-300">Advance Deducted</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right text-blue-700 px-5 py-2 border-r border-gray-300">Machine Value</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right text-red-700 px-5 py-2 border-r border-gray-300">Market Value</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right text-orange-700 px-5 py-2 border-r border-gray-300">Other Deduction</TableHead>
              <TableHead className="text-sm font-extrabold tracking-wide text-gray-900 text-right px-5 py-2 border-r border-gray-300">Net Payable</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-center px-5 py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPayrollLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-28 text-center text-gray-500 text-sm">
                  <div className="flex items-center justify-center gap-2"><Loader size="sm" /> Loading payroll data...</div>
                </TableCell>
              </TableRow>
            ) : pagedPayroll.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-28 !text-center text-gray-500 text-sm">No payroll data found matching your criteria.</TableCell>
              </TableRow>
            ) : (
              pagedPayroll.map((row) => (
                <TableRow key={row.id} className="border-b border-gray-300 hover:bg-emerald-50/30 transition-colors">
                  <TableCell className="px-5 py-3 text-sm font-bold text-gray-900 border-r border-gray-300">{row.customUserId || row.id}</TableCell>
                  <TableCell className="px-5 py-3 text-sm font-semibold text-gray-800 border-r border-gray-300">{row.name}</TableCell>
                  <TableCell className="px-5 py-3 text-sm text-right border-r border-gray-300">₹{row.baseSalary.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-3 text-sm text-center font-medium bg-gray-50/50 border-r border-gray-300">{row.daysWorked}</TableCell>
                  <TableCell className="px-5 py-3 text-sm text-right font-semibold text-gray-700 border-r border-gray-300">₹{row.grossSalary.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-3 text-sm text-right font-medium text-amber-700 border-r border-gray-300">- ₹{row.advanceDeduction.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-3 text-sm text-right font-medium text-blue-700 border-r border-gray-300">+ ₹{row.marketValueBonus.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-3 text-sm text-right font-medium text-red-700 border-r border-gray-300">- ₹{row.marketValueDeduction.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-3 text-sm text-right font-medium text-orange-700 border-r border-gray-300">- ₹{(row.otherDeduction ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-3 text-sm font-extrabold text-right text-emerald-800 border-r border-gray-300">₹{row.netSalary.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit payroll record"
                        className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                        onClick={() => onEditRow(row)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete payroll record"
                        className="h-7 w-7 text-red-600 hover:bg-red-50"
                        onClick={() => onDeleteRow(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="shrink-0 p-3 border-t border-gray-400 bg-emerald-50/20 text-xs text-gray-700 flex flex-wrap justify-between items-center gap-3 px-4">
        <span>
          Showing{" "}
          {filteredPayroll.length === 0 ? 0 : (payrollCurrentPage - 1) * payrollPageSize + 1}-
          {Math.min(payrollCurrentPage * payrollPageSize, filteredPayroll.length)} of{" "}
          {filteredPayroll.length} entries
        </span>
        <TablePaginationControls currentPage={payrollCurrentPage} totalPages={payrollTotalPages} onPageChange={setPayrollPage} />
        <RowsPerPageSelect pageSize={payrollPageSize} onPageSizeChange={(size) => { setPayrollPageSize(size); setPayrollPage(1); }} />
      </div>
    </div>
  );
}
