import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Wallet, Receipt, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

export interface ExpenseRecord {
  id: string;
  date: string;
  expenseName: string;
  category: string;
  amount: number;
  notes?: string;
}

const CATEGORIES = [
  'Utilities',
  'Maintenance',
  'Supplies',
  'Logistics',
  'Raw Materials',
  'Miscellaneous',
] as const;

const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-1',
    date: '2026-08-20',
    expenseName: 'Electricity Bill - Loom Shed',
    category: 'Utilities',
    amount: 18500,
    notes: 'Monthly power consumption for Loom Shed 1 & 2',
  },
  {
    id: 'exp-2',
    date: '2026-08-18',
    expenseName: 'Needle & Spare Parts Replacement',
    category: 'Maintenance',
    amount: 6400,
    notes: 'Purchased from Sri Lakshmi Spares',
  },
  {
    id: 'exp-3',
    date: '2026-08-15',
    expenseName: 'Packaging Material & Straps',
    category: 'Supplies',
    amount: 12300,
    notes: '50 rolls of heavy duty strapping band',
  },
  {
    id: 'exp-4',
    date: '2026-08-12',
    expenseName: 'Yarn Transport Freight',
    category: 'Logistics',
    amount: 4500,
    notes: 'Local truck freight charges from spinning mill',
  },
  {
    id: 'exp-5',
    date: '2026-08-10',
    expenseName: 'Machine Lubricant Oil & Grease',
    category: 'Maintenance',
    amount: 8200,
    notes: '2 Drums high-grade machine oil',
  },
  {
    id: 'exp-6',
    date: '2026-08-05',
    expenseName: 'Staff Refreshments & Allowance',
    category: 'Miscellaneous',
    amount: 2100,
    notes: 'Monthly worker refreshments',
  },
];

function formatCurrency(num: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EmpExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);

  // Form input states
  const [formDate, setFormDate] = useState(todayIso());
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Utilities');
  const [formAmount, setFormAmount] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Summary KPIs
  const totalAmount = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );

  const avgAmount = useMemo(
    () => (expenses.length > 0 ? Math.round(totalAmount / expenses.length) : 0),
    [expenses, totalAmount]
  );

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch =
        exp.expenseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, selectedCategory]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormDate(todayIso());
    setFormName('');
    setFormCategory('Utilities');
    setFormAmount('');
    setFormNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setFormDate(expense.date);
    setFormName(expense.expenseName);
    setFormCategory(expense.category);
    setFormAmount(String(expense.amount));
    setFormNotes(expense.notes ?? '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveExpense = () => {
    if (!formName.trim()) {
      setFormError('Please enter expense name');
      return;
    }
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid expense amount');
      return;
    }

    if (editingExpense) {
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.id === editingExpense.id
            ? {
              ...exp,
              date: formDate,
              expenseName: formName.trim(),
              category: formCategory,
              amount: numAmount,
              notes: formNotes.trim() || undefined,
            }
            : exp
        )
      );
    } else {
      const newExpense: ExpenseRecord = {
        id: `exp-${Date.now()}`,
        date: formDate,
        expenseName: formName.trim(),
        category: formCategory,
        amount: numAmount,
        notes: formNotes.trim() || undefined,
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }

    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setExpenses((prev) => prev.filter((exp) => exp.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto font-['Hanken_Grotesk',sans-serif]">
      {/* Top Stat Summary Cards matching inventory & dashboard themes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Expenses</span>
            <div className="text-2xl font-bold text-[#1F2E27] mt-1">{formatCurrency(totalAmount)}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-[#004D40]">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recorded Entries</span>
            <div className="text-2xl font-bold text-[#1F2E27] mt-1">{expenses.length}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Average / Entry</span>
            <div className="text-2xl font-bold text-[#1F2E27] mt-1">{formatCurrency(avgAmount)}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container matching inventory-page.tsx */}
      <div className="rounded-xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
        {/* Header Bar matching Stock Received / Inventory module style */}
        <div className="border-b border-emerald-100 p-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-emerald-200 bg-emerald-50 text-[#004D40]">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Expense Log</h2>
              <p className="text-xs text-gray-500">Manage factory and employee expenditure details</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search expense..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-44 sm:w-56 pl-8 bg-gray-50/50 border-gray-200 text-xs rounded-lg focus-visible:ring-[#004D40]"
              />
            </div>

            {/* Category Dropdown */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-8 w-36 bg-gray-50/50 border-gray-200 text-xs rounded-lg">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Add Expense Button - matching #004D40 theme */}
            <Button
              size="sm"
              className="h-8 gap-1 rounded-full bg-[#004D40] text-white hover:bg-[#00332a] px-3.5 text-xs font-medium cursor-pointer"
              onClick={openCreateModal}
            >
              <Plus className="h-3.5 w-3.5" /> Add Expense
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-emerald-50/30">
              <TableRow className="hover:bg-transparent border-b border-emerald-100">
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 pl-4 w-[130px]">
                  Date
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500">
                  Expense Name
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 w-[140px]">
                  Category
                </TableHead>
                <TableHead className="text-right text-2xs font-semibold uppercase tracking-wide text-gray-500 pr-6 w-[150px]">
                  Amount
                </TableHead>
                <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-500 w-[110px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-gray-500 text-xs">
                    No expense records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="border-b border-emerald-50 last:border-b-0 hover:bg-emerald-50/30 transition-colors"
                  >
                    <TableCell className="pl-4 text-xs font-medium text-gray-600 whitespace-nowrap">
                      {formatDateDisplay(expense.date)}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-xs font-semibold text-gray-900">{expense.expenseName}</div>
                      {expense.notes && (
                        <div className="text-[11px] text-gray-400 font-normal mt-0.5 truncate max-w-md">
                          {expense.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-[#004D40] border border-emerald-200">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 font-bold text-gray-900 text-xs whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                          aria-label="Edit expense"
                          onClick={() => openEditModal(expense)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                          aria-label="Delete expense"
                          onClick={() => setDeleteTarget(expense)}
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

        {/* Table Footer matching inventory-page */}
        <div className="p-3 border-t border-emerald-100 bg-emerald-50/20 text-xs text-gray-500 flex justify-between items-center px-4">
          <span>Showing {filteredExpenses.length} of {expenses.length} entries</span>
          <span className="font-semibold text-gray-700">
            Filtered Total: {formatCurrency(filteredExpenses.reduce((sum, item) => sum + item.amount, 0))}
          </span>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-date" className="text-xs font-semibold text-gray-700">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-name" className="text-xs font-semibold text-gray-700">Expense Name</Label>
              <Input
                id="exp-name"
                placeholder="e.g. Loom Shed Electricity Bill"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-category" className="text-xs font-semibold text-gray-700">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="exp-category" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-amount" className="text-xs font-semibold text-gray-700">Amount (₹)</Label>
              <Input
                id="exp-amount"
                type="number"
                placeholder="e.g. 5000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-notes" className="text-xs font-semibold text-gray-700">Notes (Optional)</Label>
              <Input
                id="exp-notes"
                placeholder="Additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveExpense} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
              {editingExpense ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Entry?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.expenseName}" (${formatCurrency(deleteTarget.amount)})?`
            : 'This action cannot be undone.'
        }
      />
    </div>
  );
}
