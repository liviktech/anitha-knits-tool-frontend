import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Wallet,
  Receipt,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const PAGE_SIZE = 10;

function getPageNumbers(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

export function EmpExpensesPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr());
  const [page, setPage] = useState(1);

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
  const filteredQuery = `?date_from=${from}&date_to=${to}&limit=100${
    searchQuery.trim() ? `&name=${encodeURIComponent(searchQuery.trim())}` : ""
  }`;
  const {
    data: filteredData,
    isLoading,
    isError,
    refetch,
  } = useExpenses(filteredQuery);
  const filteredExpenses = filteredData?.data ?? [];
  const totalFiltered = filteredExpenses.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedExpenses = filteredExpenses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormDate(todayIso());
    setFormName("");
    setFormAmount("");
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setFormDate(expense.date.slice(0, 10));
    setFormName(expense.expenseName);
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
      className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1"
    >
      <style>{`
        #emp-expenses-layout, #emp-expenses-layout * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
        #emp-expenses-layout .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
      `}</style>

      {/* Unified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-[20px] font-bold text-black leading-tight px-2">
            Expenses Summary
          </h1>
          <p className="text-[12.5px] text-gray-500 font-medium px-2">
            Track factory expenses and outgoings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              if (e.target.value) setSelectedMonth(e.target.value);
            }}
            className="h-9 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-sm font-semibold text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        <div className="flex flex-col gap-2 p-2">
          {/* Top Stat Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <div className="relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />

              {/* Content */}
              <div className="pr-14">
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] font-bold text-gray-900">
                    Total Expenses
                  </span>
                </div>

                <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Total Value
                </div>

                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              {/* Icon on the right */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-md border border-cyan-200 text-cyan-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>

            <div className="relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-orange-500" />
              <div className="pr-14">
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] font-bold text-orange-600">
                    Recorded Entries
                  </span>
                </div>

                <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Entries Count
                </div>

                <div className="text-xl font-bold text-gray-900">
                  {monthEntryCount}
                </div>
              </div>

              {/* Square icon on the right */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-md border border-orange-200 text-orange-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>

            <div className="relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-rose-800" />
              <div className="pr-14">
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] font-bold text-emerald-700">
                    Average / Entry
                  </span>
                </div>

                <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Avg Amount
                </div>

                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(avgAmount)}
                </div>
              </div>

              {/* Square icon on the right */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-md border border-emerald-200 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden">
            {/* Header Bar */}
            <div className="border-b border-gray-300 p-3 bg-white flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-[#004D40]">
                  <Wallet className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-[17px] font-bold text-[#004D40] text-gray-900">
                  Expense Log
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-44 sm:w-56 pl-8 bg-gray-50/50 border-gray-300 text-xs rounded-lg focus-visible:ring-[#004D40]"
                  />
                </div>

                {/* Add Expense Button - matching #004D40 theme */}
                <Button
                  size="sm"
                  className="h-8 gap-1 rounded-md bg-[#004D40] text-white hover:bg-[#00332a] px-3.5 text-xs font-medium cursor-pointer"
                  onClick={openCreateModal}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Expense
                </Button>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-gray-300 bg-gray-50/60">
                    <TableHead className="text-[12px] font-extrabold uppercase tracking-wider text-gray-800 pl-4 w-[100px] h-8 border-r border-gray-300">
                      Expense ID
                    </TableHead>

                    <TableHead className="text-[12px] font-extrabold uppercase tracking-wider text-gray-800 w-[130px] h-8 border-r border-gray-300">
                      Date
                    </TableHead>

                    <TableHead className="text-[12px] font-extrabold uppercase tracking-wider text-gray-800 h-8 border-r border-gray-300">
                      Expense Name
                    </TableHead>

                    <TableHead className="text-right text-[12px] font-extrabold uppercase tracking-wider text-gray-800 pr-6 w-[150px] h-8 border-r border-gray-300">
                      Amount
                    </TableHead>

                    <TableHead className="!text-center bg-gray-50 text-[12px] font-extrabold uppercase tracking-wider text-gray-500 w-[110px] h-8">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-gray-500 text-xs"
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
                        className="h-28 text-center text-xs"
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
                        className="h-28 !text-center text-gray-500 text-xs"
                      >
                        No expense records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedExpenses.map((expense) => (
                      <TableRow
                        key={expense.id}
                        className="border-b border-gray-300 last:border-b-0 hover:bg-gray-50/60 transition-colors"
                      >
                        <TableCell className="pl-4 py-2.5 text-xs font-bold text-gray-700 whitespace-nowrap border-r border-gray-200">
                          {expense.expenseId}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs font-medium text-gray-600 whitespace-nowrap border-r border-gray-200">
                          {formatDateDisplay(expense.date)}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs font-semibold text-gray-900 border-r border-gray-200">
                          {expense.expenseName}
                        </TableCell>
                        <TableCell className="py-2.5 text-right pr-6 font-bold text-gray-900 text-xs whitespace-nowrap border-r border-gray-200">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="py-2.5 !text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                              aria-label="Edit expense"
                              onClick={() => openEditModal(expense)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
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
            <div className="p-2.5 border-t border-gray-300 text-xs text-gray-500 flex flex-wrap justify-between items-center gap-3 px-4">
              <span>
                Showing{" "}
                {totalFiltered === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, totalFiltered)} of{" "}
                {totalFiltered} entries
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {getPageNumbers(currentPage, totalPages).map((p, i) =>
                    p === "ellipsis" ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="px-1.5 text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant="ghost"
                        size="icon"
                        className={
                          p === currentPage
                            ? "h-7 w-7 rounded-md bg-[#004D40] text-white text-xs font-semibold hover:bg-[#00332a]"
                            : "h-7 w-7 rounded-md text-xs text-gray-600 hover:bg-gray-100"
                        }
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ),
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <span className="font-semibold text-gray-700">
                Filtered Total:{" "}
                {formatCurrency(
                  filteredExpenses.reduce((sum, item) => sum + item.amount, 0),
                )}
              </span>
            </div>
          </div>

          {/* Add / Edit Dialog */}
          <Dialog
            open={isFormOpen}
            onOpenChange={(next) => !isSaving && setIsFormOpen(next)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-gray-900">
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
                  <Input
                    id="exp-name"
                    placeholder="e.g. Loom Shed Electricity Bill"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-9 text-xs"
                  />
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

              <DialogFooter>
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
                  {editingExpense ? "Save Changes" : "Add Expense"}
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
