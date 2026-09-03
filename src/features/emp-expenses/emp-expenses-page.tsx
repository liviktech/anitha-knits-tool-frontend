import { useState, useEffect } from "react";
import "@fontsource-variable/hanken-grotesk";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { Loader } from "@/components/shared/loader";
import { TablePaginationControls, RowsPerPageSelect } from "@/components/shared/table-pagination-controls";
import { apiFetch, extractApiErrorMessage } from "@/lib/api-client";
import {
  expenseKeys,
  useExpenses,
  type ExpenseRecord,
} from "./expense-queries";

function formatCurrency(num: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return "-";
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  if (!year || !month || !day) return isoDate;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

/** First/last calendar day of a "YYYY-MM" string, as "YYYY-MM-DD". */
function monthRange(monthStr: string): { from: string; to: string } {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${monthStr}-01`,
    to: `${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

const EXPENSE_NAME_SUGGESTIONS = [
  "Electricity Charges",
  "Water Charges",
  "Machine Maintenance",
  "Transportation",
  "Office Supplies",
];

export function EmpExpensesPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form input states
  const [formDate, setFormDate] = useState(todayIso());
  const [formName, setFormName] = useState("");
  const [expenseNameOption, setExpenseNameOption] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Reset to page 1 whenever the underlying filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedMonth]);

  const { from, to } = monthRange(selectedMonth);

  // Whole month, unaffected by the search box — backs the KPI cards. Capped
  // at 100 (the API's max page size); accurate as long as a company records
  // under 100 expenses in a single month.
  const summaryQuery = `?date_from=${from}&date_to=${to}&limit=100`;
  const { data: summaryData } = useExpenses(summaryQuery);
  const monthExpenses = summaryData?.data ?? [];
  const monthEntryCount = summaryData?.meta.total ?? 0;
  const totalAmount = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const avgAmount =
    monthEntryCount > 0 ? Math.round(totalAmount / monthEntryCount) : 0;

  // Month + search, server-filtered (same 100-row cap) — backs the table.
  // Paginated client-side over this bounded set so the footer's "Filtered
  // Total" can sum every matching row, not just the visible page.
  const filteredQuery = `?date_from=${from}&date_to=${to}&limit=100${searchQuery.trim() ? `&name=${encodeURIComponent(searchQuery.trim())}` : ""
    }`;
  const {
    data: filteredData,
    isLoading,
    isError,
    refetch,
  } = useExpenses(filteredQuery);
  const filteredExpenses = filteredData?.data ?? [];
  const totalFiltered = filteredExpenses.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedExpenses = filteredExpenses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormDate(todayIso());
    setFormName("");
    setExpenseNameOption("");
    setFormAmount("");
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setFormDate(expense.date.slice(0, 10));
    setFormName(expense.expenseName);
    setExpenseNameOption(
      EXPENSE_NAME_SUGGESTIONS.includes(expense.expenseName) ? expense.expenseName : "OTHER",
    );
    setFormAmount(String(expense.amount));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!formName.trim()) {
      setFormError("Please enter expense name");
      return;
    }
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid expense amount");
      return;
    }
    if (formDate > todayIso()) {
      setFormError("Date cannot be in the future");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        date: formDate,
        expenseName: formName.trim(),
        amount: numAmount,
      };
      const response = editingExpense
        ? await apiFetch(`/expenses/${editingExpense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        : await apiFetch("/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

      if (!response.ok) {
        setFormError(
          await extractApiErrorMessage(response, "Could not save expense."),
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      setIsFormOpen(false);
    } catch {
      setFormError("Could not save expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/expenses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="emp-expenses-layout"
      className="flex flex-col h-full bg-[#004D40]/5 flex-1 min-h-0"
    >
      <style>{`
        #emp-expenses-layout, #emp-expenses-layout * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
      `}</style>

      {/* Unified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div>
          <h1 className="text-[20px] font-bold text-black leading-tight px-2">
            Expenses Summary
          </h1>
          <p className="text-[12.5px] text-gray-500 font-medium px-2">
            Track factory expenses and outgoings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            max={currentMonthStr()}
            onChange={(e) => {
              if (e.target.value) setSelectedMonth(e.target.value);
            }}
            className="h-9 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-sm font-semibold text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
          />
          <Button
            className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)]"
            onClick={openCreateModal}
          >
            <Plus className="w-3 h-3" />
            ADD EXPENSE
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative flex flex-col min-h-0">
        <div className="flex flex-col gap-2 p-2 flex-1 min-h-0">
          {/* Top Stat Summary Cards — styled like the Employee tab's summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
            {/* Total Expenses Card */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-emerald-300 transition-colors flex flex-col h-full justify-center">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <img src="/wallet.png" alt="" className="w-20 h-20 object-contain" />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                  <div><img src="/wallet.png" alt="Total Expenses" className="w-14 h-14 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">Total Expenses</h3>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-none">{formatCurrency(totalAmount)}</div>
              </div>
            </div>

            {/* Recorded Entries Card */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-300 transition-colors flex flex-col h-full justify-center">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <img src="/record.png" alt="" className="w-18 h-18 object-contain" />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                  <div><img src="/record.png" alt="Recorded Entries" className="w-12 h-12 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">Recorded Entries</h3>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-none">{monthEntryCount}</div>
              </div>
            </div>

            {/* Average / Entry Card */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-purple-300 transition-colors flex flex-col h-full justify-center">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <img src="/entry.png" alt="" className="w-18 h-18 object-contain" />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                  <div><img src="/entry.png" alt="Average per Entry" className="w-12 h-12 object-contain" /></div>
                  <h3 className="font-extrabold text-gray-800 text-lg">Average / Entry</h3>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-none">{formatCurrency(avgAmount)}</div>
              </div>
            </div>
          </div>

          {/* Main Table Container — styled like the Employee tab's table */}
          <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            {/* Header Bar */}
            <div className="shrink-0 border-b border-emerald-400 p-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"></div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-44 sm:w-60 pl-8 bg-gray-50/50 border-gray-400 text-xs rounded-lg focus-visible:ring-[#004D40]"
                  />
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <Table>
                <TableHeader className="bg-emerald-50/30 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-b border-gray-300">
                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 pl-4 w-[100px] border-r border-gray-300">
                      Expense ID
                    </TableHead>

                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 w-[130px] border-r border-gray-300">
                      Date
                    </TableHead>

                    <TableHead className="text-sm font-semibold tracking-wide text-gray-800 border-r border-gray-300">
                      Expense Name
                    </TableHead>

                    <TableHead className="text-right text-sm font-semibold tracking-wide text-gray-800 pr-6 w-[150px] border-r border-gray-300">
                      Amount
                    </TableHead>

                    <TableHead className="text-center text-sm font-semibold tracking-wide text-gray-800 pr-4 w-[110px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-gray-500 text-sm"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader size="sm" /> Loading expenses...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-sm"
                      >
                        <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                          <span>
                            Unable to load expenses. Please try again.
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => refetch()}
                          >
                            Retry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : pagedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 !text-center text-gray-500 text-sm"
                      >
                        No expense records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedExpenses.map((expense) => (
                      <TableRow
                        key={expense.id}
                        className="border-b border-gray-300 hover:bg-emerald-50/30 transition-colors"
                      >
                        <TableCell className="pl-4 text-sm font-bold text-gray-700 whitespace-nowrap border-r border-gray-300">
                          {expense.expenseId}
                        </TableCell>
                        <TableCell className="text-[13px] text-gray-600 whitespace-nowrap border-r border-gray-300">
                          {formatDateDisplay(expense.date)}
                        </TableCell>
                        <TableCell className="py-3 text-sm font-semibold text-gray-900 whitespace-nowrap border-r border-gray-300">
                          {expense.expenseName}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-bold text-gray-600 text-sm whitespace-nowrap border-r border-gray-300">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="text-center pr-4">
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

            {/* Table Footer */}
            <div className="shrink-0 p-3 border-t border-gray-400 bg-emerald-50/20 text-xs text-gray-700 flex flex-wrap justify-between items-center gap-3 px-4">
              <span>
                Showing{" "}
                {totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, totalFiltered)} of{" "}
                {totalFiltered} entries
              </span>

              <TablePaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />

              <RowsPerPageSelect pageSize={pageSize} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
            </div>
          </div>

          {/* Add / Edit Dialog */}
          <Dialog
            open={isFormOpen}
            onOpenChange={(next) => !isSaving && setIsFormOpen(next)}
          >
            <DialogContent className="sm:max-w-md border border-gray-400">
              <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
                <DialogTitle className="text-lg font-bold text-black">
                  {editingExpense ? "Edit Expense" : "Add Expense"}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="exp-date"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Date
                  </Label>
                  <Input
                    id="exp-date"
                    type="date"
                    value={formDate}
                    max={todayIso()}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="exp-name"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Expense Name
                  </Label>
                  <Select
                    value={expenseNameOption || undefined}
                    onValueChange={(val) => {
                      setExpenseNameOption(val);
                      setFormName(val === "OTHER" ? "" : val);
                    }}
                  >
                    <SelectTrigger id="exp-name" className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select expense name" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_NAME_SUGGESTIONS.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {expenseNameOption === "OTHER" && (
                    <Input
                      id="exp-name-custom"
                      placeholder="Enter custom expense name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="h-9 text-xs mt-1.5"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="exp-amount"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Amount (₹)
                  </Label>
                  <Input
                    id="exp-amount"
                    type="number"
                    placeholder="e.g. 5000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-600 font-medium">
                    {formError}
                  </p>
                )}
              </div>

              <DialogFooter className="border-gray-200 bg-white">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveExpense}
                  disabled={isSaving}
                  className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4"
                >
                  {isSaving && <Loader size="sm" className="mr-1.5" />}
                  {editingExpense ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <DeleteConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) =>
              !open && !isDeleting && setDeleteTarget(null)
            }
            onConfirm={handleDeleteConfirm}
            isPending={isDeleting}
            title="Delete Expense Entry?"
            description={
              deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.expenseName}" (${formatCurrency(deleteTarget.amount)})?`
                : "This action cannot be undone."
            }
          />
        </div>
      </div>
    </div>
  );
}
