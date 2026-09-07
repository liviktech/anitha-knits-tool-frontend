import { useEffect, useState } from 'react';
import { Loader } from '@/components/shared/loader';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProductionPdfData, type DeliveryBreakdownRow } from './production-pdf-data';

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

interface BreakdownRow {
  label: string;
  values: number[];
}

const EXTRUDER_COLUMNS = ['Production (kg)', 'Lums (kg)', 'Yarn Waste (kg)', 'Total (kg)'];
const LOOMS_COLUMNS = ['Production (kg)', 'Waste (kg)', 'Total (kg)'];
const FABRIC_COLUMNS = ['Output (kg)', 'FW Waste (kg)', 'BW Waste (kg)', 'Total (kg)'];
const DELIVERY_COLUMNS = ['Delivered (kg)'];

function extruderRows<T extends { production: number; lumsKg: number; yarnWasteKg: number; total: number }>(items: T[], labelOf: (item: T) => string): BreakdownRow[] {
  return items.map((item) => ({ label: labelOf(item), values: [item.production, item.lumsKg, item.yarnWasteKg, item.total] }));
}

function loomsRows<T extends { production: number; waste: number; total: number }>(items: T[], labelOf: (item: T) => string): BreakdownRow[] {
  return items.map((item) => ({ label: labelOf(item), values: [item.production, item.waste, item.total] }));
}

function fabricRows<T extends { production: number; fwWasteKg: number; bwWasteKg: number; total: number }>(items: T[], labelOf: (item: T) => string): BreakdownRow[] {
  return items.map((item) => ({ label: labelOf(item), values: [item.production, item.fwWasteKg, item.bwWasteKg, item.total] }));
}

function deliveryRows(items: DeliveryBreakdownRow[]): BreakdownRow[] {
  return items.map((item) => ({ label: item.label, values: [item.delivered] }));
}

function columnTotals(rows: BreakdownRow[], columnCount: number): number[] {
  const totals = new Array(columnCount).fill(0);
  for (const row of rows) {
    row.values.forEach((v, i) => {
      totals[i] += v;
    });
  }
  return totals;
}

interface ProductionPdfViewProps {
  tab: string; // 'day_wise_report' | 'sample_production_report'
}

export function ProductionPdfView({ tab }: ProductionPdfViewProps) {
  const isSample = tab === 'sample_production_report';

  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const { data, isLoading } = useProductionPdfData(monthStr, isSample);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
      doc.text(`Period: ${getMonthName(monthStr)}`, 105, y, { align: 'center' });
      y += 5;

      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.6);
      doc.line(14, y, 196, y);
      y += 8;

      const sections: { title: string; labelHeader: string; columns: string[]; rows: BreakdownRow[] }[] = [
        { title: 'Extruder Production — By Color', labelHeader: 'Color', columns: EXTRUDER_COLUMNS, rows: extruderRows(data.extruderByColor, (i) => i.color.name) },
        { title: 'Extruder Production — By Size', labelHeader: 'Size', columns: EXTRUDER_COLUMNS, rows: extruderRows(data.extruderBySize, (i) => i.size.name) },
        { title: 'Extruder Production — By Chemical', labelHeader: 'Chemical', columns: EXTRUDER_COLUMNS, rows: extruderRows(data.extruderByChemical, (i) => i.chemical.name) },
        { title: 'Looms Production — By Color', labelHeader: 'Color', columns: LOOMS_COLUMNS, rows: loomsRows(data.loomsByColor, (i) => i.color.name) },
        { title: 'Looms Production — By Size', labelHeader: 'Size', columns: LOOMS_COLUMNS, rows: loomsRows(data.loomsBySize, (i) => i.size.name) },
        { title: 'Looms Production — By Chemical', labelHeader: 'Chemical', columns: LOOMS_COLUMNS, rows: loomsRows(data.loomsByChemical, (i) => i.chemical.name) },
        { title: 'Fabric Checking — By Color', labelHeader: 'Color', columns: FABRIC_COLUMNS, rows: fabricRows(data.fabricByColor, (i) => i.color.name) },
        { title: 'Fabric Checking — By Size', labelHeader: 'Size', columns: FABRIC_COLUMNS, rows: fabricRows(data.fabricBySize, (i) => i.size.name) },
        { title: 'Fabric Checking — By Chemical', labelHeader: 'Chemical', columns: FABRIC_COLUMNS, rows: fabricRows(data.fabricByChemical, (i) => i.chemical.name) },
        { title: 'Delivery — By Color', labelHeader: 'Color', columns: DELIVERY_COLUMNS, rows: deliveryRows(data.deliveryByColor) },
        { title: 'Delivery — By Size', labelHeader: 'Size', columns: DELIVERY_COLUMNS, rows: deliveryRows(data.deliveryBySize) },
      ].filter((s) => s.rows.length > 0);

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
          head: [[section.labelHeader, ...section.columns]],
          body: section.rows.map((row) => [row.label, ...row.values.map(formatNum)]),
          foot: [['Total', ...columnTotals(section.rows, section.columns.length).map(formatNum)]],
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
  }, [data, isLoading, tab, monthStr, isSample]);

  let displayTitle = isSample ? 'Sample Production' : 'Production Details';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 print:hidden">
        <div>
          <h2 className="text-[14px] font-bold text-gray-700 leading-tight uppercase tracking-wide">{displayTitle} PDF Preview</h2>
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
                a.download = `${isSample ? 'Sample_Production' : 'Production_Details'}_Report_${monthStr}.pdf`;
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
        ) : pdfBlobUrl ? (
          <iframe 
            src={pdfBlobUrl} 
            className="w-full h-full rounded-lg shadow-sm border border-gray-300 bg-white"
            title={`${displayTitle} PDF Preview`}
          />
        ) : (
          <div className="text-gray-500">Could not generate PDF.</div>
        )}
      </div>
    </div>
  );
}
