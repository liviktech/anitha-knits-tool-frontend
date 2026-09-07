import { useState, forwardRef, useImperativeHandle } from 'react';
import { Wallet, Banknote, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { useSavedPayrollRecords, usePayrollSummary, useMarketValueAllocations, useDeletePayrollRecord } from './employee-queries';
import { PayrollTable, type PayrollRow } from './payroll-table';
import { SalaryAdvanceTable } from './salary-advance-table';
import { SalaryAdvanceModal } from './salary-advance-modal';
import { PayrollValueModal } from './payroll-value-modal';
import { GeneratePayrollModal } from './generate-payroll-modal';
import { EditPayrollModal } from './edit-payroll-modal';

export interface PayrollTabRef {
  openGenerateModal: () => void;
  openReportModal: () => void;
}

export const PayrollTab = forwardRef<PayrollTabRef>((_, ref) => {
  const [activeSubTab, setActiveSubTab] = useState<'payroll' | 'advance'>('payroll');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [editingPayrollRow, setEditingPayrollRow] = useState<PayrollRow | null>(null);
  const [deletePayrollTarget, setDeletePayrollTarget] = useState<PayrollRow | null>(null);

  const { mutate: deletePayrollRecord, isPending: isDeletingPayrollRecord } = useDeletePayrollRecord();

  useImperativeHandle(ref, () => ({
    openGenerateModal: () => setIsGenerateModalOpen(true),
  }));

  const handleMonthYearChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  // Top stat cards — derived from the same saved/summary/allocation data the Payroll table uses;
  // TanStack Query dedupes these against the table's own fetches via the shared cache.
  const { data: savedRecords = [] } = useSavedPayrollRecords(currentMonth, currentYear);
  const { data: payrollSummary = [] } = usePayrollSummary(currentMonth, currentYear);
  const { data: marketValueAllocations = {} } = useMarketValueAllocations(currentMonth, currentYear);
  const isGenerated = savedRecords.length > 0;

  const totalPayroll = isGenerated
    ? savedRecords.reduce((sum, p) => sum + Number(p.netSalary), 0)
    : payrollSummary.reduce((sum, p) => sum + p.netSalary, 0);
  const totalAdvances = isGenerated
    ? savedRecords.reduce((sum, p) => sum + Number(p.advanceDeduction), 0)
    : payrollSummary.reduce((sum, p) => sum + p.advanceDeduction, 0);
  const totalMarketValue = isGenerated
    ? savedRecords.reduce((sum, p) => sum + Number(p.marketValueBonus), 0)
    : Object.values(marketValueAllocations).reduce((sum, val) => sum + val, 0);

  const handleDeletePayrollConfirm = () => {
    if (!deletePayrollTarget) return;
    deletePayrollRecord({
      employeeId: deletePayrollTarget.id,
      month: currentMonth,
      year: currentYear,
    }, {
      onSuccess: () => setDeletePayrollTarget(null),
      onError: (err) => alert('Failed to delete payroll record: ' + err.message),
    });
  };

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
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Machine Value</h3>
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

        <TabsContent value="payroll" className="flex-1 flex flex-col min-h-0 mt-0">
          <PayrollTable
            month={currentMonth}
            year={currentYear}
            onMonthYearChange={handleMonthYearChange}
            onOpenValueModal={() => setIsValueModalOpen(true)}
            onOpenAdvanceModal={() => setIsAdvanceModalOpen(true)}
            onEditRow={setEditingPayrollRow}
            onDeleteRow={setDeletePayrollTarget}
          />
        </TabsContent>

        <TabsContent value="advance" className="flex-1 flex flex-col min-h-0 mt-0">
          <SalaryAdvanceTable onOpenAdvanceModal={() => setIsAdvanceModalOpen(true)} />
        </TabsContent>
      </Tabs>

      <SalaryAdvanceModal open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen} />

      <PayrollValueModal
        open={isValueModalOpen}
        onOpenChange={setIsValueModalOpen}
        month={currentMonth}
        year={currentYear}
      />

      <GeneratePayrollModal
        open={isGenerateModalOpen}
        onOpenChange={setIsGenerateModalOpen}
        month={currentMonth}
        year={currentYear}
        onMonthYearChange={handleMonthYearChange}
      />

      <EditPayrollModal
        row={editingPayrollRow}
        month={currentMonth}
        year={currentYear}
        onClose={() => setEditingPayrollRow(null)}
      />

      <DeleteConfirmDialog
        open={!!deletePayrollTarget}
        onOpenChange={(open) => !open && setDeletePayrollTarget(null)}
        onConfirm={handleDeletePayrollConfirm}
        isPending={isDeletingPayrollRecord}
        title="Clear this payroll record?"
        description={
          deletePayrollTarget
            ? `This removes ${deletePayrollTarget.name}'s payroll record for ${new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}. The employee record itself is not affected.`
            : undefined
        }
      />

      <PayrollReportModal
        open={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        monthStr={`${currentYear}-${currentMonth.toString().padStart(2, '0')}`}
        rows={filteredPayroll.map(row => ({
          employeeId: row.customUserId || row.id,
          name: row.name || '-',
          baseSalary: row.baseSalary,
          daysWorked: row.daysWorked,
          grossSalary: row.grossSalary,
          advanceDeduction: row.advanceDeduction,
          marketValueBonus: row.marketValueBonus,
          marketValueDeduction: row.marketValueDeduction,
          otherDeduction: row.otherDeduction ?? 0,
          netSalary: row.netSalary,
        }))}
        totalPayroll={totalPayroll}
        totalAdvances={totalAdvances}
        totalMachineValue={totalMarketValue}
      />
    </div>
  );
});
