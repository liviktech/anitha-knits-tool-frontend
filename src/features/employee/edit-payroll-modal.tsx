import { useEffect, useState } from 'react';
import { Edit2, MinusCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useUpdatePayrollRecord } from './employee-queries';
import type { PayrollRow } from './payroll-table';

interface EditPayrollModalProps {
  row: PayrollRow | null;
  month: number;
  year: number;
  onClose: () => void;
}

export function EditPayrollModal({ row, month, year, onClose }: EditPayrollModalProps) {
  const { mutate: updatePayrollRecord, isPending: isUpdatingPayrollRecord } = useUpdatePayrollRecord();

  const [editMarketValueBonus, setEditMarketValueBonus] = useState('');
  const [editMarketValueDeduction, setEditMarketValueDeduction] = useState('');
  const [editOtherDeductionName, setEditOtherDeductionName] = useState('');
  const [editOtherDeductionAmount, setEditOtherDeductionAmount] = useState('');

  // Re-seed the editable fields from the row every time a (possibly different) row is opened
  // for editing — mirrors the previous "open" handler that primed this same state on click.
  useEffect(() => {
    if (!row) return;
    setEditMarketValueBonus(String(row.marketValueBonus));
    setEditMarketValueDeduction(String(row.marketValueDeduction));
    setEditOtherDeductionName('');
    setEditOtherDeductionAmount(String(row.otherDeduction ?? 0));
  }, [row]);

  const dynamicNetPay = row
    ? row.grossSalary -
    row.advanceDeduction +
    (parseFloat(editMarketValueBonus) || 0) -
    (parseFloat(editMarketValueDeduction) || 0) -
    (parseFloat(editOtherDeductionAmount) || 0)
    : 0;

  const handleSave = () => {
    if (!row) return;
    updatePayrollRecord({
      employeeId: row.id,
      data: {
        month,
        year,
        baseSalary: row.baseSalary,
        daysWorked: row.daysWorked,
        advanceDeduction: row.advanceDeduction,
        marketValueBonus: parseFloat(editMarketValueBonus) || 0,
        marketValueDeduction: parseFloat(editMarketValueDeduction) || 0,
        otherDeduction: parseFloat(editOtherDeductionAmount) || 0,
      },
    }, {
      onSuccess: () => onClose(),
      onError: (err) => alert('Failed to update payroll record: ' + err.message),
    });
  };

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg border border-gray-400 font-hanken">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-lg font-bold text-black flex items-center gap-2">
            <Edit2 className="w-4.5 h-4.5" /> Edit Payroll — {row?.name}
          </DialogTitle>
        </DialogHeader>

        {row && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1 shadow-sm">
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-bold">Employee</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-bold">Base Salary</p>
              <p className="text-sm font-semibold text-gray-900">₹{row.baseSalary.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-bold">Gross Pay</p>
              <p className="text-sm font-semibold text-gray-900">₹{row.grossSalary.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-bold">Net Pay</p>
              <p className="text-sm font-extrabold text-emerald-700">₹{dynamicNetPay.toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="grid gap-3 py-2">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0"><MinusCircle className="w-3.5 h-3.5 text-orange-700" /></div>
              <Label className="text-xs font-semibold text-orange-800 uppercase tracking-wide">Other Deduction</Label>
            </div>
            <Input
              type="text"
              placeholder="Deduction name (e.g. Canteen, Transport)"
              className="h-9 text-sm bg-white"
              value={editOtherDeductionName}
              onChange={(e) => setEditOtherDeductionName(e.target.value)}
            />
            <Input
              type="number"
              min="0"
              placeholder="0"
              className="h-9 text-sm font-semibold bg-white"
              value={editOtherDeductionAmount}
              onChange={(e) => setEditOtherDeductionAmount(e.target.value)}
            />
            <div className="flex justify-between items-center text-[11px] mt-1">
              <span className="text-orange-800/70 font-medium">Deduction Amount</span>
              <span className="font-semibold text-emerald-700">Net Pay: ₹{dynamicNetPay.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Wallet className="w-3.5 h-3.5 text-blue-700" /></div>
                <Label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Machine Value</Label>
              </div>
              <div className="text-[11px] text-blue-700 font-medium bg-blue-100/50 px-2 py-0.5 rounded-full">
                Effective: {new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
              </div>
            </div>
            <Input
              type="number"
              min="0"
              className="h-9 text-sm font-semibold bg-white"
              value={editMarketValueBonus}
              onChange={(e) => setEditMarketValueBonus(e.target.value)}
            />
            <div className="flex justify-between items-center text-[11px] mt-1">
              <span className="text-blue-800/70 font-medium">Bonus Amount</span>
              <span className="font-semibold text-emerald-700">Net Pay: ₹{dynamicNetPay.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center shrink-0"><MinusCircle className="w-3.5 h-3.5 text-red-700" /></div>
                <Label className="text-xs font-semibold text-red-800 uppercase tracking-wide">Market Value</Label>
              </div>
              <div className="text-[11px] text-red-700 font-medium bg-red-100/50 px-2 py-0.5 rounded-full">
                Effective: {new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
              </div>
            </div>
            <Input
              type="number"
              min="0"
              className="h-9 text-sm font-semibold bg-white"
              value={editMarketValueDeduction}
              onChange={(e) => setEditMarketValueDeduction(e.target.value)}
            />
            <div className="flex justify-between items-center text-[11px] mt-1">
              <span className="text-red-800/70 font-medium">Deduction Amount</span>
              <span className="font-semibold text-emerald-700">Net Pay: ₹{dynamicNetPay.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-gray-200 bg-white pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isUpdatingPayrollRecord} className="h-8 text-xs">Cancel</Button>
          <Button
            size="sm"
            className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs px-4"
            disabled={isUpdatingPayrollRecord}
            onClick={handleSave}
          >
            {isUpdatingPayrollRecord ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
