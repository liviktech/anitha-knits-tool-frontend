import { useEffect, useState } from 'react';
import { useProductionPdfData, type DeliveryVariantRow } from './production-pdf-data';
import { ReportLayout } from './report-layout';
import type {
  ExtruderProductionVariantChemicalSummary,
  FabricProductionVariantChemicalSummary,
  LoomsProductionVariantChemicalSummary,
} from '@/features/dashboard/dashboard-queries';

const TEAL: [number, number, number] = [0, 77, 64];
const TEAL_TINT: [number, number, number] = [232, 245, 240];

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMonthName(monthStr: string) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

interface ReportRow {
  labels: string[];
  values: number[];
}

interface ReportSection {
  title: string;
  headers: string[]; // label headers followed by numeric headers
  labelColCount: number;
  rows: ReportRow[];
  totals: number[]; // one per numeric column
}

function variantSort<T extends { size: { name: string }; color: { name: string }; chemical: { name: string } }>(a: T, b: T): number {
  return a.size.name.localeCompare(b.size.name) || a.color.name.localeCompare(b.color.name) || a.chemical.name.localeCompare(b.chemical.name);
}

function columnTotals(rows: { values: number[] }[], columnCount: number): number[] {
  const totals = new Array(columnCount).fill(0);
  for (const row of rows) {
    row.values.forEach((v, i) => {
      totals[i] += v;
    });
  }
  return totals;
}

function buildExtruderSection(items: ExtruderProductionVariantChemicalSummary[]): ReportSection {
  const rows: ReportRow[] = [...items].sort(variantSort).map((r) => ({
    labels: [r.size.name, r.color.name, r.chemical.name],
    values: [r.production, r.lumsKg, r.yarnWasteKg, r.total],
  }));
  return {
    title: 'Extruder Production',
    headers: ['Size', 'Color', 'Chemical', 'Production (kg)', 'Lums (kg)', 'Yarn Waste (kg)', 'Total (kg)'],
    labelColCount: 3,
    rows,
    totals: columnTotals(rows, 4),
  };
}

function buildLoomsSection(items: LoomsProductionVariantChemicalSummary[]): ReportSection {
  const rows: ReportRow[] = [...items].sort(variantSort).map((r) => ({
    labels: [r.size.name, r.color.name, r.chemical.name],
    values: [r.production, r.waste, r.total],
  }));
  return {
    title: 'Looms Production',
    headers: ['Size', 'Color', 'Chemical', 'Production (kg)', 'Waste (kg)', 'Total (kg)'],
    labelColCount: 3,
    rows,
    totals: columnTotals(rows, 3),
  };
}

function buildFabricSection(items: FabricProductionVariantChemicalSummary[]): ReportSection {
  const rows: ReportRow[] = [...items].sort(variantSort).map((r) => ({
    labels: [r.size.name, r.color.name, r.chemical.name],
    values: [r.outputKg, r.fwWasteKg, r.bwWasteKg, r.total],
  }));
  return {
    title: 'Fabric Checking',
    headers: ['Size', 'Color', 'Chemical', 'Output (kg)', 'FW Waste (kg)', 'BW Waste (kg)', 'Total (kg)'],
    labelColCount: 3,
    rows,
    totals: columnTotals(rows, 4),
  };
}

function buildFabricDeliveredSection(items: DeliveryVariantRow[]): ReportSection {
  const rows: ReportRow[] = [...items].sort(variantSort).map((r) => ({
    labels: [r.size.name, r.color.name, r.chemical.name],
    values: [r.delivered],
  }));
  return {
    title: 'Fabric Delivered',
    headers: ['Size', 'Color', 'Chemical', 'Delivered (kg)'],
    labelColCount: 3,
    rows,
    totals: columnTotals(rows, 1),
  };
}

function buildSections(data: {
  extruderByVariantChemical: ExtruderProductionVariantChemicalSummary[];
  loomsByVariantChemical: LoomsProductionVariantChemicalSummary[];
  fabricByVariantChemical: FabricProductionVariantChemicalSummary[];
  deliveryByVariantChemical: DeliveryVariantRow[];
}): ReportSection[] {
  return [
    buildExtruderSection(data.extruderByVariantChemical),
    buildLoomsSection(data.loomsByVariantChemical),
    buildFabricSection(data.fabricByVariantChemical),
    buildFabricDeliveredSection(data.deliveryByVariantChemical),
  ].filter((s) => s.rows.length > 0);
}

interface ProductionPdfViewProps {
  tab: string; // 'day_wise_report' | 'sample_production_report'
  allReports?: { id: string; label: string; moduleId: string }[];
  selectedReport?: string;
  onReportChange?: (tabId: string, moduleId: string) => void;
}

export function ProductionPdfView({ tab, allReports, selectedReport, onReportChange }: ProductionPdfViewProps) {
  const isSample = tab === 'sample_production_report';

  const [fromMonthStr, setFromMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [toMonthStr, setToMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const { data, isLoading } = useProductionPdfData(fromMonthStr, toMonthStr, isSample);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);

  useEffect(() => {
    if (isLoading || !data) return;

    let isCancelled = false;

    const generatePdf = async () => {
      setIsGenerating(true);

      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      let y = 18;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEAL);
      doc.text('ANITHA KNITS', 105, y, { align: 'center' });
      y += 8;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 90, 90);

      const title = isSample ? 'SAMPLE PRODUCTION REPORT' : 'PRODUCTION DETAILS REPORT';

      doc.text(title, 105, y, { align: 'center' });
      y += 7;
      const periodText = fromMonthStr === toMonthStr ? getMonthName(fromMonthStr) : `${getMonthName(fromMonthStr)} - ${getMonthName(toMonthStr)}`;
      doc.text(`Period: ${periodText}`, 105, y, { align: 'center' });
      y += 5;

      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.6);
      doc.line(14, y, 196, y);
      y += 8;

      const sections = buildSections(data);

      const pageHeight = doc.internal.pageSize.getHeight();

      for (const section of sections) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 18;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEAL);
        doc.text(section.title, 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [section.headers],
          body: section.rows.map((row) => [...row.labels, ...row.values.map(formatNum)]),
          foot: [['Total', ...Array(section.labelColCount - 1).fill(''), ...section.totals.map(formatNum)]],
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: TEAL_TINT, textColor: TEAL, fontStyle: 'bold' },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

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
  }, [data, isLoading, tab, fromMonthStr, toMonthStr, isSample]);

  const handleDownloadXlsx = async () => {
    if (!data) return;
    setIsGeneratingXlsx(true);
    try {
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();
      const wsData: any[][] = [];

      const sections = buildSections(data);

      for (const section of sections) {
        wsData.push([section.title]);
        wsData.push(section.headers);
        section.rows.forEach((row) => wsData.push([...row.labels, ...row.values]));
        wsData.push(['Total', ...Array(section.labelColCount - 1).fill(''), ...section.totals]);
        wsData.push([]);
      }

      let displayTitle = isSample ? 'Sample Production' : 'Production Details';
      const ws = utils.aoa_to_sheet(wsData);
      utils.book_append_sheet(wb, ws, displayTitle.substring(0, 31));

      const period = fromMonthStr === toMonthStr ? fromMonthStr : `${fromMonthStr}_to_${toMonthStr}`;
      writeFile(wb, `Anitha_Knits_${isSample ? 'Sample_' : ''}Production_Details_${period}.xlsx`);
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
      a.download = `Anitha_Knits_${isSample ? 'Sample_' : ''}Production_Details_${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  let displayTitle = isSample ? 'Sample Production' : 'Production Details';

  return (
    <ReportLayout
      displayTitle={displayTitle}
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
