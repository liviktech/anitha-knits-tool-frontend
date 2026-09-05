import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileDown, X } from 'lucide-react';

const TEAL: [number, number, number] = [0, 77, 64]; // #004D40 — this app's primary accent
const TEAL_TINT: [number, number, number] = [232, 245, 240]; // light teal for footer/total rows
const FABRIC_STOCK_SIZES = ['150cm', '160cm', '170cm', '180cm', '190cm'] as const;

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMonthName(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export interface DashboardReportColorRow {
  color: string;
  production: number;
}

export interface DashboardReportBalanceRow {
  color: string;
  balance: number;
}

export interface DashboardReportStockRow {
  color: string;
  stockBySize: Record<string, number>;
}

export interface DashboardReportDelivery {
  id: string;
  date: string;
  size: string;
  kg: number;
}

export interface DashboardReportDeliveryRow {
  color: string;
  deliveries: DashboardReportDelivery[];
  total: number;
}

interface DashboardReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string; // "Production Summary Report" | "Sample Production Report"
  companyName: string;
  monthStr: string; // YYYY-MM
  extruderByColor: DashboardReportColorRow[];
  extruderTotal: number;
  loomsByColor: DashboardReportColorRow[];
  loomsTotal: number;
  fabricByColor: DashboardReportColorRow[];
  fabricTotal: number;
  yarnBalanceByColor: DashboardReportBalanceRow[];
  koraBalanceByColor: DashboardReportBalanceRow[];
  fabricStockByColor: DashboardReportStockRow[];
  totalFabricStock: number;
  deliveriesByColor: DashboardReportDeliveryRow[];
  totalDelivered: number;
}

export function DashboardReportModal({
  open,
  onOpenChange,
  reportTitle,
  companyName,
  monthStr,
  extruderByColor,
  extruderTotal,
  loomsByColor,
  loomsTotal,
  fabricByColor,
  fabricTotal,
  yarnBalanceByColor,
  koraBalanceByColor,
  fabricStockByColor,
  totalFabricStock,
  deliveriesByColor,
  totalDelivered,
}: DashboardReportModalProps) {
  const grandTotalProduction = extruderTotal + loomsTotal + fabricTotal;
  const hasData = extruderTotal > 0 || loomsTotal > 0 || fabricTotal > 0 || totalFabricStock > 0 || totalDelivered > 0;

  const handleDownloadCSV = () => {
    if (!hasData) return;

    const rows: (string | number)[][] = [];
    rows.push([reportTitle]);
    rows.push(['Company', companyName]);
    rows.push(['Period', getMonthName(monthStr)]);
    rows.push(['Generated On', new Date().toLocaleString('en-IN')]);
    rows.push([]);

    rows.push(['Production by Color']);
    rows.push(['Color', 'Extruder', 'Looms', 'Fabric Checking', 'Total']);
    extruderByColor.forEach((row, i) => {
      const loomsVal = loomsByColor[i]?.production ?? 0;
      const fabricVal = fabricByColor[i]?.production ?? 0;
      rows.push([row.color, row.production, loomsVal, fabricVal, row.production + loomsVal + fabricVal]);
    });
    rows.push(['Total', extruderTotal, loomsTotal, fabricTotal, grandTotalProduction]);
    rows.push([]);

    rows.push(['Yarn Balance']);
    rows.push(['Color', 'Balance (kg)']);
    yarnBalanceByColor.forEach((row) => rows.push([row.color, row.balance]));
    rows.push([]);

    rows.push(['Kora Balance']);
    rows.push(['Color', 'Balance (kg)']);
    koraBalanceByColor.forEach((row) => rows.push([row.color, row.balance]));
    rows.push([]);

    rows.push(['Fabric Stock']);
    rows.push(['Color', 'Size', 'Stock (kg)']);
    fabricStockByColor.forEach((row) => {
      FABRIC_STOCK_SIZES.forEach((size) => rows.push([row.color, size, row.stockBySize[size] || 0]));
    });
    rows.push(['Total Fabric Stock', '', totalFabricStock]);
    rows.push([]);

    rows.push(['Fabric Delivered']);
    rows.push(['Date', 'Color', 'Size', 'Weight (kg)']);
    deliveriesByColor.forEach((colorRow) => {
      colorRow.deliveries.forEach((d) => rows.push([new Date(d.date).toLocaleDateString('en-IN'), colorRow.color, d.size, d.kg]));
    });
    rows.push(['Total Fabric Delivered', '', '', totalDelivered]);

    const escapeCsvField = (value: string | number) => {
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csvContent = rows.map((r) => r.map(escapeCsvField).join(',')).join('\n');
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportTitle.replace(/\s+/g, '_')}_${monthStr}.csv`);
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

    section(
      'Production by Color',
      ['Color', 'Extruder', 'Looms', 'Fabric Checking', 'Total'],
      extruderByColor.map((row, i) => {
        const loomsVal = loomsByColor[i]?.production ?? 0;
        const fabricVal = fabricByColor[i]?.production ?? 0;
        return [row.color, formatNum(row.production), formatNum(loomsVal), formatNum(fabricVal), formatNum(row.production + loomsVal + fabricVal)];
      }),
      [['Total', formatNum(extruderTotal), formatNum(loomsTotal), formatNum(fabricTotal), formatNum(grandTotalProduction)]],
    );

    section('Yarn Balance', ['Color', 'Balance (kg)'], yarnBalanceByColor.map((row) => [row.color, formatNum(row.balance)]));
    section('Kora Balance', ['Color', 'Balance (kg)'], koraBalanceByColor.map((row) => [row.color, formatNum(row.balance)]));

    const fabricStockBody: (string | number)[][] = [];
    fabricStockByColor.forEach((row) => {
      FABRIC_STOCK_SIZES.forEach((size) => fabricStockBody.push([row.color, size, formatNum(row.stockBySize[size] || 0)]));
    });
    section('Fabric Stock', ['Color', 'Size', 'Stock (kg)'], fabricStockBody, [['Total Fabric Stock', '', formatNum(totalFabricStock)]]);

    const deliveredBody: (string | number)[][] = [];
    deliveriesByColor.forEach((colorRow) => {
      colorRow.deliveries.forEach((d) => deliveredBody.push([new Date(d.date).toLocaleDateString('en-IN'), colorRow.color, d.size, formatNum(d.kg)]));
    });
    section('Fabric Delivered', ['Date', 'Color', 'Size', 'Weight (kg)'], deliveredBody, [['Total Fabric Delivered', '', '', formatNum(totalDelivered)]]);

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
            one) so it shares the same flex row as Download CSV/PDF and always lines up with them. */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-[#A8DCAB] shrink-0 print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black">
              {reportTitle} Overview
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

                {/* Production by Color */}
                <ReportSection title="Production by Color" total={`Total : ${formatNum(grandTotalProduction)} kg`}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#004D40]">
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Color</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Extruder</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Looms</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Fabric Checking</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extruderByColor.map((row, i) => {
                        const loomsVal = loomsByColor[i]?.production ?? 0;
                        const fabricVal = fabricByColor[i]?.production ?? 0;
                        return (
                          <tr key={row.color} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.color}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-right text-gray-600">{formatNum(row.production)}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-right text-gray-600">{formatNum(loomsVal)}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-right text-gray-600">{formatNum(fabricVal)}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-right font-bold text-gray-900">{formatNum(row.production + loomsVal + fabricVal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#004D40] bg-emerald-50">
                        <td className="py-3 px-4 font-bold text-[#004D40]">Total</td>
                        <td className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(extruderTotal)}</td>
                        <td className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(loomsTotal)}</td>
                        <td className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(fabricTotal)}</td>
                        <td className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(grandTotalProduction)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </ReportSection>

                <ReportSection title="Yarn Balance" total={`Total : ${formatNum(yarnBalanceByColor.reduce((s, r) => s + r.balance, 0))} kg`}>
                  <BalanceTable rows={yarnBalanceByColor} />
                </ReportSection>

                <ReportSection title="Kora Balance" total={`Total : ${formatNum(koraBalanceByColor.reduce((s, r) => s + r.balance, 0))} kg`}>
                  <BalanceTable rows={koraBalanceByColor} />
                </ReportSection>

                <ReportSection title="Fabric Stock" total={`Total : ${formatNum(totalFabricStock)} kg`}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#004D40]">
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Color</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Size</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Stock (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fabricStockByColor.flatMap((row) =>
                        FABRIC_STOCK_SIZES.map((size) => (
                          <tr key={`${row.color}-${size}`}>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.color}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600">{size}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-right text-gray-900">{formatNum(row.stockBySize[size] || 0)}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#004D40] bg-emerald-50">
                        <td colSpan={2} className="py-3 px-4 font-bold text-[#004D40]">Total Fabric Stock</td>
                        <td className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(totalFabricStock)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </ReportSection>

                <ReportSection title="Fabric Delivered" total={`Total : ${formatNum(totalDelivered)} kg`}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#004D40]">
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Date</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Color</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Size</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveriesByColor.flatMap((colorRow) =>
                        colorRow.deliveries.map((d) => (
                          <tr key={d.id}>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600">{new Date(d.date).toLocaleDateString('en-IN')}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{colorRow.color}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600">{d.size}</td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-right text-gray-900">{formatNum(d.kg)}</td>
                          </tr>
                        )),
                      )}
                      {deliveriesByColor.every((c) => c.deliveries.length === 0) && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-500">No deliveries recorded for this period.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#004D40] bg-emerald-50">
                        <td colSpan={3} className="py-3 px-4 font-bold text-[#004D40]">Total Fabric Delivered</td>
                        <td className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(totalDelivered)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </ReportSection>
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

function BalanceTable({ rows }: { rows: DashboardReportBalanceRow[] }) {
  const total = rows.reduce((sum, r) => sum + r.balance, 0);
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-[#004D40]">
          <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Color</th>
          <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Balance (kg)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.color} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
            <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.color}</td>
            <td className="py-3 px-4 border-b border-gray-100 text-sm text-right text-gray-900">{formatNum(row.balance)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-[#004D40] bg-emerald-50">
          <td className="py-3 px-4 font-bold text-[#004D40]">Total</td>
          <td className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
