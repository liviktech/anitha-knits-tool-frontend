import { useEffect, useState } from 'react';
import { Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useEmployees, useGrantSalaryAdvance, useUpdateSalaryAdvance, type SalaryAdvanceRecord } from './employee-queries';

interface SalaryAdvanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the modal edits this existing advance instead of granting a new one. */
  advance?: SalaryAdvanceRecord | null;
}

export function SalaryAdvanceModal({ open, onOpenChange, advance = null }: SalaryAdvanceModalProps) {
  const isEditMode = !!advance;
  const { data: employees = [] } = useEmployees();
  const { mutate: grantAdvance, isPending: isGrantingAdvance } = useGrantSalaryAdvance();
  const { mutate: updateAdvance, isPending: isUpdatingAdvance } = useUpdateSalaryAdvance();
  const isSaving = isGrantingAdvance || isUpdatingAdvance;

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

  // Re-seed the form every time the modal opens — either blank (grant mode) or from the
  // advance being edited — since this Dialog's content stays mounted across close/reopen.
  useEffect(() => {
    if (!open) return;
    if (advance) {
      setAdvanceEmployeeId(advance.employeeId);
      setAdvanceAmount(String(advance.amount));
      setAdvanceDate(advance.effectiveDate.split('T')[0]);
      setAdvanceType(advance.repaymentMethod);
      setAdvanceMonths(advance.totalMonths ? String(advance.totalMonths) : '');
    } else {
      resetAdvanceForm();
    }
  }, [open, advance]);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetAdvanceForm(); }}>
      <DialogContent className="sm:max-w-md border border-gray-400 font-hanken">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-lg font-bold text-black flex items-center gap-2">
            <Banknote className="w-5 h-5" /> {isEditMode ? 'Edit Salary Advance' : 'Grant Salary Advance'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Select Employee</Label>
            <Select value={advanceEmployeeId} onValueChange={setAdvanceEmployeeId} disabled={isEditMode}>
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">Cancel</Button>
          <Button
            size="sm"
            className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs px-4"
            disabled={isSaving || !isAdvanceFormValid}
            onClick={() => {
              if (isEditMode && advance) {
                updateAdvance({
                  id: advance.id,
                  data: {
                    amount: advanceAmountNum,
                    effectiveDate: advanceDate,
                    repaymentMethod: advanceType,
                    ...(advanceType === 'emi' ? { totalMonths: advanceMonthsNum } : {}),
                  },
                }, {
                  onSuccess: () => onOpenChange(false),
                  onError: (err) => alert('Failed to update advance: ' + err.message),
                });
                return;
              }
              grantAdvance({
                employeeId: advanceEmployeeId,
                amount: advanceAmountNum,
                effectiveDate: advanceDate,
                repaymentMethod: advanceType,
                ...(advanceType === 'emi' ? { totalMonths: advanceMonthsNum } : {}),
              }, {
                onSuccess: () => {
                  onOpenChange(false);
                  resetAdvanceForm();
                  alert('Salary advance granted successfully!');
                },
                onError: (err) => {
                  alert('Failed to grant advance: ' + err.message);
                }
              });
            }}
          >
            {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Grant Advance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
