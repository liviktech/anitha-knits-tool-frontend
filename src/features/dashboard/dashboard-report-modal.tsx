import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, X } from 'lucide-react';

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

// One color's value, broken down by chemical and (within each chemical) by size — the raw shape
// already built for the on-screen detail cards. Every section's table is derived by flattening
// this into individual size+color+chemical rows, so a combination with no recorded value never
// shows up as a zero row — it's simply absent.
export interface DashboardReportDetailRow {
  color: string;
  chemicals: { chemical: string; production: number; sizes: { size: string; production: number }[] }[];
}

interface VariantRow {
  size: string;
  color: string;
  chemical: string;
  weight: number;
}

function flattenToVariantRows(rows: DashboardReportDetailRow[]): VariantRow[] {
  const out: VariantRow[] = [];
  rows.forEach((row) => {
    row.chemicals.forEach((chem) => {
      chem.sizes.forEach((s) => {
        if (s.production > 0) {
          out.push({ size: s.size, color: row.color, chemical: chem.chemical, weight: s.production });
        }
      });
    });
  });
  return out.sort((a, b) =>
    a.size.localeCompare(b.size) || a.color.localeCompare(b.color) || a.chemical.localeCompare(b.chemical),
  );
}

interface DashboardReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string; // "Production Summary Report" | "Sample Production Report"
  monthStr: string; // YYYY-MM
  extruderDetail: DashboardReportDetailRow[];
  extruderTotal: number;
  loomsDetail: DashboardReportDetailRow[];
  loomsTotal: number;
  fabricDetail: DashboardReportDetailRow[];
  fabricTotal: number;
  yarnBalanceDetail: DashboardReportDetailRow[];
  koraBalanceDetail: DashboardReportDetailRow[];
  fabricStockDetail: DashboardReportDetailRow[];
  fabricDeliveredDetail: DashboardReportDetailRow[];
}

export function DashboardReportModal({
  open,
  onOpenChange,
  reportTitle,
  monthStr,
  extruderDetail,
  extruderTotal,
  loomsDetail,
  loomsTotal,
  fabricDetail,
  fabricTotal,
  yarnBalanceDetail,
  koraBalanceDetail,
  fabricStockDetail,
  fabricDeliveredDetail,
}: DashboardReportModalProps) {
  const extruderRows = flattenToVariantRows(extruderDetail);
  const loomsRows = flattenToVariantRows(loomsDetail);
  const fabricRows = flattenToVariantRows(fabricDetail);
  const yarnBalanceRows = flattenToVariantRows(yarnBalanceDetail);
  const koraBalanceRows = flattenToVariantRows(koraBalanceDetail);
  const fabricStockRows = flattenToVariantRows(fabricStockDetail);
  const fabricDeliveredRows = flattenToVariantRows(fabricDeliveredDetail);

  const hasData = extruderRows.length > 0 || loomsRows.length > 0 || fabricRows.length > 0
    || yarnBalanceRows.length > 0 || koraBalanceRows.length > 0 || fabricStockRows.length > 0 || fabricDeliveredRows.length > 0;

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
    doc.text(reportTitle.toUpperCase(), 105, y, { align: 'center' });
    y += 7;
    doc.text(`Period: ${getMonthName(monthStr)}`, 105, y, { align: 'center' });
    y += 5;

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(14, y, 196, y);
    y += 8;

    const section = (title: string, head: string[], body: (string | number)[][], foot?: (string | number)[][]) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEAL);
      doc.text(title, 14, y);
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

    const variantSection = (title: string, rows: VariantRow[], valueHeader: string) => {
      if (rows.length === 0) return;
      const total = rows.reduce((s, r) => s + r.weight, 0);
      section(
        title,
        ['Size', 'Color', 'Chemical', valueHeader],
        rows.map((r) => [r.size, r.color, r.chemical, formatNum(r.weight)]),
        [['Total', '', '', formatNum(total)]],
      );
    };

    variantSection('Extruder Production', extruderRows, 'Weight (kg)');
    variantSection('Looms Production', loomsRows, 'Weight (kg)');
    variantSection('Fabric Checking', fabricRows, 'Weight (kg)');
    variantSection('Yarn Balance', yarnBalanceRows, 'Balance (kg)');
    variantSection('Kora Balance', koraBalanceRows, 'Balance (kg)');
    variantSection('Fabric Stock', fabricStockRows, 'Stock (kg)');
    variantSection('Fabric Delivered', fabricDeliveredRows, 'Weight (kg)');

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 105, pageHeight - 10, { align: 'center' });

    doc.save(`${reportTitle.replace(/\s+/g, '_')}_${monthStr}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-5xl sm:max-w-5xl max-h-[85vh] flex flex-col p-0 border border-gray-300 overflow-hidden bg-white print:max-w-none print:h-auto print:border-none">
        {/* Modal Header (Not printed) */}
        {/* Close button rendered in-flow here (not DialogContent's default absolutely-positioned
            one) so it shares the same flex row as Download PDF and always lines up with it. */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-[#A8DCAB] shrink-0 print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black">
              {reportTitle} Overview
            </DialogTitle>
            <div className="flex items-center gap-3">
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
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white font-hanken" id="dashboard-report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                {reportTitle}
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Period: {getMonthName(monthStr)}
              </p>
            </div>

            {!hasData ? (
              <div className="text-center py-20 text-gray-500">
                No production data found for this period.
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
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
                </div>

                {extruderRows.length > 0 && (
                  <ReportSection title="Extruder Production" total={`Total : ${formatNum(extruderRows.reduce((s, r) => s + r.weight, 0))} kg`}>
                    <VariantTable rows={extruderRows} valueHeader="Weight (kg)" />
                  </ReportSection>
                )}

                {loomsRows.length > 0 && (
                  <ReportSection title="Looms Production" total={`Total : ${formatNum(loomsRows.reduce((s, r) => s + r.weight, 0))} kg`}>
                    <VariantTable rows={loomsRows} valueHeader="Weight (kg)" />
                  </ReportSection>
                )}

                {fabricRows.length > 0 && (
                  <ReportSection title="Fabric Checking" total={`Total : ${formatNum(fabricRows.reduce((s, r) => s + r.weight, 0))} kg`}>
                    <VariantTable rows={fabricRows} valueHeader="Weight (kg)" />
                  </ReportSection>
                )}

                {yarnBalanceRows.length > 0 && (
                  <ReportSection title="Yarn Balance" total={`Total : ${formatNum(yarnBalanceRows.reduce((s, r) => s + r.weight, 0))} kg`}>
                    <VariantTable rows={yarnBalanceRows} valueHeader="Balance (kg)" />
                  </ReportSection>
                )}

                {koraBalanceRows.length > 0 && (
                  <ReportSection title="Kora Balance" total={`Total : ${formatNum(koraBalanceRows.reduce((s, r) => s + r.weight, 0))} kg`}>
                    <VariantTable rows={koraBalanceRows} valueHeader="Balance (kg)" />
                  </ReportSection>
                )}

                {fabricStockRows.length > 0 && (
                  <ReportSection title="Fabric Stock" total={`Total : ${formatNum(fabricStockRows.reduce((s, r) => s + r.weight, 0))} kg`}>
                    <VariantTable rows={fabricStockRows} valueHeader="Stock (kg)" />
                  </ReportSection>
                )}

                {fabricDeliveredRows.length > 0 && (
                  <ReportSection title="Fabric Delivered" total={`Total : ${formatNum(fabricDeliveredRows.reduce((s, r) => s + r.weight, 0))} kg`}>
                    <VariantTable rows={fabricDeliveredRows} valueHeader="Weight (kg)" />
                  </ReportSection>
                )}
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

function ReportSection({ title, total, children }: { title: string; total: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <span className="text-[13px] font-bold text-[#004D40]">{total}</span>
      </div>
      <div className="rounded-lg overflow-hidden border border-gray-200">
        {children}
      </div>
    </div>
  );
}

function VariantTable({ rows, valueHeader }: { rows: VariantRow[]; valueHeader: string }) {
  const total = rows.reduce((sum, r) => sum + r.weight, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap">Size</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-left">Color</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-left">Chemical</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">{valueHeader}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={`${row.size}-${row.color}-${row.chemical}`} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.size}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-left">{row.color}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-left">{row.chemical}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-bold text-gray-900 text-right">{formatNum(row.weight)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="border-t-2 border-[#004D40] bg-emerald-50 hover:bg-emerald-50">
          <TableCell colSpan={3} className="py-3 px-4 font-bold text-[#004D40]">Total</TableCell>
          <TableCell className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
