import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Loader } from '@/components/shared/loader';
import { Input } from '@/components/ui/input';
import { useInventoryRecords, inventoryTypeLabels, type InventoryType } from '@/features/inventory/inventory-queries';
import { useOpeningBalanceRawMaterials } from '@/features/admin-panel/opening-balance-queries';
import { formatDateDisplay } from '@/features/inventory/inventory-utils';

const TEAL: [number, number, number] = [0, 77, 64];
const TEAL_TINT: [number, number, number] = [232, 245, 240];

function getMonthName(monthStr: string) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function InventoryReportView() {
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const { data, isLoading, isError, refetch } = useInventoryRecords('?limit=100');
  const { data: obRes } = useOpeningBalanceRawMaterials('?limit=100');
  const obRecords = obRes?.data ?? [];

  const monthRecords = useMemo(
    () => (data?.data ?? []).filter((r) => r.date.startsWith(monthStr)).sort((a, b) => b.date.localeCompare(a.date)),
    [data, monthStr],
  );

  const categoryTotal = (type: InventoryType) => {
    const recordWeight = monthRecords.filter((r) => r.type === type).reduce((sum, r) => sum + r.weightKg, 0);
    const obWeight = obRecords.filter((r) => r.type === type).reduce((sum, r) => sum + r.weightKg, 0);
    return recordWeight + obWeight;
  };

  const hdpeTotal = categoryTotal('HDPE');
  const chemicalTotal = categoryTotal('CHEMICAL');
  const colorTotal = categoryTotal('COLOR');
  const grandTotal = hdpeTotal + chemicalTotal + colorTotal;

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    let isCancelled = false;

    const generatePdf = async () => {
      setIsGenerating(true);

      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEAL);
      doc.text('ANITHA KNITS', 105, 18, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 90, 90);
      doc.text('INVENTORY STOCK REPORT', 105, 26, { align: 'center' });
      doc.text(`Period: ${getMonthName(monthStr)}`, 105, 33, { align: 'center' });

      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.6);
      doc.line(14, 38, 196, 38);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`HDPE: ${hdpeTotal.toFixed(2)} kg`, 14, 46);
      doc.text(`Chemical: ${chemicalTotal.toFixed(2)} kg`, 90, 46);
      doc.text(`Color: ${colorTotal.toFixed(2)} kg`, 160, 46, { align: 'right' });

      autoTable(doc, {
        startY: 52,
        head: [['Date', 'Type', 'Name', 'Bags', 'Weight (kg)', 'DC Number']],
        body: monthRecords.map((r) => [
          formatDateDisplay(r.date),
          inventoryTypeLabels[r.type],
          r.name,
          String(r.bagCount ?? 0),
          r.weightKg.toFixed(2),
          r.DC_NUMBER || '-',
        ]),
        foot: [['', '', '', '', `Total: ${grandTotal.toFixed(2)} kg`, '']],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: TEAL_TINT, textColor: TEAL, fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`,
        105,
        pageHeight - 10,
        { align: 'center' },
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
  }, [monthRecords, isLoading, monthStr, hdpeTotal, chemicalTotal, colorTotal, grandTotal]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 print:hidden">
        <div>
          <h2 className="text-[14px] font-bold text-gray-700 leading-tight uppercase tracking-wide">Inventory Report PDF Preview</h2>
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
                a.download = `Inventory_Report_${monthStr}.pdf`;
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
        ) : isError ? (
          <div className="text-center text-red-500">
            <p>Unable to load report data.</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">Retry</Button>
          </div>
        ) : pdfBlobUrl ? (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full rounded-lg shadow-sm border border-gray-300 bg-white"
            title="Inventory Report PDF Preview"
          />
        ) : (
          <div className="text-gray-500">Could not generate PDF.</div>
        )}
      </div>
    </div>
  );
}
