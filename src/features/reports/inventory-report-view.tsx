import { useState, useEffect, useMemo } from 'react';
import { useInventoryRecords, inventoryTypeLabels, type InventoryType } from '@/features/inventory/inventory-queries';
import { useOpeningBalanceRawMaterials } from '@/features/admin-panel/opening-balance-queries';
import { formatDateDisplay } from '@/features/inventory/inventory-utils';
import { ReportLayout } from './report-layout';
import { useReportPeriod } from './report-period';

const TEAL: [number, number, number] = [0, 77, 64];
const TEAL_TINT: [number, number, number] = [232, 245, 240];

interface InventoryReportViewProps {
  allReports?: { id: string; label: string; moduleId: string }[];
  selectedReport?: string;
  onReportChange?: (tabId: string, moduleId: string) => void;
}

export function InventoryReportView({ allReports, selectedReport, onReportChange }: InventoryReportViewProps) {
  const period = useReportPeriod();

  const { data, isLoading } = useInventoryRecords('?limit=100');
  const { data: obRes } = useOpeningBalanceRawMaterials('?limit=100');
  const obRecords = obRes?.data ?? [];

  const monthRecords = useMemo(
    () => {
      if (!data?.data) return [];
      return data.data
        .filter((r) => {
          const d = r.date.slice(0, 10);
          return d >= period.effectiveFrom && d <= period.effectiveTo;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    [data, period.effectiveFrom, period.effectiveTo],
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
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);

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
      doc.text(`Period: ${period.label}`, 105, 33, { align: 'center' });

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
        didParseCell: (data) => {
          if (data.section === 'head' && (data.column.index === 3 || data.column.index === 4)) {
            data.cell.styles.halign = 'right';
          }
        },
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
  }, [monthRecords, isLoading, period.label, hdpeTotal, chemicalTotal, colorTotal, grandTotal]);

  const handleDownloadXlsx = async () => {
    if (isLoading) return;
    setIsGeneratingXlsx(true);
    try {
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();
      const wsData: any[][] = [];

      wsData.push(['INVENTORY STOCK REPORT']);
      wsData.push([`Period: ${period.label}`]);
      wsData.push([]);
      
      wsData.push([`HDPE: ${hdpeTotal.toFixed(2)} kg`, `Chemical: ${chemicalTotal.toFixed(2)} kg`, `Color: ${colorTotal.toFixed(2)} kg`]);
      wsData.push([]);

      wsData.push(['Date', 'Type', 'Name', 'Bags', 'Weight (kg)', 'DC Number']);
      monthRecords.forEach((r) => {
        wsData.push([
          formatDateDisplay(r.date),
          inventoryTypeLabels[r.type],
          r.name,
          r.bagCount ?? 0,
          r.weightKg.toFixed(2),
          r.DC_NUMBER || '-',
        ]);
      });
      wsData.push(['', '', '', '', `Total: ${grandTotal.toFixed(2)} kg`, '']);

      const ws = utils.aoa_to_sheet(wsData);
      utils.book_append_sheet(wb, ws, 'Inventory');

      writeFile(wb, `Anitha_Knits_Inventory_Report_${period.fileSuffix}.xlsx`);
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
      a.download = `Anitha_Knits_Inventory_Report_${period.fileSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <ReportLayout
      displayTitle="Inventory"
      allReports={allReports}
      selectedReport={selectedReport}
      onReportChange={onReportChange}
      period={period}
      showPeriodPicker={true}
      pdfBlobUrl={pdfBlobUrl}
      isGenerating={isGenerating}
      isGeneratingXlsx={isGeneratingXlsx}
      isLoading={isLoading}
      onDownloadXlsx={handleDownloadXlsx}
      onDownload={handleDownload}
    />
  );
}
