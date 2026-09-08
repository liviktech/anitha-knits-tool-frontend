import { useState } from 'react';
import { Search, Banknote, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/shared/loader';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';
import { useSalaryAdvances, useDeleteSalaryAdvance, getEmployeeDisplayId, type SalaryAdvanceRecord, type SalaryAdvanceStatus } from './employee-queries';
import { SalaryAdvanceModal } from './salary-advance-modal';

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

interface SalaryAdvanceTableProps {
  onOpenAdvanceModal: () => void;
}

export function SalaryAdvanceTable({ onOpenAdvanceModal }: SalaryAdvanceTableProps) {
  const { data: salaryAdvances = [], isLoading: isAdvancesLoading } = useSalaryAdvances();
  const { mutate: deleteAdvance, isPending: isDeletingAdvance } = useDeleteSalaryAdvance();

  const [advanceSearchQuery, setAdvanceSearchQuery] = useState('');
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<'ALL' | SalaryAdvanceStatus>('ALL');
  const [advancePage, setAdvancePage] = useState(1);
  const [advancePageSize, setAdvancePageSize] = useState(10);

  const [editingAdvance, setEditingAdvance] = useState<SalaryAdvanceRecord | null>(null);
  const [deleteAdvanceTarget, setDeleteAdvanceTarget] = useState<SalaryAdvanceRecord | null>(null);

  const handleDeleteAdvanceConfirm = () => {
    if (!deleteAdvanceTarget) return;
    deleteAdvance(deleteAdvanceTarget.id, {
      onSuccess: () => setDeleteAdvanceTarget(null),
      onError: (err) => alert('Failed to delete salary advance: ' + err.message),
    });
  };

  const filteredAdvances = salaryAdvances.filter((adv) => {
    const q = advanceSearchQuery.toLowerCase();
    const matchesSearch =
      (adv.employeeName || '').toLowerCase().includes(q) ||
      getEmployeeDisplayId(adv).toLowerCase().includes(q);
    const matchesStatus = advanceStatusFilter === 'ALL' || adv.status === advanceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const advanceTotalPages = Math.max(1, Math.ceil(filteredAdvances.length / advancePageSize));
  const advanceCurrentPage = Math.min(advancePage, advanceTotalPages);
  const pagedAdvances = filteredAdvances.slice(
    (advanceCurrentPage - 1) * advancePageSize,
    advanceCurrentPage * advancePageSize,
  );

  return (
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

        <Button size="sm" variant="outline" className="h-8 text-sm font-semibold bg-[#004D40] hover:bg-[#00382e] hover:text-white text-white" onClick={onOpenAdvanceModal}>
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
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-center px-5 py-2 border-r border-gray-300">Status</TableHead>
              <TableHead className="text-sm font-semibold tracking-wide text-gray-800 text-center px-5 py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdvancesLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-28 text-center text-gray-500 text-sm">
                  <div className="flex items-center justify-center gap-2"><Loader size="sm" /> Loading salary advances...</div>
                </TableCell>
              </TableRow>
            ) : pagedAdvances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-28 !text-center text-gray-500 text-sm">No salary advances found matching your criteria.</TableCell>
              </TableRow>
            ) : (
              pagedAdvances.map((adv) => (
                <TableRow key={adv.id} className="border-b border-gray-300 hover:bg-emerald-50/30 transition-colors">
                  <TableCell className="px-5 py-3 text-sm font-bold text-gray-900 border-r border-gray-300">{getEmployeeDisplayId(adv)}</TableCell>
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
                  <TableCell className="px-5 py-3 text-center border-r border-gray-300">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${advanceStatusBadgeClass(adv.status)}`}>
                      {adv.status === 'ACTIVE' ? 'Active' : 'Completed'}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit salary advance"
                        className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                        onClick={() => setEditingAdvance(adv)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete salary advance"
                        className="h-7 w-7 text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteAdvanceTarget(adv)}
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
          {filteredAdvances.length === 0 ? 0 : (advanceCurrentPage - 1) * advancePageSize + 1}-
          {Math.min(advanceCurrentPage * advancePageSize, filteredAdvances.length)} of{" "}
          {filteredAdvances.length} entries
        </span>
        <TablePaginationControls currentPage={advanceCurrentPage} totalPages={advanceTotalPages} onPageChange={setAdvancePage} />
        <RowsPerPageSelect pageSize={advancePageSize} onPageSizeChange={(size) => { setAdvancePageSize(size); setAdvancePage(1); }} />
      </div>

      <SalaryAdvanceModal
        open={!!editingAdvance}
        onOpenChange={(open) => !open && setEditingAdvance(null)}
        advance={editingAdvance}
      />

      <DeleteConfirmDialog
        open={!!deleteAdvanceTarget}
        onOpenChange={(open) => !open && setDeleteAdvanceTarget(null)}
        onConfirm={handleDeleteAdvanceConfirm}
        isPending={isDeletingAdvance}
        title="Delete this salary advance?"
        description={
          deleteAdvanceTarget
            ? `This permanently removes the ₹${deleteAdvanceTarget.amount.toLocaleString()} advance granted to ${deleteAdvanceTarget.employeeName || 'this employee'}.`
            : undefined
        }
      />
    </div>
  );
}
