import { useState } from 'react';
import { Search, Plus, Wallet, FileText, Banknote, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Mock data
const mockPayrollData = [
  { id: 'EMP-001', name: 'Ramesh Kumar', baseSalary: 25000, daysWorked: 26, grossSalary: 25000, advanceDeduction: 2000, marketValueBonus: 1500, netSalary: 24500, status: 'Pending' },
  { id: 'EMP-002', name: 'Suresh Raina', baseSalary: 22000, daysWorked: 24, grossSalary: 20307, advanceDeduction: 0, marketValueBonus: 1500, netSalary: 21807, status: 'Paid' },
  { id: 'EMP-003', name: 'Anita Desai', baseSalary: 28000, daysWorked: 26, grossSalary: 28000, advanceDeduction: 5000, marketValueBonus: 1500, netSalary: 24500, status: 'Pending' },
];

export function PayrollTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isMarketValueModalOpen, setIsMarketValueModalOpen] = useState(false);
  const isLoading = false; // Placeholder for actual loading state


  // Advance Form State
  const [advanceType, setAdvanceType] = useState('single');

  // Market Value Form State
  const [allocationType, setAllocationType] = useState('equal');

  const filteredPayroll = mockPayrollData.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2 h-[calc(100%-3px)] flex-1 min-h-0 p-2">

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2" style={{ fontFamily: "'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif" }}>
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-emerald-300 transition-colors flex flex-col justify-center">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Total Payroll (Est)</h3>
              <div className="text-xl font-bold text-gray-800 mt-1">₹ 75,000</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center"><Wallet className="w-5 h-5 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-amber-300 transition-colors flex flex-col justify-center">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Total Advances</h3>
              <div className="text-xl font-bold text-gray-800 mt-1">₹ 7,000</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center"><Banknote className="w-5 h-5 text-amber-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-300 transition-colors flex flex-col justify-center">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Market Value Pool</h3>
              <div className="text-xl font-bold text-gray-800 mt-1">₹ 4,500</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center"><Banknote className="w-5 h-5 text-blue-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-purple-300 transition-colors flex flex-col justify-center">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Payroll Month</h3>
              <div className="text-xl font-bold text-gray-800 mt-1">August 2026</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center"><Calendar className="w-5 h-5 text-purple-600" /></div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="border-b border-emerald-400 p-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={() => setIsAdvanceModalOpen(true)}>
              <Banknote className="w-3.5 h-3.5 mr-1" /> Give Advance
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={() => setIsMarketValueModalOpen(true)}>
              <Wallet className="w-3.5 h-3.5 mr-1" /> Distribute Market Value
            </Button>
            <Button size="sm" className="h-8 bg-[#004D40] hover:bg-[#00332a] text-xs font-bold text-white shadow-sm">
              <FileText className="w-3.5 h-3.5 mr-1" /> Generate Payroll
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1 flex flex-col">
          <Table className="font-hanken">
            <TableHeader className="bg-emerald-50/30">
              <TableRow className="hover:bg-transparent border-b border-emerald-400">
                <TableHead className="text-xs font-semibold tracking-wide text-gray-800 w-[100px] pl-4">Emp ID</TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-gray-800">Name</TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-gray-800 text-right">Base Salary</TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-gray-800 text-center">Days Worked</TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-gray-800 text-right">Gross Salary</TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-gray-800 text-right text-amber-700">Advance Deducted</TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-gray-800 text-right text-blue-700">Market Value Share</TableHead>
                <TableHead className="text-xs font-extrabold tracking-wide text-gray-900 text-right pr-4">Net Payable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayroll.map((row) => (
                <TableRow key={row.id} className="border-b border-emerald-50 hover:bg-emerald-50/30 transition-colors">
                  <TableCell className="pl-4 text-xs font-bold text-gray-900">{row.id}</TableCell>
                  <TableCell className="text-xs font-semibold text-gray-800">{row.name}</TableCell>
                  <TableCell className="text-xs text-right">₹{row.baseSalary.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-center font-medium bg-gray-50/50">{row.daysWorked}</TableCell>
                  <TableCell className="text-xs text-right font-semibold text-gray-700">₹{row.grossSalary.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right font-medium text-amber-700">- ₹{row.advanceDeduction.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right font-medium text-blue-700">+ ₹{row.marketValueBonus.toLocaleString()}</TableCell>
                  <TableCell className="text-sm font-extrabold text-right pr-4 text-emerald-800">₹{row.netSalary.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isLoading && (
            <div className="flex-1 flex items-center justify-center gap-2 text-gray-500 text-md py-8">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading payroll data...
            </div>
          )}
          {!isLoading && filteredPayroll.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-md py-8">
              No payroll data found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Salary Advance Modal */}
      <Dialog open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen}>
        <DialogContent className="sm:max-w-md border border-gray-400 font-hanken">
          <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black flex items-center gap-2">
              <Banknote className="w-5 h-5" /> Grant Salary Advance
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Select Employee</Label>
              <Select>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choose Employee..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMP-001">EMP-001 - Ramesh Kumar</SelectItem>
                  <SelectItem value="EMP-002">EMP-002 - Suresh Raina</SelectItem>
                  <SelectItem value="EMP-003">EMP-003 - Anita Desai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Advance Amount (₹)</Label>
              <Input type="number" placeholder="e.g. 5000" className="h-9 text-xs" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Repayment Method</Label>
              <Select value={advanceType} onValueChange={setAdvanceType}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Payment (Deduct in next payroll)</SelectItem>
                  <SelectItem value="emi">EMI (Equated Monthly Installment)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {advanceType === 'emi' && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label className="text-xs font-semibold text-gray-700">No. of Months</Label>
                  <Input type="number" placeholder="e.g. 3" className="h-9 text-xs" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label className="text-xs font-semibold text-gray-700">EMI Amount (₹/mo)</Label>
                  <Input type="number" placeholder="Auto-calculated" disabled className="h-9 text-xs bg-gray-50" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-gray-200 bg-white pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAdvanceModalOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs px-4">Grant Advance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Market Value Modal */}
      <Dialog open={isMarketValueModalOpen} onOpenChange={setIsMarketValueModalOpen}>
        <DialogContent className="sm:max-w-md border border-gray-400 font-hanken">
          <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Distribute Market Value
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
              <strong>Info:</strong> Market value is an additional bonus amount shared by the owner to the employees. It is added to their payroll as an earning.
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Total Market Value Pool (₹)</Label>
              <Input type="number" placeholder="e.g. 20000" className="h-9 text-xs font-bold text-lg" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Distribution Method</Label>
              <Select value={allocationType} onValueChange={setAllocationType}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal Split among all active staff</SelectItem>
                  <SelectItem value="percentage">Pro-rata (based on base salary)</SelectItem>
                  <SelectItem value="manual">Manual Allocation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t border-gray-200 bg-white pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsMarketValueModalOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4">Apply & Distribute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
