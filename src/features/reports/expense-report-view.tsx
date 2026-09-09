import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { ReportLayout } from "./report-layout";

const TEAL: [number, number, number] = [0, 77, 64];
const TEAL_TINT: [number, number, number] = [232, 245, 240];

function formatCurrency(num: number) {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(num);
  return `Rs. ${formatted}`;
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

interface ExpenseReportViewProps {
  allReports?: { id: string; label: string; moduleId: string }[];
  selectedReport?: string;
  onReportChange?: (tabId: string, moduleId: string) => void;
}

export function ExpenseReportView({ allReports, selectedReport, onReportChange }: ExpenseReportViewProps) {
  const [fromMonthStr, setFromMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [toMonthStr, setToMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);
  const totalAmount = reportData.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    if (fromMonthStr && toMonthStr) {
      fetchReportData();
    }
  }, [fromMonthStr, toMonthStr]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const from = `${fromMonthStr}-01`;
      const [yearStr, monthStrPart] = toMonthStr.split('-');
      const to = `${toMonthStr}-${new Date(parseInt(yearStr), parseInt(monthStrPart), 0).getDate()}`;
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
      let y = 18;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEAL);
      doc.text("ANITHA KNITS", 105, y, { align: "center" });
      y += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      doc.text('EXPENSES SUMMARY REPORT', 105, y, { align: 'center' });
      y += 7;
      const periodText = fromMonthStr === toMonthStr ? getMonthName(fromMonthStr) : `${getMonthName(fromMonthStr)} - ${getMonthName(toMonthStr)}`;
      doc.text(`Period: ${periodText}`, 105, y, { align: 'center' });
      y += 5;
      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.6);
      doc.line(14, y, 196, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total Expenses: ${formatCurrency(totalAmount)}`, 14, y);
      doc.text(`Total Entries: ${reportData.length}`, 196, y, { align: "right" });

      autoTable(doc, {
        startY: y + 6,
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
        didParseCell: (data) => {
          if (data.section === "head" && data.column.index === 3) {
            data.cell.styles.halign = "right";
          }
        },
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
  }, [reportData, isLoading, fromMonthStr, toMonthStr, totalAmount]);

  const handleDownloadXlsx = async () => {
    if (isLoading) return;
    setIsGeneratingXlsx(true);
    try {
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();
      const wsData: any[][] = [];

      wsData.push(['EXPENSES SUMMARY REPORT']);
      const periodText = fromMonthStr === toMonthStr ? getMonthName(fromMonthStr) : `${getMonthName(fromMonthStr)} - ${getMonthName(toMonthStr)}`;
      wsData.push([`Period: ${periodText}`]);
      wsData.push([]);
      
      wsData.push([`Total Expenses: ${formatCurrency(totalAmount)}`, '', '', `Total Entries: ${reportData.length}`]);
      wsData.push([]);

      wsData.push(['Date', 'ID', 'Expense Name', 'Amount']);
      reportData.forEach((item) => {
        wsData.push([
          formatDateDisplay(item.date),
          item.expenseId,
          item.expenseName,
          item.amount,
        ]);
      });
      wsData.push(['', '', 'Total:', totalAmount]);

      const ws = utils.aoa_to_sheet(wsData);
      utils.book_append_sheet(wb, ws, 'Expenses');

      const period = fromMonthStr === toMonthStr ? fromMonthStr : `${fromMonthStr}_to_${toMonthStr}`;
      writeFile(wb, `Anitha_Knits_Expenses_Report_${period}.xlsx`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingXlsx(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      const period = fromMonthStr === toMonthStr ? fromMonthStr : `${fromMonthStr}_to_${toMonthStr}`;
      a.download = `Anitha_Knits_Expenses_Report_${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <ReportLayout
      displayTitle="Expense"
      allReports={allReports}
      selectedReport={selectedReport}
      onReportChange={onReportChange}
      fromMonthStr={fromMonthStr}
      toMonthStr={toMonthStr}
      onFromMonthChange={setFromMonthStr}
      onToMonthChange={setToMonthStr}
      showMonthPicker={true}
      pdfBlobUrl={pdfBlobUrl}
      isGenerating={isGenerating}
      isGeneratingXlsx={isGeneratingXlsx}
      isLoading={isLoading}
      onDownloadXlsx={handleDownloadXlsx}
      onDownload={handleDownload}
    />
  );
}
