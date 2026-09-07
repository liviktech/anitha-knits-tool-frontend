import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileDown, X } from 'lucide-react';
import type {
  ExtruderProductionChemicalSummary,
  ExtruderProductionColorSummary,
  ExtruderProductionSizeSummary,
  FabricProductionChemicalSummary,
  FabricProductionColorSummary,
  FabricProductionSizeSummary,
  LoomsProductionChemicalSummary,
  LoomsProductionColorSummary,
  LoomsProductionSizeSummary,
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

export interface DeliveryBreakdownRow {
  label: string;
  delivered: number;
}

interface BreakdownRow {
  label: string;
  values: number[];
}

interface SampleProductionReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  monthStr: string; // YYYY-MM
  extruderByColor: ExtruderProductionColorSummary[];
  extruderBySize: ExtruderProductionSizeSummary[];
  extruderByChemical: ExtruderProductionChemicalSummary[];
  extruderTotal: number;
  loomsByColor: LoomsProductionColorSummary[];
  loomsBySize: LoomsProductionSizeSummary[];
  loomsByChemical: LoomsProductionChemicalSummary[];
  loomsTotal: number;
  fabricByColor: FabricProductionColorSummary[];
  fabricBySize: FabricProductionSizeSummary[];
  fabricByChemical: FabricProductionChemicalSummary[];
  fabricTotal: number;
  deliveryByColor: DeliveryBreakdownRow[];
  deliveryBySize: DeliveryBreakdownRow[];
  deliveryTotal: number;
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

export function SampleProductionReportModal({
  open,
  onOpenChange,
  companyName,
  monthStr,
  extruderByColor,
  extruderBySize,
  extruderByChemical,
  extruderTotal,
  loomsByColor,
  loomsBySize,
  loomsByChemical,
  loomsTotal,
  fabricByColor,
  fabricBySize,
  fabricByChemical,
  fabricTotal,
  deliveryByColor,
  deliveryBySize,
  deliveryTotal,
}: SampleProductionReportModalProps) {
  const sections: { title: string; labelHeader: string; columns: string[]; rows: BreakdownRow[] }[] = [
    { title: 'Extruder Production — By Color', labelHeader: 'Color', columns: EXTRUDER_COLUMNS, rows: extruderRows(extruderByColor, (i) => i.color.name) },
    { title: 'Extruder Production — By Size', labelHeader: 'Size', columns: EXTRUDER_COLUMNS, rows: extruderRows(extruderBySize, (i) => i.size.name) },
    { title: 'Extruder Production — By Chemical', labelHeader: 'Chemical', columns: EXTRUDER_COLUMNS, rows: extruderRows(extruderByChemical, (i) => i.chemical.name) },
    { title: 'Looms Production — By Color', labelHeader: 'Color', columns: LOOMS_COLUMNS, rows: loomsRows(loomsByColor, (i) => i.color.name) },
    { title: 'Looms Production — By Size', labelHeader: 'Size', columns: LOOMS_COLUMNS, rows: loomsRows(loomsBySize, (i) => i.size.name) },
    { title: 'Looms Production — By Chemical', labelHeader: 'Chemical', columns: LOOMS_COLUMNS, rows: loomsRows(loomsByChemical, (i) => i.chemical.name) },
    { title: 'Fabric Checking — By Color', labelHeader: 'Color', columns: FABRIC_COLUMNS, rows: fabricRows(fabricByColor, (i) => i.color.name) },
    { title: 'Fabric Checking — By Size', labelHeader: 'Size', columns: FABRIC_COLUMNS, rows: fabricRows(fabricBySize, (i) => i.size.name) },
    { title: 'Fabric Checking — By Chemical', labelHeader: 'Chemical', columns: FABRIC_COLUMNS, rows: fabricRows(fabricByChemical, (i) => i.chemical.name) },
    { title: 'Delivery — By Color', labelHeader: 'Color', columns: DELIVERY_COLUMNS, rows: deliveryRows(deliveryByColor) },
    { title: 'Delivery — By Size', labelHeader: 'Size', columns: DELIVERY_COLUMNS, rows: deliveryRows(deliveryBySize) },
  ].filter((s) => s.rows.length > 0);

  const hasData = sections.length > 0;

  const handleDownloadCSV = () => {
    if (!hasData) return;

    const escapeCsvField = (value: string | number) => {
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvRows: (string | number)[][] = [];
    csvRows.push(['Sample Production Report']);
    csvRows.push(['Company', companyName]);
    csvRows.push(['Period', getMonthName(monthStr)]);
    csvRows.push(['Generated On', new Date().toLocaleString('en-IN')]);
    csvRows.push([]);

    for (const section of sections) {
      csvRows.push([section.title]);
      csvRows.push([section.labelHeader, ...section.columns]);
      section.rows.forEach((row) => csvRows.push([row.label, ...row.values]));
      csvRows.push(['Total', ...columnTotals(section.rows, section.columns.length)]);
      csvRows.push([]);
    }

    const csvContent = csvRows.map((r) => r.map(escapeCsvField).join(',')).join('\n');
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sample_Production_Report_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    doc.text('SAMPLE PRODUCTION REPORT', 105, y, { align: 'center' });
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
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 105, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`Sample_Production_Report_${monthStr}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-4xl sm:max-w-4xl max-h-[85vh] flex flex-col p-0 border border-gray-300 overflow-hidden bg-white print:max-w-none print:h-auto print:border-none">
        {/* Modal Header (Not printed) */}
        {/* Close button rendered in-flow here (not DialogContent's default absolutely-positioned
            one) so it shares the same flex row as Download CSV/PDF and always lines up with them. */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-[#A8DCAB] shrink-0 print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black">
              Sample Production Report Overview
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={!hasData} className="gap-2 bg-white border-[#004D40] text-[#004D40] hover:bg-[#004D40]/10">
                <FileDown className="w-4 h-4" /> Download PDF
              </Button>
              <Button size="sm" onClick={handleDownloadCSV} disabled={!hasData} className="gap-2 bg-[#004D40] hover:bg-[#00382e] text-white">
                <Download className="w-4 h-4" /> Download CSV
              </Button>
              <DialogClose asChild>
                <Button size="icon-sm" className="bg-red-700 text-white hover:bg-red-400 focus-visible:ring-red-400">
                  <X className="w-4 h-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Report Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white" id="sample-production-report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                Sample Production Report
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Period: {getMonthName(monthStr)}
              </p>
            </div>

            {!hasData ? (
              <div className="text-center py-20 text-gray-500">
                No sample production records found for this period.
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

                {sections.map((section) => {
                  const totals = columnTotals(section.rows, section.columns.length);
                  return (
                    <div className="mb-4" key={section.title}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-800">{section.title}</h3>
                        <span className="text-[13px] font-bold text-[#004D40]">
                          Total : {formatNum(totals[totals.length - 1])} kg
                        </span>
                      </div>
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
                              <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap">{section.labelHeader}</TableHead>
                              {section.columns.map((col, i) => (
                                <TableHead key={col} className={`py-3 px-4 font-bold text-white whitespace-nowrap ${i === section.columns.length - 1 ? 'text-right' : '!text-right'}`}>
                                  {col}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {section.rows.map((row, ri) => (
                              <TableRow key={row.label} className={ri % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                                <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.label}</TableCell>
                                {row.values.map((v, ci) => (
                                  <TableCell
                                    key={ci}
                                    className={`py-3 px-4 border-b border-gray-100 text-sm ${ci === row.values.length - 1 ? 'text-right font-bold text-gray-900' : '!text-right text-gray-600'}`}
                                  >
                                    {formatNum(v)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow className="border-t-2 border-[#004D40] bg-emerald-50 hover:bg-emerald-50">
                              <TableCell className="py-3 px-4 font-bold text-[#004D40]">Total</TableCell>
                              {totals.map((t, i) => (
                                <TableCell key={i} className={`py-3 px-4 font-bold text-[#004D40] ${i === totals.length - 1 ? 'text-right' : '!text-right'}`}>
                                  {formatNum(t)}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    </div>
                  );
                })}
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
