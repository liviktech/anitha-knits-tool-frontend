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

type SectionKey =
  | 'productionByColor'
  | 'productionBySize'
  | 'productionByChemical'
  | 'yarnBalance'
  | 'koraBalance'
  | 'fabricStock'
  | 'fabricDelivered'
  | 'extruderWastage'
  | 'loomsWastage'
  | 'fabricWastage';

const PRODUCTION_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'productionByColor', label: 'Production by Color' },
  { key: 'productionBySize', label: 'Production by Size' },
  { key: 'productionByChemical', label: 'Production by Chemical' },
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

  const isSample = tab === 'sample_production';
  const isWastage = tab === 'wastage_summary';
  const data = useDashboardReportData(fromMonthStr, toMonthStr, isSample);

  const allSectionDefs = isWastage ? WASTAGE_SECTIONS : PRODUCTION_SECTIONS;
  const [visibleSections, setVisibleSections] = useState<Record<SectionKey, boolean>>(
    () => Object.fromEntries(allSectionDefs.map((s) => [s.key, true])) as Record<SectionKey, boolean>
  );

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
        const grandTotalProduction = data.extruderTotal + data.loomsTotal + data.fabricTotal;

        if (visibleSections.productionByColor) {
          section(
            'Production by Color',
            ['Color', 'Extruder', 'Looms', 'Fabric Checking', 'Total'],
            data.extruderByColor.map((row, i) => {
              const lv = data.loomsByColor[i]?.production ?? 0;
              const fv = data.fabricByColor[i]?.production ?? 0;
              return [row.color, formatNum(row.production), formatNum(lv), formatNum(fv), formatNum(row.production + lv + fv)];
            }),
            [['Total', formatNum(data.extruderTotal), formatNum(data.loomsTotal), formatNum(data.fabricTotal), formatNum(grandTotalProduction)]],
          );
        }

        if (visibleSections.productionBySize) {
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
              [['Total', formatNum(bySizeRows.reduce((s, r) => s + r.extruder, 0)), formatNum(bySizeRows.reduce((s, r) => s + r.looms, 0)), formatNum(bySizeRows.reduce((s, r) => s + r.fabric, 0)), formatNum(bySizeRows.reduce((s, r) => s + r.total, 0))]],
            );
          }
        }

        if (visibleSections.productionByChemical) {
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
              [['Total', formatNum(byChemicalRows.reduce((s, r) => s + r.extruder, 0)), formatNum(byChemicalRows.reduce((s, r) => s + r.looms, 0)), formatNum(byChemicalRows.reduce((s, r) => s + r.fabric, 0)), formatNum(byChemicalRows.reduce((s, r) => s + r.total, 0))]],
            );
          }
        }

        if (visibleSections.yarnBalance) section('Yarn Balance', ['Color', 'Balance (kg)'], data.yarnBalanceByColor.map((row) => [row.color, formatNum(row.balance)]));
        if (visibleSections.koraBalance) section('Kora Balance', ['Color', 'Balance (kg)'], data.koraBalanceByColor.map((row) => [row.color, formatNum(row.balance)]));

        if (visibleSections.fabricStock) {
          const fabricStockBody: (string | number)[][] = [];
          data.fabricStockByColor.forEach((row) => {
            ['150cm', '160cm', '170cm', '180cm', '190cm'].forEach((size) => fabricStockBody.push([row.color, size, formatNum(row.stockBySize[size] || 0)]));
          });
          section('Fabric Stock', ['Color', 'Size', 'Stock (kg)'], fabricStockBody, [['Total Fabric Stock', '', formatNum(data.totalFabricStock)]]);
        }

        if (visibleSections.fabricDelivered) {
          const deliveredBody: (string | number)[][] = [];
          data.deliveriesByColor.forEach((colorRow) => {
            colorRow.deliveries.forEach((d) => deliveredBody.push([new Date(d.date).toLocaleDateString('en-IN'), colorRow.color, d.size, formatNum(d.kg)]));
          });
          section('Fabric Delivered', ['Date', 'Color', 'Size', 'Weight (kg)'], deliveredBody, [['Total Fabric Delivered', '', '', formatNum(data.totalDelivered)]]);
        }

      } else if (tab === 'wastage_summary') {
        const extTotal = data.extruderWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.lums + x.yarnWaste, 0), 0);
        const loomsTotal = data.loomsWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.loomsWaste, 0), 0);
        const fabricTotal = data.fabricWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.fabricWaste + x.bitWaste, 0), 0);

        if (visibleSections.extruderWastage) {
          const extruderWastageBody: (string | number)[][] = [];
          data.extruderWasteByVariant.forEach(row => {
            const lums = row.sizes.reduce((s, x) => s + x.lums, 0);
            const yarn = row.sizes.reduce((s, x) => s + x.yarnWaste, 0);
            extruderWastageBody.push([row.color, formatNum(lums), formatNum(yarn), formatNum(lums + yarn)]);
          });
          section('Extruder Wastage', ['Color', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'], extruderWastageBody, [['Total', '', '', formatNum(extTotal)]]);
          if (data.extruderBySize.length > 0) section('Extruder Wastage — By Size', ['Size', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'], data.extruderBySize.map((r) => [r.size, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]), [['Total', '', '', formatNum(data.extruderBySize.reduce((s, r) => s + r.lums + r.yarnWaste, 0))]]);
          if (data.extruderByChemical.length > 0) section('Extruder Wastage — By Chemical', ['Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'], data.extruderByChemical.map((r) => [r.chemical, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]), [['Total', '', '', formatNum(data.extruderByChemical.reduce((s, r) => s + r.lums + r.yarnWaste, 0))]]);
        }

        if (visibleSections.loomsWastage) {
          const loomsWastageBody: (string | number)[][] = [];
          data.loomsWasteByVariant.forEach(row => { const lw = row.sizes.reduce((s, x) => s + x.loomsWaste, 0); loomsWastageBody.push([row.color, formatNum(lw)]); });
          section('Looms Wastage', ['Color', 'Looms/Yarn Waste (LW)'], loomsWastageBody, [['Total', formatNum(loomsTotal)]]);
          if (data.loomsBySize.length > 0) section('Looms Wastage — By Size', ['Size', 'Looms/Yarn Waste (LW)'], data.loomsBySize.map((r) => [r.size, formatNum(r.waste)]), [['Total', formatNum(data.loomsBySize.reduce((s, r) => s + r.waste, 0))]]);
          if (data.loomsByChemical.length > 0) section('Looms Wastage — By Chemical', ['Chemical', 'Looms/Yarn Waste (LW)'], data.loomsByChemical.map((r) => [r.chemical, formatNum(r.waste)]), [['Total', formatNum(data.loomsByChemical.reduce((s, r) => s + r.waste, 0))]]);
        }

        if (visibleSections.fabricWastage) {
          const fabricWastageBody: (string | number)[][] = [];
          data.fabricWasteByVariant.forEach(row => { const fw = row.sizes.reduce((s, x) => s + x.fabricWaste, 0); const bw = row.sizes.reduce((s, x) => s + x.bitWaste, 0); fabricWastageBody.push([row.color, formatNum(fw), formatNum(bw), formatNum(fw + bw)]); });
          section('Fabric Checking Wastage', ['Color', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'], fabricWastageBody, [['Total', '', '', formatNum(fabricTotal)]]);
          if (data.fabricBySize.length > 0) section('Fabric Checking Wastage — By Size', ['Size', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'], data.fabricBySize.map((r) => [r.size, formatNum(r.fwWaste), formatNum(r.bwWaste), formatNum(r.fwWaste + r.bwWaste)]), [['Total', '', '', formatNum(data.fabricBySize.reduce((s, r) => s + r.fwWaste + r.bwWaste, 0))]]);
          if (data.fabricByChemical.length > 0) section('Fabric Checking Wastage — By Chemical', ['Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'], data.fabricByChemical.map((r) => [r.chemical, formatNum(r.fwWaste), formatNum(r.bwWaste), formatNum(r.fwWaste + r.bwWaste)]), [['Total', '', '', formatNum(data.fabricByChemical.reduce((s, r) => s + r.fwWaste + r.bwWaste, 0))]]);
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
        const grandTotalProduction = data.extruderTotal + data.loomsTotal + data.fabricTotal;

        if (visibleSections.productionByColor) {
          section(
            'Production by Color',
            ['Color', 'Extruder', 'Looms', 'Fabric Checking', 'Total'],
            data.extruderByColor.map((row, i) => {
              const lv = data.loomsByColor[i]?.production ?? 0;
              const fv = data.fabricByColor[i]?.production ?? 0;
              return [row.color, formatNum(row.production), formatNum(lv), formatNum(fv), formatNum(row.production + lv + fv)];
            }),
            [['Total', formatNum(data.extruderTotal), formatNum(data.loomsTotal), formatNum(data.fabricTotal), formatNum(grandTotalProduction)]],
          );
        }

        if (visibleSections.productionBySize) {
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
              [['Total', formatNum(bySizeRows.reduce((s, r) => s + r.extruder, 0)), formatNum(bySizeRows.reduce((s, r) => s + r.looms, 0)), formatNum(bySizeRows.reduce((s, r) => s + r.fabric, 0)), formatNum(bySizeRows.reduce((s, r) => s + r.total, 0))]],
            );
          }
        }

        if (visibleSections.productionByChemical) {
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
              [['Total', formatNum(byChemicalRows.reduce((s, r) => s + r.extruder, 0)), formatNum(byChemicalRows.reduce((s, r) => s + r.looms, 0)), formatNum(byChemicalRows.reduce((s, r) => s + r.fabric, 0)), formatNum(byChemicalRows.reduce((s, r) => s + r.total, 0))]],
            );
          }
        }

        if (visibleSections.yarnBalance) section('Yarn Balance', ['Color', 'Balance (kg)'], data.yarnBalanceByColor.map((row) => [row.color, formatNum(row.balance)]));
        if (visibleSections.koraBalance) section('Kora Balance', ['Color', 'Balance (kg)'], data.koraBalanceByColor.map((row) => [row.color, formatNum(row.balance)]));

        if (visibleSections.fabricStock) {
          const fabricStockBody: (string | number)[][] = [];
          data.fabricStockByColor.forEach((row) => {
            ['150cm', '160cm', '170cm', '180cm', '190cm'].forEach((size) => fabricStockBody.push([row.color, size, formatNum(row.stockBySize[size] || 0)]));
          });
          section('Fabric Stock', ['Color', 'Size', 'Stock (kg)'], fabricStockBody, [['Total Fabric Stock', '', formatNum(data.totalFabricStock)]]);
        }

        if (visibleSections.fabricDelivered) {
          const deliveredBody: (string | number)[][] = [];
          data.deliveriesByColor.forEach((colorRow) => {
            colorRow.deliveries.forEach((d) => deliveredBody.push([new Date(d.date).toLocaleDateString('en-IN'), colorRow.color, d.size, formatNum(d.kg)]));
          });
          section('Fabric Delivered', ['Date', 'Color', 'Size', 'Weight (kg)'], deliveredBody, [['Total Fabric Delivered', '', '', formatNum(data.totalDelivered)]]);
        }

      } else if (tab === 'wastage_summary') {
        const extTotal = data.extruderWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.lums + x.yarnWaste, 0), 0);
        const loomsTotal = data.loomsWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.loomsWaste, 0), 0);
        const fabricTotal = data.fabricWasteByVariant.reduce((sum, r) => sum + r.sizes.reduce((s, x) => s + x.fabricWaste + x.bitWaste, 0), 0);

        if (visibleSections.extruderWastage) {
          const extruderWastageBody: (string | number)[][] = [];
          data.extruderWasteByVariant.forEach(row => {
            const lums = row.sizes.reduce((s, x) => s + x.lums, 0);
            const yarn = row.sizes.reduce((s, x) => s + x.yarnWaste, 0);
            extruderWastageBody.push([row.color, formatNum(lums), formatNum(yarn), formatNum(lums + yarn)]);
          });
          section('Extruder Wastage', ['Color', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'], extruderWastageBody, [['Total', '', '', formatNum(extTotal)]]);
          if (data.extruderBySize.length > 0) section('Extruder Wastage — By Size', ['Size', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'], data.extruderBySize.map((r) => [r.size, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]), [['Total', '', '', formatNum(data.extruderBySize.reduce((s, r) => s + r.lums + r.yarnWaste, 0))]]);
          if (data.extruderByChemical.length > 0) section('Extruder Wastage — By Chemical', ['Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'], data.extruderByChemical.map((r) => [r.chemical, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]), [['Total', '', '', formatNum(data.extruderByChemical.reduce((s, r) => s + r.lums + r.yarnWaste, 0))]]);
        }

        if (visibleSections.loomsWastage) {
          const loomsWastageBody: (string | number)[][] = [];
          data.loomsWasteByVariant.forEach(row => { const lw = row.sizes.reduce((s, x) => s + x.loomsWaste, 0); loomsWastageBody.push([row.color, formatNum(lw)]); });
          section('Looms Wastage', ['Color', 'Looms/Yarn Waste (LW)'], loomsWastageBody, [['Total', formatNum(loomsTotal)]]);
          if (data.loomsBySize.length > 0) section('Looms Wastage — By Size', ['Size', 'Looms/Yarn Waste (LW)'], data.loomsBySize.map((r) => [r.size, formatNum(r.waste)]), [['Total', formatNum(data.loomsBySize.reduce((s, r) => s + r.waste, 0))]]);
          if (data.loomsByChemical.length > 0) section('Looms Wastage — By Chemical', ['Chemical', 'Looms/Yarn Waste (LW)'], data.loomsByChemical.map((r) => [r.chemical, formatNum(r.waste)]), [['Total', formatNum(data.loomsByChemical.reduce((s, r) => s + r.waste, 0))]]);
        }

        if (visibleSections.fabricWastage) {
          const fabricWastageBody: (string | number)[][] = [];
          data.fabricWasteByVariant.forEach(row => { const fw = row.sizes.reduce((s, x) => s + x.fabricWaste, 0); const bw = row.sizes.reduce((s, x) => s + x.bitWaste, 0); fabricWastageBody.push([row.color, formatNum(fw), formatNum(bw), formatNum(fw + bw)]); });
          section('Fabric Checking Wastage', ['Color', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'], fabricWastageBody, [['Total', '', '', formatNum(fabricTotal)]]);
          if (data.fabricBySize.length > 0) section('Fabric Checking Wastage — By Size', ['Size', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'], data.fabricBySize.map((r) => [r.size, formatNum(r.fwWaste), formatNum(r.bwWaste), formatNum(r.fwWaste + r.bwWaste)]), [['Total', '', '', formatNum(data.fabricBySize.reduce((s, r) => s + r.fwWaste + r.bwWaste, 0))]]);
          if (data.fabricByChemical.length > 0) section('Fabric Checking Wastage — By Chemical', ['Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'], data.fabricByChemical.map((r) => [r.chemical, formatNum(r.fwWaste), formatNum(r.bwWaste), formatNum(r.fwWaste + r.bwWaste)]), [['Total', '', '', formatNum(data.fabricByChemical.reduce((s, r) => s + r.fwWaste + r.bwWaste, 0))]]);
        }
      }

      let displayTitle = '';
      if (tab === 'production_summary') displayTitle = 'Production Summary';
      else if (tab === 'sample_production') displayTitle = 'Sample Production';
      else if (tab === 'wastage_summary') displayTitle = 'Wastage Summary';

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
