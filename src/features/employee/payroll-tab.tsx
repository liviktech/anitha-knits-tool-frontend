import { useState, forwardRef, useImperativeHandle } from 'react';
import { Search, Wallet, FileText, Banknote, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from '@/components/shared/loader';
import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';
import { useEmployees, useDistributeMarketValue, usePayrollSummary, useGrantSalaryAdvance, useSavePayrollRecords, useSavedPayrollRecords, useMarketValueAllocations, useSalaryAdvances, type SalaryAdvanceStatus } from './employee-queries';
import { useAttendanceRecords } from './attendance-queries';


export interface PayrollTabRef {
  openGenerateModal: () => void;
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('T')[0].split('-');
  if (!year || !month || !day) return isoDate;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function advanceStatusBadgeClass(status: SalaryAdvanceStatus) {
  return status === 'ACTIVE'
    ? 'bg-emerald-50 text-[#004D40] border border-emerald-200'
    : 'bg-slate-100 text-slate-600 border border-slate-200';
}

export const PayrollTab = forwardRef<PayrollTabRef>((_, ref) => {
  const [activeSubTab, setActiveSubTab] = useState<'payroll' | 'advance'>('payroll');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isMarketValueModalOpen, setIsMarketValueModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const { data: employees = [] } = useEmployees();
  const { mutate: distributeMarketValue, isPending: isDistributing } = useDistributeMarketValue();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: savedRecords = [] } = useSavedPayrollRecords(currentMonth, currentYear);
  const { data: marketValueAllocations = {} } = useMarketValueAllocations(currentMonth, currentYear);
  const isGenerated = savedRecords.length > 0;
  const { data: payrollSummary = [], isLoading: isPayrollLoading } = usePayrollSummary(currentMonth, currentYear);
  const startDateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
  const endDay = new Date(currentYear, currentMonth, 0).getDate();
  const endDateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
  const { data: attendanceRecords = [] } = useAttendanceRecords(startDateStr, endDateStr);
  const { mutate: grantAdvance, isPending: isGrantingAdvance } = useGrantSalaryAdvance();
  const { mutateAsync: savePayrollRecords } = useSavePayrollRecords();
  const { data: salaryAdvances = [], isLoading: isAdvancesLoading } = useSalaryAdvances();

  useImperativeHandle(ref, () => ({
    openGenerateModal: () => setIsGenerateModalOpen(true),
  }));

  // Advance Form State
  const [advanceEmployeeId, setAdvanceEmployeeId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState('');
  const [advanceType, setAdvanceType] = useState<'single' | 'emi'>('single');
  const [advanceMonths, setAdvanceMonths] = useState('');

  const advanceAmountNum = parseFloat(advanceAmount) || 0;
  const advanceMonthsNum = parseInt(advanceMonths, 10) || 0;
  const advanceEmiPreview = advanceType === 'emi' && advanceAmountNum > 0 && advanceMonthsNum > 0
    ? advanceAmountNum / advanceMonthsNum
    : null;
  const isAdvanceFormValid = !!advanceEmployeeId && advanceAmountNum > 0 && !!advanceDate
    && (advanceType === 'single' || advanceMonthsNum >= 2);

  const resetAdvanceForm = () => {
    setAdvanceEmployeeId('');
    setAdvanceAmount('');
    setAdvanceDate('');
    setAdvanceType('single');
    setAdvanceMonths('');
  };

  // Salary Advance tab filters
  const [advanceSearchQuery, setAdvanceSearchQuery] = useState('');
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<'ALL' | SalaryAdvanceStatus>('ALL');

  const filteredAdvances = salaryAdvances.filter((adv) => {
    const q = advanceSearchQuery.toLowerCase();
    const matchesSearch =
      (adv.employeeName || '').toLowerCase().includes(q) ||
      (adv.customUserId || '').toLowerCase().includes(q);
    const matchesStatus = advanceStatusFilter === 'ALL' || adv.status === advanceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollPageSize, setPayrollPageSize] = useState(10);
  const [advancePage, setAdvancePage] = useState(1);
  const [advancePageSize, setAdvancePageSize] = useState(10);

  // Market Value Form State
  const [marketValuePool, setMarketValuePool] = useState<string>('');
  const [marketValueDate, setMarketValueDate] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const totalPoolNum = parseInt(marketValuePool || '0', 10);
  const currentAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const remainingPool = Math.max(0, totalPoolNum - currentAllocated);

  const handleAllocationChange = (empId: string, val: string) => {
    if (val === '') {
      setAllocations(prev => {
        const next = { ...prev };
        delete next[empId];
        return next;
      });
      return;
    }

    const numValue = parseInt(val, 10);
    if (isNaN(numValue) || numValue < 0) return;

    setAllocations(prev => {
      const otherTotal = Object.entries(prev).reduce((acc, [id, v]) => acc + (id === empId ? 0 : v), 0);
      const maxAllowed = Math.max(0, totalPoolNum - otherTotal);
      const finalValue = Math.min(numValue, maxAllowed);
      return { ...prev, [empId]: finalValue };
    });
  };

  const filteredPayroll = employees.filter(p =>
    (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  ).map(emp => {
    const saved = savedRecords.find(s => s.employeeId === emp.id);
    const summary = payrollSummary.find(s => s.id === emp.id);
    return {
      ...emp,
      customUserId: emp.employeeDetails?.customUserId,
      baseSalary: saved ? Number(saved.baseSalary) : (summary?.baseSalary || emp.employeeDetails?.salary || 0),
      daysWorked: saved ? Number(saved.daysWorked) : (summary?.daysWorked || 0),
      grossSalary: saved ? Number(saved.grossSalary) : 0,
      advanceDeduction: saved ? Number(saved.advanceDeduction) : (summary?.advanceDeduction || 0),
      marketValueBonus: saved ? Number(saved.marketValueBonus) : (marketValueAllocations[emp.id] || 0),
      netSalary: saved ? Number(saved.netSalary) : 0,
      status: saved?.status || 'Pending'
    };
  });

  const payrollTotalPages = Math.max(1, Math.ceil(filteredPayroll.length / payrollPageSize));
  const payrollCurrentPage = Math.min(payrollPage, payrollTotalPages);
  const pagedPayroll = filteredPayroll.slice(
    (payrollCurrentPage - 1) * payrollPageSize,
    payrollCurrentPage * payrollPageSize,
  );

  const advanceTotalPages = Math.max(1, Math.ceil(filteredAdvances.length / advancePageSize));
  const advanceCurrentPage = Math.min(advancePage, advanceTotalPages);
  const pagedAdvances = filteredAdvances.slice(
    (advanceCurrentPage - 1) * advancePageSize,
    advanceCurrentPage * advancePageSize,
  );

  const totalPayroll = isGenerated
    ? savedRecords.reduce((sum, p) => sum + Number(p.netSalary), 0)
    : payrollSummary.reduce((sum, p) => sum + p.netSalary, 0);
  const totalAdvances = isGenerated
    ? savedRecords.reduce((sum, p) => sum + Number(p.advanceDeduction), 0)
    : payrollSummary.reduce((sum, p) => sum + p.advanceDeduction, 0);
  const totalMarketValue = isGenerated
    ? savedRecords.reduce((sum, p) => sum + Number(p.marketValueBonus), 0)
    : Object.values(marketValueAllocations).reduce((sum, val) => sum + val, 0);

  return (
    <div className="flex flex-col gap-2 h-[calc(100%-3px)] flex-1 min-h-0 p-2 font-hanken">

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2" style={{ fontFamily: "'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif" }}>
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-emerald-300 transition-colors flex flex-col justify-center">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Total Payroll (Est)</h3>
              <div className="text-xl font-bold text-gray-800 mt-1">₹ {totalPayroll.toLocaleString()}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center"><Wallet className="w-5 h-5 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-amber-300 transition-colors flex flex-col justify-center">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Total Advances</h3>
              <div className="text-xl font-bold text-gray-800 mt-1">₹ {isGenerated ? totalAdvances.toLocaleString() : '0'}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center"><Banknote className="w-5 h-5 text-amber-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-300 transition-colors flex flex-col justify-center">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Market Value</h3>
              <div className="text-xl font-bold text-gray-800 mt-1">₹ {isGenerated ? totalMarketValue.toLocaleString() : '0'}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center"><Banknote className="w-5 h-5 text-blue-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-purple-300 transition-colors flex flex-col justify-center">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Payroll Month</h3>
              <div className="text-xl font-bold text-gray-800 mt-1">{new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center"><Calendar className="w-5 h-5 text-purple-600" /></div>
          </div>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'payroll' | 'advance')} className="flex-1 flex flex-col min-h-0 gap-2">
        <TabsList className="bg-transparent gap-2 h-9 p-0 mb-4 shrink-0">
          <TabsTrigger 
            value="payroll" 
            className="relative h-full px-5 rounded-full data-[state=active]:bg-transparent data-[state=active]:text-white text-gray-600 font-semibold text-sm transition-colors z-10 overflow-hidden shadow-none border-none data-[state=active]:shadow-none"
          >
            {activeSubTab === 'payroll' && (
              <motion.div
                layoutId="activePayrollTabPill"
                className="absolute inset-0 bg-[#004D40] z-[-1]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            Payroll
          </TabsTrigger>
          <TabsTrigger 
            value="advance" 
            className="relative h-full px-5 rounded-full data-[state=active]:bg-transparent data-[state=active]:text-white text-gray-600 font-semibold text-sm transition-colors z-10 overflow-hidden shadow-none border-none data-[state=active]:shadow-none"
          >
            {activeSubTab === 'advance' && (
              <motion.div
                layoutId="activePayrollTabPill"
                className="absolute inset-0 bg-[#004D40] z-[-1]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            Salary Advance
          </TabsTrigger>
        </TabsList>

        {/* Payroll Sub-Tab */}
        <TabsContent value="payroll" className="flex-1 flex flex-col min-h-0 mt-0">
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
                  value={`${currentYear}-${currentMonth.toString().padStart(2, '0')}`}
                  max={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m] = e.target.value.split('-');
                      setCurrentYear(parseInt(y, 10));
                      setCurrentMonth(parseInt(m, 10));
                    }
                  }}
                  className="h-8 text-xs w-40 border-gray-400 bg-gray-50/50"
                />
                <Button size="sm" variant="outline" className="h-8 text-sm font-semibold bg-[#004D40] hover:bg-[#00382e] hover:text-white text-white" onClick={() => setIsAdvanceModalOpen(true)}>
                  <Banknote className="w-3.5 h-3.5 mr-1" /> Salary Advance
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-sm font-semibold bg-[#004D40] hover:bg-[#00382e] hover:text-white text-white" onClick={() => setIsMarketValueModalOpen(true)}>
                  <Wallet className="w-3.5 h-3.5 mr-1" /> Market Value
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
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right text-blue-700 px-5 py-2 border-r border-gray-300">Market Value Share</TableHead>
                <TableHead className="text-sm font-extrabold tracking-wide text-gray-900 text-right px-5 py-2">Net Payable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPayrollLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center text-gray-500 text-sm">
                    <div className="flex items-center justify-center gap-2"><Loader size="sm" /> Loading payroll data...</div>
                  </TableCell>
                </TableRow>
              ) : pagedPayroll.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 !text-center text-gray-500 text-sm">No payroll data found matching your criteria.</TableCell>
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
                    <TableCell className="px-5 py-3 text-sm font-extrabold text-right text-emerald-800">₹{row.netSalary.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Payroll Table Footer */}
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
        </TabsContent>

        {/* Salary Advance Sub-Tab */}
        <TabsContent value="advance" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="border-b border-emerald-400 p-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search Employee..."
                    value={advanceSearchQuery}
                    onChange={(e) => setAdvanceSearchQuery(e.target.value)}
                    className="h-8 w-44 sm:w-60 pl-8 bg-gray-50/50 border-gray-400 text-xs rounded-lg font-hanken"
                  />
                </div>
                <Select value={advanceStatusFilter} onValueChange={(v) => setAdvanceStatusFilter(v as 'ALL' | SalaryAdvanceStatus)}>
                  <SelectTrigger className="h-8 w-32 bg-gray-50/50 border-gray-400 text-sm rounded-lg font-hanken">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button size="sm" variant="outline" className="h-8 text-sm font-semibold bg-[#004D40] hover:bg-[#00382e] hover:text-white text-white" onClick={() => setIsAdvanceModalOpen(true)}>
                <Banknote className="w-3.5 h-3.5 mr-1" /> Grant Salary Advance
              </Button>
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <Table className="border-collapse font-hanken">
                <TableHeader className="bg-amber-50/30 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-b border-gray-300">
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 w-[100px] px-5 py-2 border-r border-gray-300">Emp ID</TableHead>
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-5 py-2 border-r border-gray-300">Name</TableHead>
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right px-5 py-2 border-r border-gray-300">Advance Amount</TableHead>
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-5 py-2 border-r border-gray-300">Method</TableHead>
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-center px-5 py-2 border-r border-gray-300">EMI Progress</TableHead>
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-right px-5 py-2 border-r border-gray-300">Remaining</TableHead>
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-5 py-2 border-r border-gray-300">Effective Date</TableHead>
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-center px-5 py-2">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdvancesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-28 text-center text-gray-500 text-sm">
                        <div className="flex items-center justify-center gap-2"><Loader size="sm" /> Loading salary advances...</div>
                      </TableCell>
                    </TableRow>
                  ) : pagedAdvances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-28 !text-center text-gray-500 text-sm">No salary advances found matching your criteria.</TableCell>
                    </TableRow>
                  ) : (
                    pagedAdvances.map((adv) => (
                      <TableRow key={adv.id} className="border-b border-gray-300 hover:bg-emerald-50/30 transition-colors">
                        <TableCell className="px-5 py-3 text-sm font-bold text-gray-900 border-r border-gray-300">{adv.customUserId || adv.employeeId}</TableCell>
                        <TableCell className="px-5 py-3 text-sm font-semibold text-gray-800 border-r border-gray-300">{adv.employeeName || '-'}</TableCell>
                        <TableCell className="px-5 py-3 text-sm text-right border-r border-gray-300">₹{adv.amount.toLocaleString()}</TableCell>
                        <TableCell className="px-5 py-3 text-sm border-r border-gray-300">
                          {adv.repaymentMethod === 'emi' ? (
                            <span className="inline-flex flex-col leading-tight">
                              <span className="font-medium text-gray-800">EMI</span>
                              <span className="text-[11px] text-gray-500">₹{adv.emiAmount?.toLocaleString()} × {adv.totalMonths}mo</span>
                            </span>
                          ) : (
                            <span className="font-medium text-gray-800">Single Payment</span>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-center border-r border-gray-300">
                          {adv.repaymentMethod === 'emi' ? `${adv.monthsPaid} / ${adv.totalMonths} months` : '-'}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-right font-medium text-amber-700 border-r border-gray-300">₹{adv.remainingAmount.toLocaleString()}</TableCell>
                        <TableCell className="px-5 py-3 text-sm text-gray-700 border-r border-gray-300">{formatDateDisplay(adv.effectiveDate)}</TableCell>
                        <TableCell className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${advanceStatusBadgeClass(adv.status)}`}>
                            {adv.status === 'ACTIVE' ? 'Active' : 'Completed'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Salary Advance Table Footer */}
            <div className="shrink-0 p-3 border-t border-gray-400 bg-emerald-50/20 text-xs text-gray-700 flex flex-wrap justify-between items-center gap-3 px-4">
              <span>
                Showing{" "}
                {filteredAdvances.length === 0 ? 0 : (advanceCurrentPage - 1) * advancePageSize + 1}-
                {Math.min(advanceCurrentPage * advancePageSize, filteredAdvances.length)} of{" "}
                {filteredAdvances.length} entries
              </span>
              <TablePaginationControls currentPage={advanceCurrentPage} totalPages={advanceTotalPages} onPageChange={setAdvancePage} />
              <RowsPerPageSelect pageSize={advancePageSize} onPageSizeChange={(size) => { setAdvancePageSize(size); setAdvancePage(1); }} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Salary Advance Modal */}
      <Dialog open={isAdvanceModalOpen} onOpenChange={(open) => { setIsAdvanceModalOpen(open); if (!open) resetAdvanceForm(); }}>
        <DialogContent className="sm:max-w-md border border-gray-400 font-hanken">
          <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black flex items-center gap-2">
              <Banknote className="w-5 h-5" /> Grant Salary Advance
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Select Employee</Label>
              <Select value={advanceEmployeeId} onValueChange={setAdvanceEmployeeId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choose Employee..." /></SelectTrigger>
                <SelectContent position="popper">
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.employeeDetails?.customUserId || emp.id} - {emp.name || 'Unnamed'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label className="text-xs font-semibold text-gray-700">Advance Amount (₹)</Label>
                <Input type="number" placeholder="e.g. 5000" className="h-9 text-xs" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <Label className="text-xs font-semibold text-gray-700">Effective Date</Label>
                <Input type="date" className="h-9 text-xs" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Repayment Method</Label>
              <Select value={advanceType} onValueChange={(v) => setAdvanceType(v as 'single' | 'emi')}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="single">Single Payment (Deduct in next payroll)</SelectItem>
                  <SelectItem value="emi">EMI (Equated Monthly Installment)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {advanceType === 'emi' && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label className="text-xs font-semibold text-gray-700">No. of Months</Label>
                  <Input
                    type="number"
                    min={2}
                    max={36}
                    placeholder="e.g. 3"
                    className="h-9 text-xs"
                    value={advanceMonths}
                    onChange={(e) => setAdvanceMonths(e.target.value)}
                  />
                  {advanceMonths !== '' && advanceMonthsNum < 2 && (
                    <span className="text-[10px] text-red-500">EMI needs at least 2 months.</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label className="text-xs font-semibold text-gray-700">EMI Amount (₹/mo)</Label>
                  <Input
                    type="text"
                    placeholder="Auto-calculated"
                    disabled
                    className="h-9 text-xs bg-gray-50"
                    value={advanceEmiPreview !== null ? advanceEmiPreview.toFixed(2) : ''}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-gray-200 bg-white pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAdvanceModalOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button
              size="sm"
              className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs px-4"
              disabled={isGrantingAdvance || !isAdvanceFormValid}
              onClick={() => {
                grantAdvance({
                  employeeId: advanceEmployeeId,
                  amount: advanceAmountNum,
                  effectiveDate: advanceDate,
                  repaymentMethod: advanceType,
                  ...(advanceType === 'emi' ? { totalMonths: advanceMonthsNum } : {}),
                }, {
                  onSuccess: () => {
                    setIsAdvanceModalOpen(false);
                    resetAdvanceForm();
                    alert('Salary advance granted successfully!');
                  },
                  onError: (err) => {
                    alert('Failed to grant advance: ' + err.message);
                  }
                });
              }}
            >
              {isGrantingAdvance ? 'Granting...' : 'Grant Advance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Market Value Modal */}
      <Dialog open={isMarketValueModalOpen} onOpenChange={setIsMarketValueModalOpen}>
        <DialogContent className="sm:max-w-2xl border border-gray-400 font-hanken">
          <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Distribute Market Value
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
              <strong>Info:</strong> Market value is an additional bonus amount shared by the owner to the employees. It is added to their payroll as an earning.
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label className="text-xs font-semibold text-gray-700">Total Market Value Pool (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 20000"
                  className="h-9 text-xs font-bold text-lg"
                  value={marketValuePool}
                  onChange={(e) => setMarketValuePool(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <Label className="text-xs font-semibold text-gray-700">Effective Date</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={marketValueDate}
                  onChange={(e) => setMarketValueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-end">
                <Label className="text-xs font-semibold text-gray-700">Employee Allocation</Label>
                <div className={`text-xs font-semibold ${remainingPool === 0 && totalPoolNum > 0 ? 'text-green-600' : 'text-blue-700'}`}>
                  Remaining Pool: ₹{remainingPool.toLocaleString()}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[270px] overflow-y-auto">
                <Table className="font-hanken">
                  <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b border-gray-200">
                      <TableHead className="text-xs font-semibold text-gray-700 h-8 py-1">Employee</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-700 text-right h-8 py-1 w-[120px]">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <TableCell className="py-1.5 text-xs">
                          <div className="font-medium text-gray-900">{emp.name || 'Unnamed Employee'}</div>
                          <div className="text-[10px] text-gray-500">{emp.employeeDetails?.customUserId || emp.mobile || emp.id}</div>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-7 text-xs text-right w-full"
                            value={allocations[emp.id] || ''}
                            onChange={(e) => handleAllocationChange(emp.id, e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-gray-200 bg-white pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsMarketValueModalOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button
              size="sm"
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4"
              disabled={isDistributing || remainingPool !== 0 || !marketValueDate || totalPoolNum <= 0}
              onClick={() => {
                distributeMarketValue({
                  marketValueDate,
                  totalPool: totalPoolNum,
                  allocations
                }, {
                  onSuccess: () => {
                    setIsMarketValueModalOpen(false);
                    setMarketValuePool('');
                    setMarketValueDate('');
                    setAllocations({});
                    alert('Market value distributed successfully!');
                  },
                  onError: (err) => {
                    alert('Failed to distribute: ' + err.message);
                  }
                });
              }}
            >
              {isDistributing ? 'Distributing...' : 'Apply & Distribute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Payroll Modal */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="max-w-[98vw] w-fit min-w-[min(100vw,1400px)] border border-gray-400 font-hanken">
          <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-purple-100 px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black flex items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Generated Payroll Summary
              </div>
              <Input
                type="month"
                value={`${currentYear}-${currentMonth.toString().padStart(2, '0')}`}
                max={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m] = e.target.value.split('-');
                    setCurrentYear(parseInt(y, 10));
                    setCurrentMonth(parseInt(m, 10));
                  }
                }}
                className="h-8 text-sm w-40 border-gray-400 bg-white"
              />
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto overflow-x-auto max-h-[75vh] border-y border-gray-300">
            <Table className="border-collapse">
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10">
                <TableRow className="border-b border-gray-300">
                  <TableHead colSpan={6} className="text-sm font-bold text-gray-800 text-center border-r border-gray-300">Employee Details</TableHead>
                  <TableHead colSpan={3} className="text-sm font-bold text-blue-700 text-center border-r border-gray-300 bg-blue-50/30">Bonuses</TableHead>
                  <TableHead colSpan={1} className="text-sm font-bold text-gray-800 text-center border-r border-gray-300 bg-emerald-50/30">Gross</TableHead>
                  <TableHead colSpan={2} className="text-sm font-bold text-red-700 text-center border-r border-gray-300 bg-red-50/30">Deductions</TableHead>
                  <TableHead colSpan={1} className="text-sm font-bold text-gray-800 text-center bg-emerald-50/30">Final</TableHead>
                </TableRow>
                <TableRow className="border-b border-gray-300">
                  <TableHead className="text-xs font-semibold text-gray-800 border-r border-gray-300">Emp ID</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 border-r border-gray-300">Employee Name</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-center border-r border-gray-300">Month Days</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-center border-r border-gray-300">Days Present</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-center border-r border-gray-300">Absent Days</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-right border-r border-gray-300">Base Salary</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-center text-purple-700 border-r border-gray-300">Sunday Bonus (Days)</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-right text-purple-700 border-r border-gray-300">Sunday Bonus</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-right text-blue-700 border-r border-gray-300">Market Value Share</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-right border-r border-gray-300">Gross Pay</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-right text-red-600 border-r border-gray-300">LOP Deduction</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-800 text-right text-amber-700 border-r border-gray-300">Advance Deducted</TableHead>
                  <TableHead className="text-xs font-extrabold text-gray-900 text-right pr-4">Net Payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const empAttendances = attendanceRecords.filter(a => a.employeeId === emp.id);
                  const totalDays = new Date(currentYear, currentMonth, 0).getDate();

                  const baseSalary = Number(emp.employeeDetails?.salary || 0);
                  const oneDaySalary = baseSalary / totalDays;

                  let presentDays = 0;
                  let absentDays = 0;
                  let sundayBonuses = 0;
                  let sundayBonusDays = 0;

                  // Use YYYY-MM-DD for checking
                  const attendanceMap = new Map(empAttendances.map(a => [a.date.split('T')[0], a.status]));

                  for (let day = 1; day <= totalDays; day++) {
                      const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                      const currentDate = new Date(currentYear, currentMonth - 1, day);
                      const isSunday = currentDate.getDay() === 0;
                      const status = attendanceMap.get(dateStr);

                      if (status === 'DAY_SHIFT' || status === 'NIGHT_SHIFT' || status === 'HALF_DAY') {
                          presentDays += (status === 'HALF_DAY' ? 0.5 : 1);
                      }

                      if (isSunday && (status === 'DAY_SHIFT' || status === 'NIGHT_SHIFT')) {
                          sundayBonuses += (3 * oneDaySalary);
                          sundayBonusDays += 1;
                      } else if (!isSunday && status === 'ABSENT') {
                          absentDays++;
                      }
                  }

                  const lopDeduction = Math.round(absentDays * oneDaySalary);
                  const sundayBonusAmount = Math.round(sundayBonuses);
                  const grossSalary = Math.round(baseSalary - lopDeduction + sundayBonusAmount);

                  const summary = payrollSummary.find(s => s.id === emp.id);
                  const advanceDeduction = summary?.advanceDeduction || 0;
                  const marketValueBonus = marketValueAllocations[emp.id] || summary?.marketValueBonus || 0;
                  const netSalary = grossSalary - advanceDeduction + marketValueBonus;

                  return (
                    <TableRow key={emp.id} className="border-b border-gray-300">
                      <TableCell className="text-sm font-bold text-gray-900 border-r border-gray-300">{emp.employeeDetails?.customUserId || emp.id}</TableCell>
                      <TableCell className="text-sm font-semibold text-gray-800 border-r border-gray-300">{emp.name}</TableCell>
                      <TableCell className="text-sm text-center font-medium bg-gray-50/50 border-r border-gray-300">{totalDays}</TableCell>
                      <TableCell className="text-sm text-center font-bold text-emerald-600 border-r border-gray-300">{presentDays}</TableCell>
                      <TableCell className="text-sm text-center font-bold text-red-600 border-r border-gray-300">{absentDays}</TableCell>
                      <TableCell className="text-sm text-right border-r border-gray-300">₹{baseSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-center font-bold text-purple-700 border-r border-gray-300">{sundayBonusDays}</TableCell>
                      <TableCell className="text-sm text-right font-medium text-purple-700 border-r border-gray-300">+ ₹{sundayBonusAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-right font-medium text-blue-700 border-r border-gray-300">+ ₹{marketValueBonus.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-right font-semibold text-gray-800 border-r border-gray-300">₹{grossSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-right font-medium text-red-600 border-r border-gray-300">- ₹{lopDeduction.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-right font-medium text-amber-700 border-r border-gray-300">- ₹{advanceDeduction.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-right font-extrabold text-emerald-800 pr-4">₹{netSalary.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)} disabled={isGenerating}>Close</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isGenerating}
              onClick={async () => {
                setIsGenerating(true);
                try {
                  await savePayrollRecords({ month: currentMonth, year: currentYear });
                  setIsGenerateModalOpen(false);
                } catch (e) {
                  console.error(e);
                  // Optional: handle error UI
                } finally {
                  setIsGenerating(false);
                }
              }}
            >
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Confirm & Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
