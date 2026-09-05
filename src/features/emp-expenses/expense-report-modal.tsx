import { useState, useEffect } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileDown, X } from "lucide-react";
import { Loader } from "@/components/shared/loader";
import { apiFetch } from "@/lib/api-client";

const TEAL: [number, number, number] = [0, 77, 64]; // #004D40 — this app's primary accent
const TEAL_TINT: [number, number, number] = [232, 245, 240]; // light teal for footer/total rows

interface ExpenseReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthStr: string; // YYYY-MM
}

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

function getMonthName(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function monthRange(monthStr: string): { from: string; to: string } {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${monthStr}-01`,
    to: `${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function ExpenseReportModal({ open, onOpenChange, monthStr }: ExpenseReportModalProps) {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalAmount = reportData.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    if (open) {
      fetchReportData();
    } else {
      setReportData([]);
      setError(null);
    }
  }, [open, monthStr]);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { from, to } = monthRange(monthStr);
      let allData: any[] = [];
      let page = 1;
      let totalPages = 1;
      
      do {
        const response = await apiFetch(`/expenses?date_from=${from}&date_to=${to}&limit=100&page=${page}`);
        if (!response.ok) {
          throw new Error("Failed to fetch expenses");
        }
        
        const { data, meta } = await response.json();
        allData = [...allData, ...(data || [])];
        
        totalPages = meta?.totalPages || 1;
        page++;
      } while (page <= totalPages);
      
      // Sort by date ascending
      allData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setReportData(allData);
    } catch (err: any) {
      console.error(err);
      setError("Unable to load report data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (reportData.length === 0) return;
    
    const headers = ["Expense ID", "Date", "Expense Name", "Amount (INR)"];
    const csvRows = [headers.join(",")];
    
    for (const row of reportData) {
      csvRows.push([
        row.expenseId,
        row.date ? row.date.slice(0, 10) : "",
        `"${(row.expenseName || "").replace(/"/g, '""')}"`,
        row.amount
      ].join(","));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expenses_Report_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (reportData.length === 0) return;

    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEAL);
    doc.text("ANITHA KNITS", 105, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text("EXPENSE REPORT", 105, 26, { align: "center" });
    doc.text(`Period: ${getMonthName(monthStr)}`, 105, 33, { align: "center" });

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Expenses: ${formatCurrency(totalAmount)}`, 14, 46);
    doc.text(`Total Entries: ${reportData.length}`, 196, 46, { align: "right" });

    autoTable(doc, {
      startY: 52,
      head: [["Date", "ID", "Expense Name", "Amount"]],
      body: reportData.map((item) => [
        formatDateDisplay(item.date),
        item.expenseId,
        item.expenseName,
        formatCurrency(item.amount),
      ]),
      foot: [["", "", "Total:", formatCurrency(totalAmount)]],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: TEAL_TINT, textColor: TEAL, fontStyle: "bold" },
      columnStyles: { 3: { halign: "right" } },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN")}`,
      105,
      pageHeight - 10,
      { align: "center" },
    );

    doc.save(`Expenses_Report_${monthStr}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-4xl sm:max-w-4xl max-h-[85vh] flex flex-col p-0 border border-gray-300 overflow-hidden bg-white print:max-w-none print:h-auto print:border-none">
        {/* Modal Header (Not printed) */}
        {/* Close button rendered in-flow here (not DialogContent's default absolutely-positioned
            one) so it shares the same flex row as Download CSV/PDF and always lines up with them. */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-[#A8DCAB] shrink-0 print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black">
              Expense Report Overview
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isLoading || reportData.length === 0} className="gap-2 bg-white border-[#004D40] text-[#004D40] hover:bg-[#004D40]/10">
                <FileDown className="w-4 h-4" /> Download PDF
              </Button>
              <Button size="sm" onClick={handleDownloadCSV} disabled={isLoading || reportData.length === 0} className="gap-2 bg-[#004D40] hover:bg-[#00382e] text-white">
                <Download className="w-4 h-4" /> Download CSV
              </Button>
              <DialogClose asChild>
                <Button size="icon-sm" className="bg-red-700 text-white hover:bg-red-400 focus-visible:ring-red-400">
                  <X className="w-4 h-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Report Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white" id="report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                Expense Report
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Period: {getMonthName(monthStr)}
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader size="lg" className="mb-4" />
                <p>Generating report...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-500">
                <p>{error}</p>
                <Button variant="outline" onClick={fetchReportData} className="mt-4">Retry</Button>
              </div>
            ) : (
              <>
                {/* Summary Section */}
                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
                  <div>
                    <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Total Expenses</p>
                    <p className="text-3xl font-bold text-[#004D40]">{formatCurrency(totalAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Total Entries</p>
                    <p className="text-xl font-bold text-[#004D40]">{reportData.length}</p>
                  </div>
                </div>

                {/* Data Table */}
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#004D40]">
                        <th className="py-3 px-4 font-bold text-white w-24">Date</th>
                        <th className="py-3 px-4 font-bold text-white w-32">ID</th>
                        <th className="py-3 px-4 font-bold text-white">Expense Name</th>
                        <th className="py-3 px-4 font-bold text-white text-right w-40">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-500">
                            No expenses recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        reportData.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-emerald-50/40"}>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                              {formatDateDisplay(item.date)}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-medium text-gray-600">
                              {item.expenseId}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">
                              {item.expenseName}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-bold text-gray-900 text-right">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {reportData.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-[#004D40] bg-emerald-50">
                          <td colSpan={3} className="py-4 px-4 font-bold text-[#004D40] text-right">
                            Total:
                          </td>
                          <td className="py-4 px-4 font-bold text-[#004D40] text-right text-lg">
                            {formatCurrency(totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                
                {/* Footer Footer */}
                <div className="text-center text-xs text-gray-400 mt-4 pt-3 border-t border-gray-200 print:mt-auto">
                  Generated on {new Date().toLocaleDateString("en-IN")} at {new Date().toLocaleTimeString("en-IN")}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
