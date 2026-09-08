import { useEffect, useState } from 'react';
import { Loader } from '@/components/shared/loader';
import { Input } from '@/components/ui/input';
import { useDashboardReportData } from './dashboard-pdf-data';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// Merges per-stage size/chemical rows into one combined table by label (a size or a chemical
// name) — mirrors "Production by Color", just keyed by size/chemical instead of color. Unlike
// colors (a fixed 3-item list every stage shares), sizes/chemicals vary per stage, so this
// merges by label rather than assuming the three arrays line up index-for-index. Each stage's
// rows carry different extra fields (lums/yarnWaste vs waste vs fwWaste/bwWaste) — callers map
// down to {label, production} first since that's all the merge needs.
function mergeProductionByLabel(
  extruder: { label: string; production: number }[],
  looms: { label: string; production: number }[],
  fabric: { label: string; production: number }[],
): { label: string; extruder: number; looms: number; fabric: number; total: number }[] {
  const labels = new Set<string>();
  extruder.forEach((r) => labels.add(r.label));
  looms.forEach((r) => labels.add(r.label));
  fabric.forEach((r) => labels.add(r.label));
  const exMap = new Map(extruder.map((r) => [r.label, r.production]));
  const loMap = new Map(looms.map((r) => [r.label, r.production]));
  const faMap = new Map(fabric.map((r) => [r.label, r.production]));
  return Array.from(labels)
    .sort((a, b) => a.localeCompare(b))
    .map((label) => {
      const e = exMap.get(label) ?? 0;
      const l = loMap.get(label) ?? 0;
      const f = faMap.get(label) ?? 0;
      return { label, extruder: e, looms: l, fabric: f, total: e + l + f };
    });
}

interface DashboardPdfViewProps {
  tab: string; // 'production_summary' | 'wastage_summary' | 'sample_production'
}

export function DashboardPdfView({ tab }: DashboardPdfViewProps) {
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const isSample = tab === 'sample_production';
  const data = useDashboardReportData(monthStr, isSample);
  
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!data) return;
    
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
      
      let title = '';
      if (tab === 'production_summary') title = 'PRODUCTION SUMMARY REPORT';
      else if (tab === 'sample_production') title = 'SAMPLE PRODUCTION REPORT';
      else if (tab === 'wastage_summary') title = 'WASTAGE SUMMARY REPORT';
      
      doc.text(title, 105, y, { align: 'center' });
      y += 7;
      doc.text(`Period: ${getMonthName(monthStr)}`, 105, y, { align: 'center' });
      y += 5;

      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.6);
      doc.line(14, y, 196, y);
      y += 8;

      const section = (titleStr: string, head: string[], body: (string | number)[][], foot?: (string | number)[][]) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEAL);
        doc.text(titleStr, 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [head],
          body,
          foot,
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: TEAL_TINT, textColor: TEAL, fontStyle: 'bold' },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
        if (y > 260) {
          doc.addPage();
          y = 18;
        }
      };

      if (tab === 'production_summary' || tab === 'sample_production') {
        const grandTotalProduction = data.extruderTotal + data.loomsTotal + data.fabricTotal;
        section(
          'Production by Color',
          ['Color', 'Extruder', 'Looms', 'Fabric Checking', 'Total'],
          data.extruderByColor.map((row, i) => {
            const loomsVal = data.loomsByColor[i]?.production ?? 0;
            const fabricVal = data.fabricByColor[i]?.production ?? 0;
            return [row.color, formatNum(row.production), formatNum(loomsVal), formatNum(fabricVal), formatNum(row.production + loomsVal + fabricVal)];
          }),
          [['Total', formatNum(data.extruderTotal), formatNum(data.loomsTotal), formatNum(data.fabricTotal), formatNum(grandTotalProduction)]],
        );

        const bySizeRows = mergeProductionByLabel(
          data.extruderBySize.map((r) => ({ label: r.size, production: r.production })),
          data.loomsBySize.map((r) => ({ label: r.size, production: r.production })),
          data.fabricBySize.map((r) => ({ label: r.size, production: r.production })),
        );
        if (bySizeRows.length > 0) {
          section(
            'Production by Size',
            ['Size', 'Extruder', 'Looms', 'Fabric Checking', 'Total'],
            bySizeRows.map((r) => [r.label, formatNum(r.extruder), formatNum(r.looms), formatNum(r.fabric), formatNum(r.total)]),
            [['Total',
              formatNum(bySizeRows.reduce((s, r) => s + r.extruder, 0)),
              formatNum(bySizeRows.reduce((s, r) => s + r.looms, 0)),
              formatNum(bySizeRows.reduce((s, r) => s + r.fabric, 0)),
              formatNum(bySizeRows.reduce((s, r) => s + r.total, 0)),
            ]],
          );
        }

        const byChemicalRows = mergeProductionByLabel(
          data.extruderByChemical.map((r) => ({ label: r.chemical, production: r.production })),
          data.loomsByChemical.map((r) => ({ label: r.chemical, production: r.production })),
          data.fabricByChemical.map((r) => ({ label: r.chemical, production: r.production })),
        );
        if (byChemicalRows.length > 0) {
          section(
            'Production by Chemical',
            ['Chemical', 'Extruder', 'Looms', 'Fabric Checking', 'Total'],
            byChemicalRows.map((r) => [r.label, formatNum(r.extruder), formatNum(r.looms), formatNum(r.fabric), formatNum(r.total)]),
            [['Total',
              formatNum(byChemicalRows.reduce((s, r) => s + r.extruder, 0)),
              formatNum(byChemicalRows.reduce((s, r) => s + r.looms, 0)),
              formatNum(byChemicalRows.reduce((s, r) => s + r.fabric, 0)),
              formatNum(byChemicalRows.reduce((s, r) => s + r.total, 0)),
            ]],
          );
        }

        section('Yarn Balance', ['Color', 'Balance (kg)'], data.yarnBalanceByColor.map((row) => [row.color, formatNum(row.balance)]));
        section('Kora Balance', ['Color', 'Balance (kg)'], data.koraBalanceByColor.map((row) => [row.color, formatNum(row.balance)]));

        const fabricStockBody: (string | number)[][] = [];
        data.fabricStockByColor.forEach((row) => {
          ['150cm', '160cm', '170cm', '180cm', '190cm'].forEach((size) => fabricStockBody.push([row.color, size, formatNum(row.stockBySize[size] || 0)]));
        });
        section('Fabric Stock', ['Color', 'Size', 'Stock (kg)'], fabricStockBody, [['Total Fabric Stock', '', formatNum(data.totalFabricStock)]]);

        const deliveredBody: (string | number)[][] = [];
        data.deliveriesByColor.forEach((colorRow) => {
          colorRow.deliveries.forEach((d) => deliveredBody.push([new Date(d.date).toLocaleDateString('en-IN'), colorRow.color, d.size, formatNum(d.kg)]));
        });
        section('Fabric Delivered', ['Date', 'Color', 'Size', 'Weight (kg)'], deliveredBody, [['Total Fabric Delivered', '', '', formatNum(data.totalDelivered)]]);

      } else if (tab === 'wastage_summary') {
        const extTotal = data.extruderWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.lums + x.yarnWaste, 0), 0);
        const loomsTotal = data.loomsWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.loomsWaste, 0), 0);
        const fabricTotal = data.fabricWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.fabricWaste + x.bitWaste, 0), 0);

        const extruderWastageBody: (string | number)[][] = [];
        data.extruderWasteByVariant.forEach(row => {
          const lums = row.sizes.reduce((s, x) => s + x.lums, 0);
          const yarn = row.sizes.reduce((s, x) => s + x.yarnWaste, 0);
          extruderWastageBody.push([row.color, formatNum(lums), formatNum(yarn), formatNum(lums + yarn)]);
        });

        section(
          'Extruder Wastage',
          ['Color', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
          extruderWastageBody,
          [['Total', '', '', formatNum(extTotal)]],
        );

        if (data.extruderBySize.length > 0) {
          section(
            'Extruder Wastage — By Size',
            ['Size', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
            data.extruderBySize.map((r) => [r.size, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]),
            [['Total', '', '', formatNum(data.extruderBySize.reduce((s, r) => s + r.lums + r.yarnWaste, 0))]],
          );
        }
        if (data.extruderByChemical.length > 0) {
          section(
            'Extruder Wastage — By Chemical',
            ['Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
            data.extruderByChemical.map((r) => [r.chemical, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]),
            [['Total', '', '', formatNum(data.extruderByChemical.reduce((s, r) => s + r.lums + r.yarnWaste, 0))]],
          );
        }

        const loomsWastageBody: (string | number)[][] = [];
        data.loomsWasteByVariant.forEach(row => {
          const lw = row.sizes.reduce((s, x) => s + x.loomsWaste, 0);
          loomsWastageBody.push([row.color, formatNum(lw)]);
        });

        section(
          'Looms Wastage',
          ['Color', 'Looms/Yarn Waste (LW)'],
          loomsWastageBody,
          [['Total', formatNum(loomsTotal)]],
        );

        if (data.loomsBySize.length > 0) {
          section(
            'Looms Wastage — By Size',
            ['Size', 'Looms/Yarn Waste (LW)'],
            data.loomsBySize.map((r) => [r.size, formatNum(r.waste)]),
            [['Total', formatNum(data.loomsBySize.reduce((s, r) => s + r.waste, 0))]],
          );
        }
        if (data.loomsByChemical.length > 0) {
          section(
            'Looms Wastage — By Chemical',
            ['Chemical', 'Looms/Yarn Waste (LW)'],
            data.loomsByChemical.map((r) => [r.chemical, formatNum(r.waste)]),
            [['Total', formatNum(data.loomsByChemical.reduce((s, r) => s + r.waste, 0))]],
          );
        }

        const fabricWastageBody: (string | number)[][] = [];
        data.fabricWasteByVariant.forEach(row => {
          const fw = row.sizes.reduce((s, x) => s + x.fabricWaste, 0);
          const bw = row.sizes.reduce((s, x) => s + x.bitWaste, 0);
          fabricWastageBody.push([row.color, formatNum(fw), formatNum(bw), formatNum(fw + bw)]);
        });

        section(
          'Fabric Checking Wastage',
          ['Color', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
          fabricWastageBody,
          [['Total', '', '', formatNum(fabricTotal)]],
        );

        if (data.fabricBySize.length > 0) {
          section(
            'Fabric Checking Wastage — By Size',
            ['Size', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
            data.fabricBySize.map((r) => [r.size, formatNum(r.fwWaste), formatNum(r.bwWaste), formatNum(r.fwWaste + r.bwWaste)]),
            [['Total', '', '', formatNum(data.fabricBySize.reduce((s, r) => s + r.fwWaste + r.bwWaste, 0))]],
          );
        }
        if (data.fabricByChemical.length > 0) {
          section(
            'Fabric Checking Wastage — By Chemical',
            ['Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
            data.fabricByChemical.map((r) => [r.chemical, formatNum(r.fwWaste), formatNum(r.bwWaste), formatNum(r.fwWaste + r.bwWaste)]),
            [['Total', '', '', formatNum(data.fabricByChemical.reduce((s, r) => s + r.fwWaste + r.bwWaste, 0))]],
          );
        }
      }

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 105, pageHeight - 10, { align: 'center' });

      if (!isCancelled) {
        setPdfBlobUrl(doc.output('bloburi').toString());
        setIsGenerating(false);
      }
    };
    
    generatePdf();

    return () => {
      isCancelled = true;
    };
  }, [data, tab, monthStr]);

  let displayTitle = '';
  if (tab === 'production_summary') displayTitle = 'Production Summary';
  else if (tab === 'sample_production') displayTitle = 'Sample Production';
  else if (tab === 'wastage_summary') displayTitle = 'Wastage Summary';

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
                a.download = `${tab}_report_${monthStr}.pdf`;
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
        {!data || isGenerating ? (
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
