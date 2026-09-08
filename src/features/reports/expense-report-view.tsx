import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Loader } from "@/components/shared/loader";
import { apiFetch } from "@/lib/api-client";
import { Input } from "@/components/ui/input";

const TEAL: [number, number, number] = [0, 77, 64];
const TEAL_TINT: [number, number, number] = [232, 245, 240];

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
  if (!monthStr) return "";
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

export function ExpenseReportView() {
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const totalAmount = reportData.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    if (monthStr) {
      fetchReportData();
    }
  }, [monthStr]);

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
        if (!response.ok) throw new Error("Failed to fetch expenses");

        const { data, meta } = await response.json();
        allData = [...allData, ...(data || [])];

        totalPages = meta?.totalPages || 1;
        page++;
      } while (page <= totalPages);

      allData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setReportData(allData);
    } catch (err: any) {
      console.error(err);
      setError("Unable to load report data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    let isCancelled = false;

    const generatePdf = async () => {
      setIsGenerating(true);

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

      if (!isCancelled) {
        setPdfBlobUrl(doc.output('bloburi').toString());
        setIsGenerating(false);
      }
    };

    generatePdf();

    return () => {
      isCancelled = true;
    };
  }, [reportData, isLoading, monthStr, totalAmount]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 print:hidden">
        <div>
          <h2 className="text-[14px] font-bold text-gray-700 leading-tight uppercase tracking-wide">Expense Report PDF Preview</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="month"
            value={monthStr}
            max={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
            onChange={(e) => setMonthStr(e.target.value)}
            className="h-8 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-sm font-semibold text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
          />
          <Button
            onClick={() => {
              if (pdfBlobUrl) {
                const a = document.createElement('a');
                a.href = pdfBlobUrl;
                a.download = `Expenses_Report_${monthStr}.pdf`;
                a.click();
              }
            }}
            disabled={!pdfBlobUrl || isGenerating}
            className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-8 text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)]"
          >
            <Download className="w-3.5 h-3.5" /> DOWNLOAD PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
        {isLoading || isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader size="lg" className="mb-4 text-[#004D40]" />
            <p>Generating PDF Preview...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">
            <p>{error}</p>
            <Button variant="outline" onClick={fetchReportData} className="mt-4">Retry</Button>
          </div>
        ) : pdfBlobUrl ? (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full rounded-lg shadow-sm border border-gray-300 bg-white"
            title="Expense Report PDF Preview"
          />
        ) : (
          <div className="text-gray-500">Could not generate PDF.</div>
        )}
      </div>
    </div>
  );
}
