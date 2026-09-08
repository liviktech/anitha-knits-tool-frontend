import { useState } from 'react';
import { Wallet, Calendar, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApproveConfirmDialog } from '@/components/shared/approve-confirm-dialog';
import {
  useEmployees,
  usePayrollSummary,
  useMarketValueAllocations,
  useDistributeMarketValue,
  useGrantMarketValueDeduction,
  useGrantOtherDeduction,
  getEmployeeDisplayId,
} from './employee-queries';

interface PayrollValueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
}

export function PayrollValueModal({ open, onOpenChange, month, year }: PayrollValueModalProps) {
  const { data: employees = [] } = useEmployees();
  const { data: payrollSummary = [] } = usePayrollSummary(month, year);
  const { data: marketValueAllocations = {} } = useMarketValueAllocations(month, year);
  const { mutate: distributeMarketValue, isPending: isDistributing } = useDistributeMarketValue();
  const { mutateAsync: grantMarketValueDeduction } = useGrantMarketValueDeduction();
  const { mutateAsync: grantOtherDeduction } = useGrantOtherDeduction();

  const [valueModalTab, setValueModalTab] = useState<'machine' | 'market' | 'other'>('machine');

  // Machine Value (distribution) Form State — no Effective Date input; the effective date is
  // derived from the Payroll tab's own month/year picker (shown in the modal header).
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Market Value (deduction) Form State — same per-employee list shape as Machine Value, but
  // with no shared pool to match: each employee's deduction is independent.
  const [marketDeductions, setMarketDeductions] = useState<Record<string, number>>({});
  const [isSavingMarketDeductions, setIsSavingMarketDeductions] = useState(false);

  // Other Deductions Form State — per-employee name + amount, since different employees can
  // have different deduction reasons in the same batch (unlike Machine/Market Value, which are
  // a single shared name/reason applied across everyone).
  const [otherDeductions, setOtherDeductions] = useState<Record<string, number>>({});
  const [otherDeductionNames, setOtherDeductionNames] = useState<Record<string, string>>({});
  const [isSavingOtherDeductions, setIsSavingOtherDeductions] = useState(false);

  // Confirmation dialog state for value modal actions
  const [pendingValueConfirm, setPendingValueConfirm] = useState<'machine' | 'market' | 'other' | null>(null);

  const currentAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const totalDeductions = Object.values(marketDeductions).reduce((a, b) => a + b, 0);
  const totalOtherDeductions = Object.values(otherDeductions).reduce((a, b) => a + b, 0);

  // First day of the currently selected Payroll month/year — every mutation in this modal
  // (all three tabs) uses this as its effectiveDate now that there's no separate date field.
  const valueModalEffectiveDate = `${year}-${month.toString().padStart(2, '0')}-01`;

  const resetValueModalState = () => {
    setValueModalTab('machine');
    setAllocations({});
    setMarketDeductions({});
    setOtherDeductions({});
    setOtherDeductionNames({});
  };

  // Pre-fill modal with current month's existing values when opening
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      // Machine Value: pre-fill from marketValueAllocations (API data for current month)
      const prefillAllocations: Record<string, number> = {};
      for (const [empId, val] of Object.entries(marketValueAllocations)) {
        if (val > 0) prefillAllocations[empId] = val;
      }
      setAllocations(prefillAllocations);

      // Market Value Deduction: pre-fill from payrollSummary
      const prefillMarket: Record<string, number> = {};
      for (const s of payrollSummary) {
        if (s.marketValueDeduction > 0) prefillMarket[s.id] = s.marketValueDeduction;
      }
      setMarketDeductions(prefillMarket);

      // Other Deductions: pre-fill amount + a representative name from payrollSummary. An
      // employee can have several differently-named deductions in one month, so the name is
      // best-effort (the backend's most-recently-created one) — still editable per row here.
      const prefillOther: Record<string, number> = {};
      const prefillOtherNames: Record<string, string> = {};
      for (const s of payrollSummary) {
        if (s.otherDeduction > 0) {
          prefillOther[s.id] = s.otherDeduction;
          if (s.otherDeductionName) prefillOtherNames[s.id] = s.otherDeductionName;
        }
      }
      setOtherDeductions(prefillOther);
      setOtherDeductionNames(prefillOtherNames);
    } else {
      resetValueModalState();
    }
    onOpenChange(nextOpen);
  };

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
    setAllocations(prev => ({ ...prev, [empId]: numValue }));
  };

  const handleDeductionChange = (empId: string, val: string) => {
    if (val === '') {
      setMarketDeductions(prev => {
        const next = { ...prev };
        delete next[empId];
        return next;
      });
      return;
    }
    const numValue = parseInt(val, 10);
    if (isNaN(numValue) || numValue < 0) return;
    setMarketDeductions(prev => ({ ...prev, [empId]: numValue }));
  };

  const handleSaveMarketDeductions = async () => {
    const entries = Object.entries(marketDeductions).filter(([, amount]) => amount > 0);
    if (entries.length === 0) return;

    setIsSavingMarketDeductions(true);
    try {
      await Promise.all(
        entries.map(([employeeId, amount]) =>
          grantMarketValueDeduction({ employeeId, amount, effectiveDate: valueModalEffectiveDate }),
        ),
      );
      handleOpenChange(false);
    } catch (err) {
      console.error('Failed to grant deductions:', err);
    } finally {
      setIsSavingMarketDeductions(false);
    }
  };

  const handleOtherDeductionChange = (empId: string, val: string) => {
    if (val === '') {
      setOtherDeductions(prev => {
        const next = { ...prev };
        delete next[empId];
        return next;
      });
      return;
    }
    const numValue = parseInt(val, 10);
    if (isNaN(numValue) || numValue < 0) return;
    setOtherDeductions(prev => ({ ...prev, [empId]: numValue }));
  };

  const handleOtherDeductionNameChange = (empId: string, val: string) => {
    setOtherDeductionNames(prev => ({ ...prev, [empId]: val }));
  };

  const handleSaveOtherDeductions = async () => {
    const entries = Object.entries(otherDeductions).filter(([, amount]) => amount > 0);
    if (entries.length === 0) return;

    setIsSavingOtherDeductions(true);
    try {
      await Promise.all(
        entries.map(([employeeId, amount]) =>
          grantOtherDeduction({
            employeeId,
            amount,
            name: (otherDeductionNames[employeeId] || '').trim() || 'Other Deduction',
            effectiveDate: valueModalEffectiveDate,
          }),
        ),
      );
      handleOpenChange(false);
    } catch (err) {
      console.error('Failed to grant other deductions:', err);
    } finally {
      setIsSavingOtherDeductions(false);
    }
  };

  return (
    <>
      {/* Machine Value / Market Value / Other Deductions Modal — one dialog, three tabs, no
          separate date pickers (every mutation uses the Payroll tab's own month/year, shown in
          the header badge). */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl border border-gray-400 font-hanken">
          <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black flex items-center justify-between gap-2 pr-6">
              <span className="flex items-center gap-2">
                <Wallet className="w-5 h-5" /> Machine &amp; Market Value
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={valueModalTab} onValueChange={(v) => setValueModalTab(v as 'machine' | 'market' | 'other')} className="gap-3">
            <TabsList className="grid grid-cols-3 h-9 bg-gray-200/60 p-1 rounded-md">
              <TabsTrigger value="machine" className="group text-xs font-semibold text-gray-600 data-[state=active]:!bg-[#004D40] data-[state=active]:!text-white rounded">
                <Wallet className="w-3.5 h-3.5 mr-1 text-[#004D40] group-data-[state=active]:text-white" /> Machine Value
              </TabsTrigger>
              <TabsTrigger value="market" className="group text-xs font-semibold text-gray-600 data-[state=active]:!bg-[#004D40] data-[state=active]:!text-white rounded">
                <MinusCircle className="w-3.5 h-3.5 mr-1 text-[#004D40] group-data-[state=active]:text-white" /> Market Value
              </TabsTrigger>
              <TabsTrigger value="other" className="group text-xs font-semibold text-gray-600 data-[state=active]:!bg-[#004D40] data-[state=active]:!text-white rounded">
                <MinusCircle className="w-3.5 h-3.5 mr-1 text-[#004D40] group-data-[state=active]:text-white" /> Other Deductions
              </TabsTrigger>
            </TabsList>

            {/* Machine Value tab — employee list first, Total Pool / Remaining last */}
            <TabsContent value="machine" className="grid gap-3 mt-0">
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
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
                          <div className="text-[10px] text-gray-500">{getEmployeeDisplayId(emp)}</div>
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

              <div className="flex justify-end pt-1 pr-2">
                <div className="text-sm font-bold text-gray-800">Total Machine Value: <span className="text-blue-700">₹{currentAllocated.toLocaleString()}</span></div>
              </div>
            </TabsContent>

            {/* Market Value tab — same shape: employee list first, Total last, no pool to match */}
            <TabsContent value="market" className="grid gap-3 mt-0">
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
                <Table className="font-hanken">
                  <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b border-gray-200">
                      <TableHead className="text-xs font-semibold text-gray-700 h-8 py-1">Employee</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-700 text-right h-8 py-1 w-[120px]">Deduction (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <TableCell className="py-1.5 text-xs">
                          <div className="font-medium text-gray-900">{emp.name || 'Unnamed Employee'}</div>
                          <div className="text-[10px] text-gray-500">{getEmployeeDisplayId(emp)}</div>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-7 text-xs text-right w-full"
                            value={marketDeductions[emp.id] || ''}
                            onChange={(e) => handleDeductionChange(emp.id, e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-1 pr-2">
                <div className="text-sm font-bold text-gray-800">Total Deduction: <span className="text-red-700">₹{totalDeductions.toLocaleString()}</span></div>
              </div>
            </TabsContent>

            {/* Other Deductions tab — per-employee name + amount, since different employees
                can have different deduction reasons in the same batch. */}
            <TabsContent value="other" className="grid gap-3 mt-0">
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
                <Table className="font-hanken">
                  <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b border-gray-200">
                      <TableHead className="text-xs font-semibold text-gray-700 h-8 py-1">Employee</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-700 h-8 py-1 w-[160px]">Deduction Name</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-700 text-right h-8 py-1 w-[120px]">Deduction (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <TableCell className="py-1.5 text-xs">
                          <div className="font-medium text-gray-900">{emp.name || 'Unnamed Employee'}</div>
                          <div className="text-[10px] text-gray-500">{getEmployeeDisplayId(emp)}</div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="text"
                            placeholder="e.g. Canteen, Transport"
                            className="h-7 text-xs w-full"
                            value={otherDeductionNames[emp.id] || ''}
                            onChange={(e) => handleOtherDeductionNameChange(emp.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-7 text-xs text-right w-full"
                            value={otherDeductions[emp.id] || ''}
                            onChange={(e) => handleOtherDeductionChange(emp.id, e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-1 pr-2">
                <div className="text-sm font-bold text-gray-800">Total Deduction: <span className="text-orange-700">₹{totalOtherDeductions.toLocaleString()}</span></div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t border-gray-200 bg-white pt-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} className="h-8 text-xs">Cancel</Button>
            {valueModalTab === 'machine' ? (
              <Button
                size="sm"
                className="h-8 bg-[#004D40] hover:bg-[#00382e] text-white text-xs px-4"
                disabled={isDistributing || currentAllocated <= 0}
                onClick={() => setPendingValueConfirm('machine')}
              >
                Apply & Distribute
              </Button>
            ) : valueModalTab === 'market' ? (
              <Button
                size="sm"
                className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs px-4"
                disabled={isSavingMarketDeductions || totalDeductions <= 0}
                onClick={() => setPendingValueConfirm('market')}
              >
                Grant Deductions
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 bg-orange-600 hover:bg-orange-700 text-white text-xs px-4"
                disabled={isSavingOtherDeductions || totalOtherDeductions <= 0}
                onClick={() => setPendingValueConfirm('other')}
              >
                Grant Other Deductions
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Value Modal Confirmation Dialog */}
      <ApproveConfirmDialog
        open={!!pendingValueConfirm}
        onOpenChange={(o) => { if (!o) setPendingValueConfirm(null); }}
        isPending={isDistributing || isSavingMarketDeductions || isSavingOtherDeductions}
        title={
          pendingValueConfirm === 'machine' ? 'Apply Machine Value?' :
          pendingValueConfirm === 'market' ? 'Grant Market Value Deductions?' :
          'Grant Other Deductions?'
        }
        description={
          pendingValueConfirm === 'machine'
            ? `Distribute ₹${currentAllocated.toLocaleString()} machine value across employees for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}. This will overwrite any existing allocations.`
            : pendingValueConfirm === 'market'
            ? `Grant market value deductions totalling ₹${totalDeductions.toLocaleString()} for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}.`
            : `Grant other deductions totalling ₹${totalOtherDeductions.toLocaleString()} for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}.`
        }
        confirmLabel={
          pendingValueConfirm === 'machine' ? 'Apply & Distribute' :
          pendingValueConfirm === 'market' ? 'Grant Deductions' :
          'Grant Other Deductions'
        }
        confirmingLabel="Processing..."
        onConfirm={() => {
          if (pendingValueConfirm === 'machine') {
            distributeMarketValue({
              marketValueDate: valueModalEffectiveDate,
              totalPool: currentAllocated,
              allocations
            }, {
              onSuccess: () => {
                setPendingValueConfirm(null);
                handleOpenChange(false);
              },
              onError: (err) => {
                setPendingValueConfirm(null);
                console.error('Failed to distribute:', err);
              }
            });
          } else if (pendingValueConfirm === 'market') {
            handleSaveMarketDeductions().then(() => setPendingValueConfirm(null)).catch(() => setPendingValueConfirm(null));
          } else if (pendingValueConfirm === 'other') {
            handleSaveOtherDeductions().then(() => setPendingValueConfirm(null)).catch(() => setPendingValueConfirm(null));
          }
        }}
      />
    </>
  );
}
