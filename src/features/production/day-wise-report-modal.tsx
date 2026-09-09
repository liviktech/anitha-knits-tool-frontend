import { useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, FileSpreadsheet, Loader2, X } from 'lucide-react';
import type {
  ExtruderProductionVariantChemicalSummary,
  FabricProductionVariantChemicalSummary,
  LoomsProductionVariantChemicalSummary,
} from '@/features/dashboard/dashboard-queries';

const TEAL: [number, number, number] = [0, 77, 64]; // #004D40 — this app's primary accent
const TEAL_TINT: [number, number, number] = [232, 245, 240]; // light teal for footer/total rows

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMonthName(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export interface DeliveryVariantRow {
  size: { name: string };
  color: { name: string };
  chemical: { name: string };
  delivered: number;
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

interface DayWiseReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthStr: string; // YYYY-MM
  extruderByVariantChemical: ExtruderProductionVariantChemicalSummary[];
  extruderTotal: number;
  loomsByVariantChemical: LoomsProductionVariantChemicalSummary[];
  loomsTotal: number;
  fabricByVariantChemical: FabricProductionVariantChemicalSummary[];
  fabricTotal: number;
  deliveryByVariantChemical: DeliveryVariantRow[];
  deliveryTotal: number;
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

export function DayWiseReportModal({
  open,
  onOpenChange,
  monthStr,
  extruderByVariantChemical,
  extruderTotal,
  loomsByVariantChemical,
  loomsTotal,
  fabricByVariantChemical,
  fabricTotal,
  deliveryByVariantChemical,
  deliveryTotal,
}: DayWiseReportModalProps) {
  const sections: ReportSection[] = [
    buildExtruderSection(extruderByVariantChemical),
    buildLoomsSection(loomsByVariantChemical),
    buildFabricSection(fabricByVariantChemical),
    buildFabricDeliveredSection(deliveryByVariantChemical),
  ].filter((s) => s.rows.length > 0);

  const hasData = sections.length > 0;
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);

  const handleDownloadPDF = async () => {
    if (!hasData) return;

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
    doc.text('PRODUCTION DETAILS REPORT', 105, y, { align: 'center' });
    y += 7;
    doc.text(`Period: ${getMonthName(monthStr)}`, 105, y, { align: 'center' });
    y += 5;

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(14, y, 196, y);
    y += 8;

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
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 105, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`Production_Details_Report_${monthStr}.pdf`);
  };

  const handleDownloadXlsx = async () => {
    if (!hasData) return;
    setIsGeneratingXlsx(true);
    try {
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();
      const wsData: any[][] = [];

      for (const section of sections) {
        wsData.push([section.title]);
        wsData.push(section.headers);
        section.rows.forEach((row) => wsData.push([...row.labels, ...row.values]));
        wsData.push(['Total', ...Array(section.labelColCount - 1).fill(''), ...section.totals]);
        wsData.push([]);
      }

      const ws = utils.aoa_to_sheet(wsData);
      utils.book_append_sheet(wb, ws, 'Production Details');

      writeFile(wb, `Production_Details_Report_${monthStr}.xlsx`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingXlsx(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-4xl sm:max-w-4xl max-h-[85vh] flex flex-col p-0 border border-gray-300 overflow-hidden bg-white print:max-w-none print:h-auto print:border-none">
        {/* Modal Header (Not printed) */}
        {/* Close button rendered in-flow here (not DialogContent's default absolutely-positioned
            one) so it shares the same flex row as Download PDF and always lines up with it. */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-[#A8DCAB] shrink-0 print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black">
              Production Details Report Overview
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleDownloadXlsx} disabled={!hasData || isGeneratingXlsx} className="gap-2 bg-[#004D40] text-white hover:bg-[#00382e]">
                {isGeneratingXlsx ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Download XLSX
              </Button>

              <Button size="sm" onClick={handleDownloadPDF} disabled={!hasData} className="gap-2 bg-[#004D40] text-white hover:bg-[#00382e]">
                <FileDown className="w-4 h-4" /> Download PDF
              </Button>

              <DialogClose asChild>
                <Button size="icon-sm" className="bg-red-700 text-white hover:bg-red-400 focus-visible:ring-red-400 cursor-pointer">
                  <X className="w-4 h-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Report Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white" id="production-details-report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                Production Details Report
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Period: {getMonthName(monthStr)}
              </p>
            </div>

            {!hasData ? (
              <div className="text-center py-20 text-gray-500">
                No production records found for this period.
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#004D40]/70 uppercase">Extruder Production</p>
                    <p className="text-2xl font-bold text-[#004D40]">{formatNum(extruderTotal)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#004D40]/70 uppercase">Looms Production</p>
                    <p className="text-2xl font-bold text-[#004D40]">{formatNum(loomsTotal)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#004D40]/70 uppercase">Fabric Checking</p>
                    <p className="text-2xl font-bold text-[#004D40]">{formatNum(fabricTotal)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#004D40]/70 uppercase">Delivered</p>
                    <p className="text-2xl font-bold text-[#004D40]">{formatNum(deliveryTotal)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                </div>

                {sections.map((section) => (
                  <div className="mb-4" key={section.title}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800">{section.title}</h3>
                      <span className="text-[13px] font-bold text-[#004D40]">
                        Total : {formatNum(section.totals[section.totals.length - 1])} kg
                      </span>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
                            {section.headers.map((h, i) => (
                              <TableHead
                                key={h}
                                className={`py-3 px-4 font-bold text-white whitespace-nowrap ${
                                  i === 0
                                    ? ''
                                    : i < section.labelColCount
                                      ? '!text-left'
                                      : i === section.headers.length - 1
                                        ? 'text-right'
                                        : '!text-right'
                                }`}
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {section.rows.map((row, ri) => (
                            <TableRow key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                              {row.labels.map((label, li) => (
                                <TableCell
                                  key={`l-${li}`}
                                  className={`py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap ${li === 0 ? 'font-semibold text-gray-800' : 'text-gray-600 !text-left'}`}
                                >
                                  {label}
                                </TableCell>
                              ))}
                              {row.values.map((v, vi) => (
                                <TableCell
                                  key={`v-${vi}`}
                                  className={`py-3 px-4 border-b border-gray-100 text-sm ${vi === row.values.length - 1 ? 'text-right font-bold text-gray-900' : '!text-right text-gray-600'}`}
                                >
                                  {formatNum(v)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="border-t-2 border-[#004D40] bg-emerald-50 hover:bg-emerald-50">
                            <TableCell colSpan={section.labelColCount} className="py-3 px-4 font-bold text-[#004D40]">Total</TableCell>
                            {section.totals.map((t, i) => (
                              <TableCell key={i} className={`py-3 px-4 font-bold text-[#004D40] ${i === section.totals.length - 1 ? 'text-right' : '!text-right'}`}>
                                {formatNum(t)}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 mt-4 pt-3 border-t border-gray-200 print:mt-auto">
              Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
