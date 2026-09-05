import { Fragment } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileDown, X } from 'lucide-react';

const TEAL: [number, number, number] = [0, 77, 64]; // #004D40 — this app's primary accent

// Per-stage accents — same colors already used on the Sample Production page's own
// day-wise table header groups, so the report visually matches the screen it summarizes.
const STAGE_COLORS = {
  extruder: { bg: [214, 238, 247] as [number, number, number], fg: [11, 85, 102] as [number, number, number], hex: '#D6EEF7', fgHex: '#0B5566' },
  looms: { bg: [255, 246, 191] as [number, number, number], fg: [122, 106, 0] as [number, number, number], hex: '#FFF6BF', fgHex: '#7A6A00' },
  fabric: { bg: [220, 238, 219] as [number, number, number], fg: [47, 107, 47] as [number, number, number], hex: '#DCEEDB', fgHex: '#2F6B2F' },
  delivered: { bg: [242, 202, 160] as [number, number, number], fg: [97, 64, 30] as [number, number, number], hex: '#f2caa0', fgHex: '#61401E' },
};

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMonthName(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export interface SampleReportStageTotals {
  input: number;
  wastage: number;
  output: number;
}

export interface SampleReportRow {
  date: string;
  extruder: SampleReportStageTotals;
  looms: SampleReportStageTotals;
  fabric: SampleReportStageTotals;
  delivered: SampleReportStageTotals & { colors: Set<string> | string[] };
}

interface SampleProductionReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthStr: string; // YYYY-MM
  rows: SampleReportRow[];
  totals: {
    extruder: SampleReportStageTotals;
    looms: SampleReportStageTotals;
    fabric: SampleReportStageTotals;
    delivered: SampleReportStageTotals;
  };
}

export function SampleProductionReportModal({ open, onOpenChange, monthStr, rows, totals }: SampleProductionReportModalProps) {
  const hasData = rows.length > 0;

  const colorLabel = (row: SampleReportRow) => {
    const colors = Array.from(row.delivered.colors ?? []);
    return colors.length > 1 ? 'Mixed' : (colors[0] || '-');
  };

  const handleDownloadCSV = () => {
    if (!hasData) return;

    const headers = [
      'Date',
      'Extruder Input', 'Extruder Wastage', 'Extruder Output',
      'Looms Input', 'Looms Wastage', 'Looms Output',
      'Fabric Input', 'Fabric Wastage', 'Fabric Output',
      'Delivered Input', 'Delivered Color', 'Delivered Output',
    ];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      csvRows.push([
        format(parseISO(row.date), 'dd/MM/yyyy'),
        row.extruder.input, row.extruder.wastage, row.extruder.output,
        row.looms.input, row.looms.wastage, row.looms.output,
        row.fabric.input, row.fabric.wastage, row.fabric.output,
        row.delivered.input, `"${colorLabel(row)}"`, row.delivered.output,
      ].join(','));
    }
    csvRows.push([
      'TOTAL',
      totals.extruder.input, totals.extruder.wastage, totals.extruder.output,
      totals.looms.input, totals.looms.wastage, totals.looms.output,
      totals.fabric.input, totals.fabric.wastage, totals.fabric.output,
      totals.delivered.input, '', totals.delivered.output,
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
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

    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEAL);
    doc.text('ANITHA KNITS', 148, 16, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('SAMPLE PRODUCTION REPORT', 148, 23, { align: 'center' });
    doc.text(`Period: ${getMonthName(monthStr)}`, 148, 29, { align: 'center' });

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(14, 33, 283, 33);

    autoTable(doc, {
      startY: 39,
      margin: { left: 14, right: 14 },
      head: [[
        'Date',
        'Extruder Input', 'Extruder Wastage', 'Extruder Output',
        'Looms Input', 'Looms Wastage', 'Looms Output',
        'Fabric Input', 'Fabric Wastage', 'Fabric Output',
        'Delivered Input', 'Delivered Color', 'Delivered Output',
      ]],
      body: rows.map((row) => [
        format(parseISO(row.date), 'dd/MM/yyyy'),
        formatNum(row.extruder.input), formatNum(row.extruder.wastage), formatNum(row.extruder.output),
        formatNum(row.looms.input), formatNum(row.looms.wastage), formatNum(row.looms.output),
        formatNum(row.fabric.input), formatNum(row.fabric.wastage), formatNum(row.fabric.output),
        formatNum(row.delivered.input), colorLabel(row), formatNum(row.delivered.output),
      ]),
      foot: [[
        'TOTAL',
        formatNum(totals.extruder.input), formatNum(totals.extruder.wastage), formatNum(totals.extruder.output),
        formatNum(totals.looms.input), formatNum(totals.looms.wastage), formatNum(totals.looms.output),
        formatNum(totals.fabric.input), formatNum(totals.fabric.wastage), formatNum(totals.fabric.output),
        formatNum(totals.delivered.input), '', formatNum(totals.delivered.output),
      ]],
      styles: { fontSize: 7.5, cellPadding: 2, halign: 'right' },
      columnStyles: { 0: { halign: 'left' }, 11: { halign: 'center' } },
      footStyles: { fillColor: [240, 240, 240], textColor: 30, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.section !== 'head') return;
        const idx = data.column.index;
        const stage =
          idx >= 1 && idx <= 3 ? STAGE_COLORS.extruder :
          idx >= 4 && idx <= 6 ? STAGE_COLORS.looms :
          idx >= 7 && idx <= 9 ? STAGE_COLORS.fabric :
          idx >= 10 && idx <= 12 ? STAGE_COLORS.delivered :
          null;
        if (stage) {
          data.cell.styles.fillColor = stage.bg;
          data.cell.styles.textColor = stage.fg;
        }
      },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`,
      148,
      pageHeight - 10,
      { align: 'center' },
    );

    doc.save(`Sample_Production_Report_${monthStr}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-6xl sm:max-w-6xl max-h-[85vh] flex flex-col p-0 border border-gray-300 overflow-hidden bg-white print:max-w-none print:h-auto print:border-none">
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
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white font-hanken" id="sample-production-report-printable-area">
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
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg p-4 border" style={{ backgroundColor: `${STAGE_COLORS.extruder.hex}55`, borderColor: STAGE_COLORS.extruder.hex }}>
                    <p className="text-xs font-semibold uppercase" style={{ color: STAGE_COLORS.extruder.fgHex }}>Extruder Production</p>
                    <p className="text-2xl font-bold" style={{ color: STAGE_COLORS.extruder.fgHex }}>{formatNum(totals.extruder.output)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div className="rounded-lg p-4 border" style={{ backgroundColor: `${STAGE_COLORS.looms.hex}55`, borderColor: STAGE_COLORS.looms.hex }}>
                    <p className="text-xs font-semibold uppercase" style={{ color: STAGE_COLORS.looms.fgHex }}>Looms Production</p>
                    <p className="text-2xl font-bold" style={{ color: STAGE_COLORS.looms.fgHex }}>{formatNum(totals.looms.output)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div className="rounded-lg p-4 border" style={{ backgroundColor: `${STAGE_COLORS.fabric.hex}55`, borderColor: STAGE_COLORS.fabric.hex }}>
                    <p className="text-xs font-semibold uppercase" style={{ color: STAGE_COLORS.fabric.fgHex }}>Fabric Production</p>
                    <p className="text-2xl font-bold" style={{ color: STAGE_COLORS.fabric.fgHex }}>{formatNum(totals.fabric.output)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                </div>

                {/* Data Table */}
                <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="py-2 px-3 font-bold text-gray-800 bg-white align-bottom whitespace-nowrap">Date</th>
                        <th colSpan={3} className="py-2 px-3 font-bold text-center whitespace-nowrap" style={{ backgroundColor: STAGE_COLORS.extruder.hex, color: STAGE_COLORS.extruder.fgHex }}>Extruder</th>
                        <th colSpan={3} className="py-2 px-3 font-bold text-center whitespace-nowrap" style={{ backgroundColor: STAGE_COLORS.looms.hex, color: STAGE_COLORS.looms.fgHex }}>Looms</th>
                        <th colSpan={3} className="py-2 px-3 font-bold text-center whitespace-nowrap" style={{ backgroundColor: STAGE_COLORS.fabric.hex, color: STAGE_COLORS.fabric.fgHex }}>Fabric</th>
                        <th colSpan={3} className="py-2 px-3 font-bold text-center whitespace-nowrap" style={{ backgroundColor: STAGE_COLORS.delivered.hex, color: STAGE_COLORS.delivered.fgHex }}>Delivered</th>
                      </tr>
                      <tr>
                        {(['extruder', 'looms', 'fabric'] as const).map((stage) => (
                          <Fragment key={stage}>
                            <th className="py-1.5 px-2 text-[11px] font-bold text-center whitespace-nowrap" style={{ backgroundColor: `${STAGE_COLORS[stage].hex}80`, color: STAGE_COLORS[stage].fgHex }}>Input</th>
                            <th className="py-1.5 px-2 text-[11px] font-bold text-center whitespace-nowrap" style={{ backgroundColor: `${STAGE_COLORS[stage].hex}80`, color: STAGE_COLORS[stage].fgHex }}>Wastage</th>
                            <th className="py-1.5 px-2 text-[11px] font-bold text-center whitespace-nowrap" style={{ backgroundColor: `${STAGE_COLORS[stage].hex}80`, color: STAGE_COLORS[stage].fgHex }}>Output</th>
                          </Fragment>
                        ))}
                        <th className="py-1.5 px-2 text-[11px] font-bold text-center whitespace-nowrap" style={{ backgroundColor: `${STAGE_COLORS.delivered.hex}80`, color: STAGE_COLORS.delivered.fgHex }}>Input</th>
                        <th className="py-1.5 px-2 text-[11px] font-bold text-center whitespace-nowrap" style={{ backgroundColor: `${STAGE_COLORS.delivered.hex}80`, color: STAGE_COLORS.delivered.fgHex }}>Color</th>
                        <th className="py-1.5 px-2 text-[11px] font-bold text-center whitespace-nowrap" style={{ backgroundColor: `${STAGE_COLORS.delivered.hex}80`, color: STAGE_COLORS.delivered.fgHex }}>Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={row.date} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm font-semibold whitespace-nowrap text-gray-800">
                            {format(parseISO(row.date), 'dd MMM yyyy')}
                          </td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center text-gray-600">{formatNum(row.extruder.input)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center text-gray-600">{formatNum(row.extruder.wastage)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center font-semibold text-gray-800">{formatNum(row.extruder.output)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center text-gray-600">{formatNum(row.looms.input)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center text-gray-600">{formatNum(row.looms.wastage)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center font-semibold text-gray-800">{formatNum(row.looms.output)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center text-gray-600">{formatNum(row.fabric.input)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center text-gray-600">{formatNum(row.fabric.wastage)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center font-semibold text-gray-800">{formatNum(row.fabric.output)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center text-gray-600">{formatNum(row.delivered.input)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center text-gray-600">{colorLabel(row)}</td>
                          <td className="py-2 px-3 border-b border-gray-100 text-sm text-center font-semibold text-gray-800">{formatNum(row.delivered.output)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#004D40] bg-emerald-50 font-bold text-[#004D40]">
                        <td className="py-3 px-3">Total</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.extruder.input)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.extruder.wastage)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.extruder.output)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.looms.input)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.looms.wastage)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.looms.output)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.fabric.input)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.fabric.wastage)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.fabric.output)}</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.delivered.input)}</td>
                        <td className="py-3 px-3 text-center">-</td>
                        <td className="py-3 px-3 text-center">{formatNum(totals.delivered.output)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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
