import { useEffect, useState } from 'react';
import { useDashboardReportData } from './dashboard-pdf-data';
import { ReportLayout } from './report-layout';

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

type SectionKey =
  | 'extruderProduction'
  | 'loomsProduction'
  | 'fabricChecking'
  | 'yarnBalance'
  | 'koraBalance'
  | 'fabricStock'
  | 'fabricDelivered'
  | 'extruderWastage'
  | 'loomsWastage'
  | 'fabricWastage';

const PRODUCTION_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'extruderProduction', label: 'Extruder Production' },
  { key: 'loomsProduction', label: 'Looms Production' },
  { key: 'fabricChecking', label: 'Fabric Checking' },
  { key: 'yarnBalance', label: 'Yarn Balance' },
  { key: 'koraBalance', label: 'Kora Balance' },
  { key: 'fabricStock', label: 'Fabric Stock' },
  { key: 'fabricDelivered', label: 'Fabric Delivered' },
];

const WASTAGE_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'extruderWastage', label: 'Extruder Wastage' },
  { key: 'loomsWastage', label: 'Looms Wastage' },
  { key: 'fabricWastage', label: 'Fabric Checking Wastage' },
];

interface DashboardPdfViewProps {
  tab: string;
  allReports?: { id: string; label: string; moduleId: string }[];
  selectedReport?: string;
  onReportChange?: (tabId: string, moduleId: string) => void;
}

export function DashboardPdfView({ tab, allReports, selectedReport, onReportChange }: DashboardPdfViewProps) {
  const [fromMonthStr, setFromMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [toMonthStr, setToMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const isSample = tab === 'sample_production' || tab === 'sample_wastage_summary';
  const isWastage = tab === 'wastage_summary' || tab === 'sample_wastage_summary';
  const data = useDashboardReportData(fromMonthStr, toMonthStr, isSample);

  const allSectionDefs = isWastage ? WASTAGE_SECTIONS : PRODUCTION_SECTIONS;
  const [visibleSections, setVisibleSections] = useState<Record<SectionKey, boolean>>(
    () => Object.fromEntries(allSectionDefs.map((s) => [s.key, true])) as Record<SectionKey, boolean>
  );

  // Reset checkboxes when switching between Production and Wastage tabs
  useEffect(() => {
    setVisibleSections(Object.fromEntries(allSectionDefs.map((s) => [s.key, true])) as Record<SectionKey, boolean>);
  }, [tab]);

  const toggleSection = (key: SectionKey) =>
    setVisibleSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);


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
      else if (tab === 'sample_wastage_summary') title = 'SAMPLE WASTAGE SUMMARY REPORT';

      doc.text(title, 105, y, { align: 'center' });
      y += 7;
      const periodText = fromMonthStr === toMonthStr ? getMonthName(fromMonthStr) : `${getMonthName(fromMonthStr)} - ${getMonthName(toMonthStr)}`;
      doc.text(`Period: ${periodText}`, 105, y, { align: 'center' });
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
        if (y > 260) { doc.addPage(); y = 18; }
      };

      if (tab === 'production_summary' || tab === 'sample_production') {
        if (visibleSections.extruderProduction && data.extruderVariantRows.length > 0) {
          section(
            'Extruder Production',
            ['Size', 'Color', 'Chemical', 'Weight (kg)'],
            data.extruderVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.extruderTotal)]],
          );
        }

        if (visibleSections.loomsProduction && data.loomsVariantRows.length > 0) {
          section(
            'Looms Production',
            ['Size', 'Color', 'Chemical', 'Weight (kg)'],
            data.loomsVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.loomsTotal)]],
          );
        }

        if (visibleSections.fabricChecking && data.fabricVariantRows.length > 0) {
          section(
            'Fabric Checking',
            ['Size', 'Color', 'Chemical', 'Weight (kg)'],
            data.fabricVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.fabricTotal)]],
          );
        }

        if (visibleSections.yarnBalance && data.yarnBalanceVariantRows.length > 0) {
          section(
            'Yarn Balance',
            ['Size', 'Color', 'Chemical', 'Balance (kg)'],
            data.yarnBalanceVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.yarnBalanceVariantRows.reduce((s, r) => s + r.value, 0))]],
          );
        }

        if (visibleSections.koraBalance && data.koraBalanceVariantRows.length > 0) {
          section(
            'Kora Balance',
            ['Size', 'Color', 'Chemical', 'Balance (kg)'],
            data.koraBalanceVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.koraBalanceVariantRows.reduce((s, r) => s + r.value, 0))]],
          );
        }

        if (visibleSections.fabricStock && data.fabricStockVariantRows.length > 0) {
          section(
            'Fabric Stock',
            ['Size', 'Color', 'Chemical', 'Stock (kg)'],
            data.fabricStockVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.totalFabricStock)]],
          );
        }

        if (visibleSections.fabricDelivered && data.fabricDeliveredVariantRows.length > 0) {
          section(
            'Fabric Delivered',
            ['Size', 'Color', 'Chemical', 'Weight (kg)'],
            data.fabricDeliveredVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.totalDelivered)]],
          );
        }

      } else if (isWastage) {
        if (visibleSections.extruderWastage && data.extruderWasteVariantRows.length > 0) {
          section(
            'Extruder Wastage',
            ['Size', 'Color', 'Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
            data.extruderWasteVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]),
            [['Total', '', '', '', '', formatNum(data.extruderWasteTotal)]],
          );
        }

        if (visibleSections.loomsWastage && data.loomsWasteVariantRows.length > 0) {
          section(
            'Looms Wastage',
            ['Size', 'Color', 'Chemical', 'Looms/Yarn Waste (LW)'],
            data.loomsWasteVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.loomsWaste)]),
            [['Total', '', '', formatNum(data.loomsWasteTotal)]],
          );
        }

        if (visibleSections.fabricWastage && data.fabricWasteVariantRows.length > 0) {
          section(
            'Fabric Checking Wastage',
            ['Size', 'Color', 'Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
            data.fabricWasteVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.fabricWaste), formatNum(r.bitWaste), formatNum(r.fabricWaste + r.bitWaste)]),
            [['Total', '', '', '', '', formatNum(data.fabricWasteTotal)]],
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
    return () => { isCancelled = true; };
  }, [data, tab, fromMonthStr, toMonthStr, visibleSections]);

  const handleDownloadXlsx = async () => {
    if (!data) return;
    setIsGeneratingXlsx(true);
    try {
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();
      const wsData: any[][] = [];

      const section = (titleStr: string, head: string[], body: (string | number)[][], foot?: (string | number)[][]) => {
        wsData.push([titleStr]);
        wsData.push(head);
        wsData.push(...body);
        if (foot) wsData.push(...foot);
        wsData.push([]); // empty row separator
      };

      if (tab === 'production_summary' || tab === 'sample_production') {
        if (visibleSections.extruderProduction && data.extruderVariantRows.length > 0) {
          section(
            'Extruder Production',
            ['Size', 'Color', 'Chemical', 'Weight (kg)'],
            data.extruderVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.extruderTotal)]],
          );
        }

        if (visibleSections.loomsProduction && data.loomsVariantRows.length > 0) {
          section(
            'Looms Production',
            ['Size', 'Color', 'Chemical', 'Weight (kg)'],
            data.loomsVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.loomsTotal)]],
          );
        }

        if (visibleSections.fabricChecking && data.fabricVariantRows.length > 0) {
          section(
            'Fabric Checking',
            ['Size', 'Color', 'Chemical', 'Weight (kg)'],
            data.fabricVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.fabricTotal)]],
          );
        }

        if (visibleSections.yarnBalance && data.yarnBalanceVariantRows.length > 0) {
          section(
            'Yarn Balance',
            ['Size', 'Color', 'Chemical', 'Balance (kg)'],
            data.yarnBalanceVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.yarnBalanceVariantRows.reduce((s, r) => s + r.value, 0))]],
          );
        }

        if (visibleSections.koraBalance && data.koraBalanceVariantRows.length > 0) {
          section(
            'Kora Balance',
            ['Size', 'Color', 'Chemical', 'Balance (kg)'],
            data.koraBalanceVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.koraBalanceVariantRows.reduce((s, r) => s + r.value, 0))]],
          );
        }

        if (visibleSections.fabricStock && data.fabricStockVariantRows.length > 0) {
          section(
            'Fabric Stock',
            ['Size', 'Color', 'Chemical', 'Stock (kg)'],
            data.fabricStockVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.totalFabricStock)]],
          );
        }

        if (visibleSections.fabricDelivered && data.fabricDeliveredVariantRows.length > 0) {
          section(
            'Fabric Delivered',
            ['Size', 'Color', 'Chemical', 'Weight (kg)'],
            data.fabricDeliveredVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.value)]),
            [['Total', '', '', formatNum(data.totalDelivered)]],
          );
        }

      } else if (isWastage) {
        if (visibleSections.extruderWastage && data.extruderWasteVariantRows.length > 0) {
          section(
            'Extruder Wastage',
            ['Size', 'Color', 'Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
            data.extruderWasteVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]),
            [['Total', '', '', '', '', formatNum(data.extruderWasteTotal)]],
          );
        }

        if (visibleSections.loomsWastage && data.loomsWasteVariantRows.length > 0) {
          section(
            'Looms Wastage',
            ['Size', 'Color', 'Chemical', 'Looms/Yarn Waste (LW)'],
            data.loomsWasteVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.loomsWaste)]),
            [['Total', '', '', formatNum(data.loomsWasteTotal)]],
          );
        }

        if (visibleSections.fabricWastage && data.fabricWasteVariantRows.length > 0) {
          section(
            'Fabric Checking Wastage',
            ['Size', 'Color', 'Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
            data.fabricWasteVariantRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.fabricWaste), formatNum(r.bitWaste), formatNum(r.fabricWaste + r.bitWaste)]),
            [['Total', '', '', '', '', formatNum(data.fabricWasteTotal)]],
          );
        }
      }

      let displayTitle = '';
      if (tab === 'production_summary') displayTitle = 'Production Summary';
      else if (tab === 'sample_production') displayTitle = 'Sample Production';
      else if (tab === 'wastage_summary') displayTitle = 'Wastage Summary';
      else if (tab === 'sample_wastage_summary') displayTitle = 'Sample Wastage Summary';

      const ws = utils.aoa_to_sheet(wsData);
      utils.book_append_sheet(wb, ws, displayTitle.substring(0, 31));

      const period = fromMonthStr === toMonthStr ? fromMonthStr : `${fromMonthStr}_to_${toMonthStr}`;
      writeFile(wb, `${tab}_report_${period}.xlsx`);
    } catch (err) {
      console.error('Failed to generate XLSX', err);
    } finally {
      setIsGeneratingXlsx(false);
    }
  };

  let displayTitle = '';
  if (tab === 'production_summary') displayTitle = 'Production Summary';
  else if (tab === 'sample_production') displayTitle = 'Sample Production';
  else if (tab === 'wastage_summary') displayTitle = 'Wastage Summary';
  else if (tab === 'sample_wastage_summary') displayTitle = 'Sample Wastage Summary';

  return (
    <ReportLayout
      displayTitle={displayTitle}
      allReports={allReports}
      selectedReport={selectedReport}
      onReportChange={onReportChange}
      fromMonthStr={fromMonthStr}
      onFromMonthChange={setFromMonthStr}
      toMonthStr={toMonthStr}
      onToMonthChange={setToMonthStr}
      showMonthPicker={true}
      pdfBlobUrl={pdfBlobUrl}
      isGenerating={isGenerating}
      isGeneratingXlsx={isGeneratingXlsx}
      isLoading={!data}
      onDownloadXlsx={handleDownloadXlsx}
      onDownload={() => {
        if (pdfBlobUrl) {
          const a = document.createElement('a');
          a.href = pdfBlobUrl;
          const period = fromMonthStr === toMonthStr ? fromMonthStr : `${fromMonthStr}_to_${toMonthStr}`;
          a.download = `${tab}_report_${period}.pdf`;
          a.click();
        }
      }}
      sectionsPanel={
        <div className="flex flex-col gap-1.5">
          {allSectionDefs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleSection(key)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all border ${
                visibleSections[key]
                  ? 'bg-[#004D40]/5 border-[#004D40]/20 text-[#004D40]'
                  : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  visibleSections[key] ? 'bg-[#004D40] border-[#004D40]' : 'border-gray-300'
                }`}
              >
                {visibleSections[key] && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-[12px] font-medium leading-tight">{label}</span>
            </button>
          ))}
        </div>
      }
    />
  );
}
