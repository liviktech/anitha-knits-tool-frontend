import { useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, FileSpreadsheet, Loader2, X } from 'lucide-react';

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

// One color's wastage, broken down by chemical and (within each chemical) by size — the raw
// shape already built for the on-screen wastage cards (every size present, zeroed where there's
// no record). Each report table is derived by flattening this into individual size+color+
// chemical rows and dropping any combination with nothing recorded, so it never shows as a
// zero row.
export interface WastageDetailRow {
  color: string;
  chemicals: {
    chemical: string;
    sizes: { size: string; lums: number; yarnWaste: number; loomsWaste: number; fabricWaste: number; bitWaste: number }[];
  }[];
}

interface ExtruderWasteVariantRow {
  size: string;
  color: string;
  chemical: string;
  lums: number;
  yarnWaste: number;
}

interface LoomsWasteVariantRow {
  size: string;
  color: string;
  chemical: string;
  loomsWaste: number;
}

interface FabricWasteVariantRow {
  size: string;
  color: string;
  chemical: string;
  fabricWaste: number;
  bitWaste: number;
}

function sortVariants<T extends { size: string; color: string; chemical: string }>(rows: T[]): T[] {
  return rows.sort((a, b) => a.size.localeCompare(b.size) || a.color.localeCompare(b.color) || a.chemical.localeCompare(b.chemical));
}

function flattenExtruderWaste(rows: WastageDetailRow[]): ExtruderWasteVariantRow[] {
  const out: ExtruderWasteVariantRow[] = [];
  rows.forEach((row) => row.chemicals.forEach((chem) => chem.sizes.forEach((s) => {
    if (s.lums > 0 || s.yarnWaste > 0) {
      out.push({ size: s.size, color: row.color, chemical: chem.chemical, lums: s.lums, yarnWaste: s.yarnWaste });
    }
  })));
  return sortVariants(out);
}

function flattenLoomsWaste(rows: WastageDetailRow[]): LoomsWasteVariantRow[] {
  const out: LoomsWasteVariantRow[] = [];
  rows.forEach((row) => row.chemicals.forEach((chem) => chem.sizes.forEach((s) => {
    if (s.loomsWaste > 0) {
      out.push({ size: s.size, color: row.color, chemical: chem.chemical, loomsWaste: s.loomsWaste });
    }
  })));
  return sortVariants(out);
}

function flattenFabricWaste(rows: WastageDetailRow[]): FabricWasteVariantRow[] {
  const out: FabricWasteVariantRow[] = [];
  rows.forEach((row) => row.chemicals.forEach((chem) => chem.sizes.forEach((s) => {
    if (s.fabricWaste > 0 || s.bitWaste > 0) {
      out.push({ size: s.size, color: row.color, chemical: chem.chemical, fabricWaste: s.fabricWaste, bitWaste: s.bitWaste });
    }
  })));
  return sortVariants(out);
}

interface DashboardWastageReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthStr: string; // YYYY-MM
  extruderDetail: WastageDetailRow[];
  extruderTotal: number;
  loomsDetail: WastageDetailRow[];
  loomsTotal: number;
  fabricDetail: WastageDetailRow[];
  fabricTotal: number;
}

export function DashboardWastageReportModal({
  open,
  onOpenChange,
  monthStr,
  extruderDetail,
  extruderTotal,
  loomsDetail,
  loomsTotal,
  fabricDetail,
  fabricTotal,
}: DashboardWastageReportModalProps) {
  const extruderRows = flattenExtruderWaste(extruderDetail);
  const loomsRows = flattenLoomsWaste(loomsDetail);
  const fabricRows = flattenFabricWaste(fabricDetail);

  const hasData = extruderRows.length > 0 || loomsRows.length > 0 || fabricRows.length > 0;
  const grandTotal = extruderTotal + loomsTotal + fabricTotal;
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

    if (extruderRows.length > 0) {
      const total = extruderRows.reduce((s, r) => s + r.lums + r.yarnWaste, 0);
      section(
        'Extruder Wastage',
        ['Size', 'Color', 'Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total'],
        extruderRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.lums), formatNum(r.yarnWaste), formatNum(r.lums + r.yarnWaste)]),
        [['Total', '', '', '', '', formatNum(total)]],
      );
    }

    if (loomsRows.length > 0) {
      const total = loomsRows.reduce((s, r) => s + r.loomsWaste, 0);
      section(
        'Looms Wastage',
        ['Size', 'Color', 'Chemical', 'Looms/Yarn Waste (LW)'],
        loomsRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.loomsWaste)]),
        [['Total', '', '', formatNum(total)]],
      );
    }

    if (fabricRows.length > 0) {
      const total = fabricRows.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0);
      section(
        'Fabric Checking Wastage',
        ['Size', 'Color', 'Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total'],
        fabricRows.map((r) => [r.size, r.color, r.chemical, formatNum(r.fabricWaste), formatNum(r.bitWaste), formatNum(r.fabricWaste + r.bitWaste)]),
        [['Total', '', '', '', '', formatNum(total)]],
      );
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 105, pageHeight - 10, { align: 'center' });

    doc.save(`Wastage_Summary_Report_${monthStr}.pdf`);
  };

  const handleDownloadXlsx = async () => {
    if (!hasData) return;
    setIsGeneratingXlsx(true);
    try {
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();
      const wsData: any[][] = [];

      if (extruderRows.length > 0) {
        const total = extruderRows.reduce((s, r) => s + r.lums + r.yarnWaste, 0);
        wsData.push(['Extruder Wastage']);
        wsData.push(['Size', 'Color', 'Chemical', 'Lums (LM)', 'Loose/Yarn (LO)', 'Total']);
        extruderRows.forEach((r) => wsData.push([r.size, r.color, r.chemical, r.lums, r.yarnWaste, r.lums + r.yarnWaste]));
        wsData.push(['Total', '', '', '', '', total]);
        wsData.push([]);
      }

      if (loomsRows.length > 0) {
        const total = loomsRows.reduce((s, r) => s + r.loomsWaste, 0);
        wsData.push(['Looms Wastage']);
        wsData.push(['Size', 'Color', 'Chemical', 'Looms/Yarn Waste (LW)']);
        loomsRows.forEach((r) => wsData.push([r.size, r.color, r.chemical, r.loomsWaste]));
        wsData.push(['Total', '', '', total]);
        wsData.push([]);
      }

      if (fabricRows.length > 0) {
        const total = fabricRows.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0);
        wsData.push(['Fabric Checking Wastage']);
        wsData.push(['Size', 'Color', 'Chemical', 'Fabric Waste (FW)', 'Bit Waste (BW)', 'Total']);
        fabricRows.forEach((r) => wsData.push([r.size, r.color, r.chemical, r.fabricWaste, r.bitWaste, r.fabricWaste + r.bitWaste]));
        wsData.push(['Total', '', '', '', '', total]);
        wsData.push([]);
      }

      wsData.push(['Grand Total Wastage', '', '', '', '', grandTotal]);

      const ws = utils.aoa_to_sheet(wsData);
      utils.book_append_sheet(wb, ws, 'Wastage Summary');

      writeFile(wb, `Wastage_Summary_Report_${monthStr}.xlsx`);
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
              Wastage Summary Report Overview
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

                {extruderRows.length > 0 && (
                  <ReportSection title="Extruder Wastage" total={`Total : ${formatNum(extruderRows.reduce((s, r) => s + r.lums + r.yarnWaste, 0))} kg`}>
                    <ExtruderWastageTable rows={extruderRows} />
                    <p className="text-[11px] text-gray-500 italic px-4 py-2 border-t border-gray-100">LM - Lums Waste &nbsp;&nbsp; LO - Loose Waste</p>
                  </ReportSection>
                )}

                {loomsRows.length > 0 && (
                  <ReportSection title="Looms Wastage" total={`Total : ${formatNum(loomsRows.reduce((s, r) => s + r.loomsWaste, 0))} kg`}>
                    <LoomsWastageTable rows={loomsRows} />
                    <p className="text-[11px] text-gray-500 italic px-4 py-2 border-t border-gray-100">LW - Looms/Yarn Waste</p>
                  </ReportSection>
                )}

                {fabricRows.length > 0 && (
                  <ReportSection title="Fabric Checking Wastage" total={`Total : ${formatNum(fabricRows.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0))} kg`}>
                    <FabricWastageTable rows={fabricRows} />
                    <p className="text-[11px] text-gray-500 italic px-4 py-2 border-t border-gray-100">FW - Fabric Waste &nbsp;&nbsp; BW - Bit Waste</p>
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

function ExtruderWastageTable({ rows }: { rows: ExtruderWasteVariantRow[] }) {
  const total = rows.reduce((s, r) => s + r.lums + r.yarnWaste, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap">Size</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-left">Color</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-left">Chemical</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-right">Lums (LM)</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-right">Loose/Yarn (LO)</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={`${row.size}-${row.color}-${row.chemical}`} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.size}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-left">{row.color}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-left">{row.chemical}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-right">{formatNum(row.lums)}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-right">{formatNum(row.yarnWaste)}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-right font-bold text-gray-900">{formatNum(row.lums + row.yarnWaste)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="border-t-2 border-[#004D40] bg-emerald-50 hover:bg-emerald-50">
          <TableCell colSpan={5} className="py-3 px-4 font-bold text-[#004D40]">Total</TableCell>
          <TableCell className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function LoomsWastageTable({ rows }: { rows: LoomsWasteVariantRow[] }) {
  const total = rows.reduce((s, r) => s + r.loomsWaste, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap">Size</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-left">Color</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-left">Chemical</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Looms/Yarn Waste (LW)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={`${row.size}-${row.color}-${row.chemical}`} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.size}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-left">{row.color}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-left">{row.chemical}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-right font-bold text-gray-900">{formatNum(row.loomsWaste)}</TableCell>
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

function FabricWastageTable({ rows }: { rows: FabricWasteVariantRow[] }) {
  const total = rows.reduce((s, r) => s + r.fabricWaste + r.bitWaste, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#004D40] hover:bg-[#004D40]">
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap">Size</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-left">Color</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-left">Chemical</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-right">Fabric Waste (FW)</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white whitespace-nowrap !text-right">Bit Waste (BW)</TableHead>
          <TableHead className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={`${row.size}-${row.color}-${row.chemical}`} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm font-semibold text-gray-800">{row.size}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-left">{row.color}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-left">{row.chemical}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-right">{formatNum(row.fabricWaste)}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 !text-right">{formatNum(row.bitWaste)}</TableCell>
            <TableCell className="py-3 px-4 border-b border-gray-100 text-sm text-right font-bold text-gray-900">{formatNum(row.fabricWaste + row.bitWaste)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="border-t-2 border-[#004D40] bg-emerald-50 hover:bg-emerald-50">
          <TableCell colSpan={5} className="py-3 px-4 font-bold text-[#004D40]">Total</TableCell>
          <TableCell className="py-3 px-4 font-bold text-[#004D40] text-right">{formatNum(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
