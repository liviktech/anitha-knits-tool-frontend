import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useEmployees,
  usePayrollSummary,
  useMarketValueAllocations,
  useSalaryAdvances,
  useSavedPayrollRecords,
  useSavePayrollRecords,
  getEmployeeDisplayId,
} from './employee-queries';
import { useAttendanceRecords } from './attendance-queries';

interface GeneratePayrollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
  onMonthYearChange: (month: number, year: number) => void;
}

export function GeneratePayrollModal({ open, onOpenChange, month, year, onMonthYearChange }: GeneratePayrollModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: employees = [] } = useEmployees();
  const { data: payrollSummary = [] } = usePayrollSummary(month, year);
  const { data: marketValueAllocations = {} } = useMarketValueAllocations(month, year);
  const { data: salaryAdvances = [] } = useSalaryAdvances();
  const { data: savedRecords = [] } = useSavedPayrollRecords(month, year);
  const { mutateAsync: savePayrollRecords } = useSavePayrollRecords();

  const startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
  const { data: attendanceRecords = [] } = useAttendanceRecords(startDateStr, endDateStr);

  const isGenerated = savedRecords.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-fit min-w-[min(98vw,1600px)] border border-gray-400 font-hanken">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-purple-100 px-4 py-3">
          <DialogTitle className="text-lg font-bold text-black flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Generated Payroll Summary
            </div>
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
              className="h-8 text-sm w-42 border-gray-400 bg-white"
            />
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto overflow-x-auto max-h-[75vh] border-y border-gray-300">
          <Table className="border-collapse">
            <TableHeader className="bg-gray-50/50 sticky top-0 z-10">
              <TableRow className="border-b border-gray-300">
                <TableHead colSpan={7} className="text-sm font-bold text-gray-800 !text-center border-r border-gray-300">Employee Details</TableHead>
                <TableHead colSpan={2} className="text-sm font-bold text-blue-700 text-center border-r border-gray-300 bg-blue-50/30">Sunday/Machine value</TableHead>
                <TableHead colSpan={1} className="text-sm font-bold text-gray-800 text-center border-r border-gray-300 bg-emerald-50/30">Gross</TableHead>
                <TableHead colSpan={3} className="text-sm font-bold text-red-700 text-center border-r border-gray-300 bg-red-50/30">Deductions</TableHead>
                <TableHead colSpan={3} className="text-sm font-bold text-gray-800 !text-center bg-emerald-50/30">Final</TableHead>
              </TableRow>
              <TableRow className="border-b border-gray-300">
                <TableHead className="text-xs font-semibold text-gray-800 px-2 border-r border-gray-300">Emp ID</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 px-2 border-r border-gray-300">Employee Name</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right px-2 border-r border-gray-300">Base Salary</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-center px-2 border-r border-gray-300" title="Present">P</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-center px-2 border-r border-gray-300" title="Company Holiday">L</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-center px-2 border-r border-gray-300" title="Sunday Allowance (Days)">S</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-center px-2 border-r border-gray-300" title="Absent">A</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right text-purple-700 px-2 border-r border-gray-300">Sunday Bonus</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right text-blue-700 px-2 border-r border-gray-300">Machine Value</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right px-2 border-r border-gray-300">Gross Pay</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right text-red-600 px-2 border-r border-gray-300">LOP</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right text-amber-700 px-2 border-r border-gray-300">Advance Deducted</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right text-red-600 px-2 border-r border-gray-300">Market Value</TableHead>
                <TableHead className="text-xs font-extrabold text-gray-900 text-right px-2 border-r border-gray-300 bg-emerald-50/50">Net Payable</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right text-orange-700 px-2 border-r border-gray-300 bg-emerald-50/50">Other Deduction</TableHead>
                <TableHead className="text-xs font-semibold text-gray-800 text-right text-amber-900 px-2 bg-emerald-50/50">Advance Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => {
                const empAttendances = attendanceRecords.filter(a => a.employeeId === emp.id);
                const totalDays = new Date(year, month, 0).getDate();

                const baseSalary = Number(emp.employeeDetails?.salary || 0);
                const oneDaySalary = baseSalary / totalDays;

                let presentDays = 0;
                let absentDays = 0;
                let sundayBonuses = 0;
                let sundayBonusDays = 0;
                let companyHolidays = 0;

                // Use YYYY-MM-DD for checking
                const attendanceMap = new Map(empAttendances.map(a => [a.date.split('T')[0], a.status]));

                for (let day = 1; day <= totalDays; day++) {
                  const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const currentDate = new Date(year, month - 1, day);
                  const isSunday = currentDate.getDay() === 0;
                  const status = attendanceMap.get(dateStr);

                  if (isSunday) {
                    if (status === 'DAY_SHIFT' || status === 'NIGHT_SHIFT') {
                      sundayBonuses += (3 * oneDaySalary);
                      sundayBonusDays += 1;
                      presentDays += 1;
                    }
                  } else {
                    if (status === 'DAY_SHIFT' || status === 'NIGHT_SHIFT') {
                      presentDays += 1;
                    } else if (status === 'HALF_DAY') {
                      presentDays += 0.5;
                      absentDays += 0.5;
                    } else if (status === 'COMPANY_HOLIDAY') {
                      companyHolidays += 1;
                    } else {
                      absentDays += 1;
                    }
                  }
                }

                const lopDeduction = Math.round(absentDays * oneDaySalary);
                const sundayBonusAmount = Math.round(sundayBonuses);
                const grossSalary = Math.round(baseSalary - lopDeduction + sundayBonusAmount);

                const summary = payrollSummary.find(s => s.id === emp.id);
                const advanceDeduction = summary?.advanceDeduction || 0;

                const activeAdvances = salaryAdvances.filter(a => a.employeeId === emp.id && a.status === 'ACTIVE');
                const currentRemainingAdvance = activeAdvances.reduce((sum, a) => sum + a.remainingAmount, 0);
                const advanceBalance = Math.max(0, currentRemainingAdvance - (isGenerated ? 0 : advanceDeduction));

                const marketValueBonus = marketValueAllocations[emp.id] || summary?.marketValueBonus || 0;
                const marketValueDeduction = summary?.marketValueDeduction || 0;
                const otherDeduction = summary?.otherDeduction || 0;
                const netSalary = grossSalary - advanceDeduction + marketValueBonus - marketValueDeduction - otherDeduction;

                return (
                  <TableRow key={emp.id} className="border-b border-gray-300">
                    <TableCell className="text-sm font-bold text-gray-900 px-2 border-r border-gray-300">{getEmployeeDisplayId(emp)}</TableCell>
                    <TableCell className="text-sm font-semibold text-gray-800 px-2 border-r border-gray-300">{emp.name}</TableCell>
                    <TableCell className="text-sm text-right px-2 border-r border-gray-300">₹{baseSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-center font-bold text-emerald-600 px-2 border-r border-gray-300">{presentDays}</TableCell>
                    <TableCell className="text-sm text-center font-bold text-blue-600 px-2 border-r border-gray-300">{companyHolidays}</TableCell>
                    <TableCell className="text-sm text-center font-bold text-purple-700 px-2 border-r border-gray-300">{sundayBonusDays}</TableCell>
                    <TableCell className="text-sm text-center font-bold text-red-600 px-2 border-r border-gray-300">{absentDays}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-purple-700 px-2 border-r border-gray-300">+ ₹{sundayBonusAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-blue-700 px-2 border-r border-gray-300">+ ₹{marketValueBonus.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-semibold text-gray-800 px-2 border-r border-gray-300">₹{grossSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-red-600 px-2 border-r border-gray-300">- ₹{lopDeduction.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-amber-700 px-2 border-r border-gray-300">- ₹{advanceDeduction.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-red-600 px-2 border-r border-gray-300">- ₹{marketValueDeduction.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-extrabold text-emerald-800 px-2 border-r border-gray-300 bg-emerald-50/30">₹{netSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-orange-700 px-2 border-r border-gray-300 bg-emerald-50/30">- ₹{otherDeduction.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-bold text-amber-900 px-2 bg-emerald-50/30">₹{advanceBalance.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>Close</Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isGenerating}
            onClick={async () => {
              setIsGenerating(true);
              try {
                await savePayrollRecords({ month, year });
                onOpenChange(false);
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
  );
}
