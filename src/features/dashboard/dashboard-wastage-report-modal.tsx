import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileDown, X } from 'lucide-react';

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

export interface WastageExtruderRow {
  color: string;
  lums: number;
  yarnWaste: number;
}

export interface WastageLoomsRow {
  color: string;
  loomsWaste: number;
}

export interface WastageFabricRow {
  color: string;
  fabricWaste: number;
  bitWaste: number;
}

export interface WastageExtruderLabelRow {
  label: string; // a size (e.g. "150cm") or a chemical name
  lums: number;
  yarnWaste: number;
}

export interface WastageLoomsLabelRow {
  label: string;
  loomsWaste: number;
}

export interface WastageFabricLabelRow {
  label: string;
  fabricWaste: number;
  bitWaste: number;
}

interface DashboardWastageReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  monthStr: string; // YYYY-MM
  extruderByColor: WastageExtruderRow[];
  extruderTotal: number;
  loomsByColor: WastageLoomsRow[];
  loomsTotal: number;
  fabricByColor: WastageFabricRow[];
  fabricTotal: number;
  extruderBySize: WastageExtruderLabelRow[];
  extruderByChemical: WastageExtruderLabelRow[];
  loomsBySize: WastageLoomsLabelRow[];
  loomsByChemical: WastageLoomsLabelRow[];
  fabricBySize: WastageFabricLabelRow[];
  fabricByChemical: WastageFabricLabelRow[];
}

export function DashboardWastageReportModal({
  open,
  onOpenChange,
  companyName,
  monthStr,
  extruderByColor,
  extruderTotal,
  loomsByColor,
  loomsTotal,
  fabricByColor,
  fabricTotal,
  extruderBySize,
  extruderByChemical,
  loomsBySize,
  loomsByChemical,
  fabricBySize,
  fabricByChemical,
}: DashboardWastageReportModalProps) {
  const hasData = extruderTotal > 0 || loomsTotal > 0 || fabricTotal > 0;
  const grandTotal = extruderTotal + loomsTotal + fabricTotal;

  const handleDownloadCSV = () => {
    if (!hasData) return;

    const rows: (string | number)[][] = [];
    rows.push(['Wastage Summary Report']);
    rows.push(['Company', companyName]);
    rows.push(['Period', getMonthName(monthStr)]);
    rows.push(['Generated On', new Date().toLocaleString('en-IN')]);
    rows.push([]);

    rows.push(['Extruder Wastage']);
    rows.push(['Color', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total']);
    extruderByColor.forEach((row) => rows.push([row.color, row.lums, row.yarnWaste, row.lums + row.yarnWaste]));
    rows.push(['Total', '', '', extruderTotal]);
    rows.push([]);

    if (extruderBySize.length > 0) {
      rows.push(['Extruder Wastage — By Size']);
      rows.push(['Size', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total']);
      extruderBySize.forEach((row) => rows.push([row.label, row.lums, row.yarnWaste, row.lums + row.yarnWaste]));
      rows.push(['Total', '', '', extruderBySize.reduce((s, r) => s + r.lums + r.yarnWaste, 0)]);
      rows.push([]);
    }

    if (extruderByChemical.length > 0) {
      rows.push(['Extruder Wastage — By Chemical']);
      rows.push(['Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total']);
      extruderByChemical.forEach((row) => rows.push([row.label, row.lums, row.yarnWaste, row.lums + row.yarnWaste]));
      rows.push(['Total', '', '', extruderByChemical.reduce((s, r) => s + r.lums + r.yarnWaste, 0)]);
      rows.push([]);
    }

    rows.push(['Looms Wastage']);
    rows.push(['Color', 'Looms/Yarn Waste (LW)']);
    loomsByColor.forEach((row) => rows.push([row.color, row.loomsWaste]));
    rows.push(['Total', loomsTotal]);
    rows.push([]);

    if (loomsBySize.length > 0) {
      rows.push(['Looms Wastage — By Size']);
      rows.push(['Size', 'Looms/Yarn Waste (LW)']);
      loomsBySize.forEach((row) => rows.push([row.label, row.loomsWaste]));
      rows.push(['Total', loomsBySize.reduce((s, r) => s + r.loomsWaste, 0)]);
      rows.push([]);
    }

    if (loomsByChemical.length > 0) {
      rows.push(['Looms Wastage — By Chemical']);
      rows.push(['Chemical', 'Looms/Yarn Waste (LW)']);
      loomsByChemical.forEach((row) => rows.push([row.label, row.loomsWaste]));
      rows.push(['Total', loomsByChemical.reduce((s, r) => s + r.loomsWaste, 0)]);
      rows.push([]);
    }

    rows.push(['Fabric Checking Wastage']);
    rows.push(['Color', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total']);
    fabricByColor.forEach((row) => rows.push([row.color, row.fabricWaste, row.bitWaste, row.fabricWaste + row.bitWaste]));
    rows.push(['Total', '', '', fabricTotal]);
    rows.push([]);

    if (fabricBySize.length > 0) {
      rows.push(['Fabric Checking Wastage — By Size']);
      rows.push(['Size', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total']);
      fabricBySize.forEach((row) => rows.push([row.label, row.fabricWaste, row.bitWaste, row.fabricWaste + row.bitWaste]));
      rows.push(['Total', '', '', fabricBySize.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0)]);
      rows.push([]);
    }

    if (fabricByChemical.length > 0) {
      rows.push(['Fabric Checking Wastage — By Chemical']);
      rows.push(['Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total']);
      fabricByChemical.forEach((row) => rows.push([row.label, row.fabricWaste, row.bitWaste, row.fabricWaste + row.bitWaste]));
      rows.push(['Total', '', '', fabricByChemical.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0)]);
    }

    const escapeCsvField = (value: string | number) => {
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csvContent = rows.map((r) => r.map(escapeCsvField).join(',')).join('\n');
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Wastage_Summary_Report_${monthStr}.csv`);
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
    doc.text('WASTAGE SUMMARY REPORT', 105, y, { align: 'center' });
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
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: TEAL_TINT, textColor: TEAL, fontStyle: 'bold' },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    };

    section(
      'Extruder Wastage',
      ['Color', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
      extruderByColor.map((row) => [row.color, formatNum(row.lums), formatNum(row.yarnWaste), formatNum(row.lums + row.yarnWaste)]),
      [['Total', '', '', formatNum(extruderTotal)]],
    );

    if (extruderBySize.length > 0) {
      section(
        'Extruder Wastage — By Size',
        ['Size', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
        extruderBySize.map((row) => [row.label, formatNum(row.lums), formatNum(row.yarnWaste), formatNum(row.lums + row.yarnWaste)]),
        [['Total', '', '', formatNum(extruderBySize.reduce((s, r) => s + r.lums + r.yarnWaste, 0))]],
      );
    }

    if (extruderByChemical.length > 0) {
      section(
        'Extruder Wastage — By Chemical',
        ['Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
        extruderByChemical.map((row) => [row.label, formatNum(row.lums), formatNum(row.yarnWaste), formatNum(row.lums + row.yarnWaste)]),
        [['Total', '', '', formatNum(extruderByChemical.reduce((s, r) => s + r.lums + r.yarnWaste, 0))]],
      );
    }

    section(
      'Looms Wastage',
      ['Color', 'Looms/Yarn Waste (LW)'],
      loomsByColor.map((row) => [row.color, formatNum(row.loomsWaste)]),
      [['Total', formatNum(loomsTotal)]],
    );

    if (loomsBySize.length > 0) {
      section(
        'Looms Wastage — By Size',
        ['Size', 'Looms/Yarn Waste (LW)'],
        loomsBySize.map((row) => [row.label, formatNum(row.loomsWaste)]),
        [['Total', formatNum(loomsBySize.reduce((s, r) => s + r.loomsWaste, 0))]],
      );
    }

    if (loomsByChemical.length > 0) {
      section(
        'Looms Wastage — By Chemical',
        ['Chemical', 'Looms/Yarn Waste (LW)'],
        loomsByChemical.map((row) => [row.label, formatNum(row.loomsWaste)]),
        [['Total', formatNum(loomsByChemical.reduce((s, r) => s + r.loomsWaste, 0))]],
      );
    }

    section(
      'Fabric Checking Wastage',
      ['Color', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
      fabricByColor.map((row) => [row.color, formatNum(row.fabricWaste), formatNum(row.bitWaste), formatNum(row.fabricWaste + row.bitWaste)]),
      [['Total', '', '', formatNum(fabricTotal)]],
    );

    if (fabricBySize.length > 0) {
      section(
        'Fabric Checking Wastage — By Size',
        ['Size', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
        fabricBySize.map((row) => [row.label, formatNum(row.fabricWaste), formatNum(row.bitWaste), formatNum(row.fabricWaste + row.bitWaste)]),
        [['Total', '', '', formatNum(fabricBySize.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0))]],
      );
    }

    if (fabricByChemical.length > 0) {
      section(
        'Fabric Checking Wastage — By Chemical',
        ['Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
        fabricByChemical.map((row) => [row.label, formatNum(row.fabricWaste), formatNum(row.bitWaste), formatNum(row.fabricWaste + row.bitWaste)]),
        [['Total', '', '', formatNum(fabricByChemical.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0))]],
      );
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 105, pageHeight - 10, { align: 'center' });

    doc.save(`Wastage_Summary_Report_${monthStr}.pdf`);
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
              Wastage Summary Report Overview
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
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white font-hanken" id="dashboard-wastage-report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                Wastage Summary Report
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Period: {getMonthName(monthStr)}
              </p>
            </div>

            {!hasData ? (
              <div className="text-center py-20 text-gray-500">
                No wastage recorded for this period.
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#004D40]/70 uppercase">Extruder Wastage</p>
                    <p className="text-2xl font-bold text-[#004D40]">{formatNum(extruderTotal)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#004D40]/70 uppercase">Looms Wastage</p>
                    <p className="text-2xl font-bold text-[#004D40]">{formatNum(loomsTotal)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#004D40]/70 uppercase">Fabric Checking Wastage</p>
                    <p className="text-2xl font-bold text-[#004D40]">{formatNum(fabricTotal)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                </div>

                {/* Extruder Wastage */}
                <ReportSection title="Extruder Wastage" total={`Total : ${formatNum(extruderTotal)} kg`}>
                  <ExtruderWastageTable labelHeader="Color" rows={extruderByColor.map((r) => ({ label: r.color, lums: r.lums, yarnWaste: r.yarnWaste }))} />
                  <p className="text-[11px] text-gray-500 italic px-4 py-2 border-t border-gray-100">LM - Lums Waste &nbsp;&nbsp; LO - Loose Waste</p>
                </ReportSection>

                {extruderBySize.length > 0 && (
                  <ReportSection title="Extruder Wastage — By Size" total={`Total : ${formatNum(extruderBySize.reduce((s, r) => s + r.lums + r.yarnWaste, 0))} kg`}>
                    <ExtruderWastageTable labelHeader="Size" rows={extruderBySize} />
                  </ReportSection>
                )}

                {extruderByChemical.length > 0 && (
                  <ReportSection title="Extruder Wastage — By Chemical" total={`Total : ${formatNum(extruderByChemical.reduce((s, r) => s + r.lums + r.yarnWaste, 0))} kg`}>
                    <ExtruderWastageTable labelHeader="Chemical" rows={extruderByChemical} />
                  </ReportSection>
                )}

                {/* Looms Wastage */}
                <ReportSection title="Looms Wastage" total={`Total : ${formatNum(loomsTotal)} kg`}>
                  <LoomsWastageTable labelHeader="Color" rows={loomsByColor.map((r) => ({ label: r.color, loomsWaste: r.loomsWaste }))} />
                  <p className="text-[11px] text-gray-500 italic px-4 py-2 border-t border-gray-100">LW - Looms/Yarn Waste</p>
                </ReportSection>

                {loomsBySize.length > 0 && (
                  <ReportSection title="Looms Wastage — By Size" total={`Total : ${formatNum(loomsBySize.reduce((s, r) => s + r.loomsWaste, 0))} kg`}>
                    <LoomsWastageTable labelHeader="Size" rows={loomsBySize} />
                  </ReportSection>
                )}

                {loomsByChemical.length > 0 && (
                  <ReportSection title="Looms Wastage — By Chemical" total={`Total : ${formatNum(loomsByChemical.reduce((s, r) => s + r.loomsWaste, 0))} kg`}>
                    <LoomsWastageTable labelHeader="Chemical" rows={loomsByChemical} />
                  </ReportSection>
                )}

                {/* Fabric Checking Wastage */}
                <ReportSection title="Fabric Checking Wastage" total={`Total : ${formatNum(fabricTotal)} kg`}>
                  <FabricWastageTable labelHeader="Color" rows={fabricByColor.map((r) => ({ label: r.color, fabricWaste: r.fabricWaste, bitWaste: r.bitWaste }))} />
                  <p className="text-[11px] text-gray-500 italic px-4 py-2 border-t border-gray-100">FW - Fabric Waste &nbsp;&nbsp; BW - Bit Waste</p>
                </ReportSection>

                {fabricBySize.length > 0 && (
                  <ReportSection title="Fabric Checking Wastage — By Size" total={`Total : ${formatNum(fabricBySize.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0))} kg`}>
                    <FabricWastageTable labelHeader="Size" rows={fabricBySize} />
                  </ReportSection>
                )}

                {fabricByChemical.length > 0 && (
                  <ReportSection title="Fabric Checking Wastage — By Chemical" total={`Total : ${formatNum(fabricByChemical.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0))} kg`}>
                    <FabricWastageTable labelHeader="Chemical" rows={fabricByChemical} />
                  </ReportSection>
                )}

                <div className="flex items-center justify-between bg-[#004D40] text-white rounded-lg p-4 mt-4">
                  <span className="font-bold uppercase text-sm tracking-wide">Grand Total Wastage</span>
                  <span className="font-bold text-xl">{formatNum(grandTotal)} kg</span>
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

function ExtruderWastageTable({ labelHeader, rows }: { labelHeader: string; rows: WastageExtruderLabelRow[] }) {
  const total = rows.reduce((s, r) => s + r.lums + r.yarnWaste, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap">{labelHeader}</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-right">Lums (LM)</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-right">Loose/Yarn (LO)</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.label}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-right">{formatNum(row.lums)}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-right">{formatNum(row.yarnWaste)}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-right font-bold text-gray-900">{formatNum(row.lums + row.yarnWaste)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="border-t-2 border-[#004D40] bg-emerald-50 hover:bg-emerald-50">
          <TableCell className="py-3 px-4 font-bold text-[#004D40]">Total</TableCell>
          <TableCell className="py-3 px-4"></TableCell>
          <TableCell className="py-3 px-4"></TableCell>
          <TableCell className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function LoomsWastageTable({ labelHeader, rows }: { labelHeader: string; rows: WastageLoomsLabelRow[] }) {
  const total = rows.reduce((s, r) => s + r.loomsWaste, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap">{labelHeader}</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Looms/Yarn Waste (LW)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.label}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-right font-bold text-gray-900">{formatNum(row.loomsWaste)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="border-t-2 border-[#004D40] bg-emerald-50 hover:bg-emerald-50">
          <TableCell className="py-3 px-4 font-bold text-[#004D40]">Total</TableCell>
          <TableCell className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function FabricWastageTable({ labelHeader, rows }: { labelHeader: string; rows: WastageFabricLabelRow[] }) {
  const total = rows.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap">{labelHeader}</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-right">Fabric Waste (FW)</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-right">Bit Waste (BW)</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.label}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-right">{formatNum(row.fabricWaste)}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-right">{formatNum(row.bitWaste)}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-right font-bold text-gray-900">{formatNum(row.fabricWaste + row.bitWaste)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="border-t-2 border-[#004D40] bg-emerald-50 hover:bg-emerald-50">
          <TableCell className="py-3 px-4 font-bold text-[#004D40]">Total</TableCell>
          <TableCell className="py-3 px-4"></TableCell>
          <TableCell className="py-3 px-4"></TableCell>
          <TableCell className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
