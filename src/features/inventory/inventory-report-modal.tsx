import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileDown, X } from 'lucide-react';
import { Loader } from '@/components/shared/loader';
import { useInventoryRecords, inventoryTypeLabels, type InventoryType } from './inventory-queries';
import { useOpeningBalanceRawMaterials } from '@/features/admin-panel/opening-balance-queries';
import { formatDateDisplay } from './inventory-utils';

const TEAL: [number, number, number] = [0, 77, 64]; // #004D40 — this app's primary accent
const TEAL_TINT: [number, number, number] = [232, 245, 240]; // light teal for footer/total rows

interface InventoryReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // YYYY-MM
}

function getMonthName(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function InventoryReportModal({ open, onOpenChange, month }: InventoryReportModalProps) {
  const { data, isLoading, isError, refetch } = useInventoryRecords('?limit=100');
  const { data: obRes } = useOpeningBalanceRawMaterials('?limit=100');
  const records = data?.data ?? [];
  const obRecords = obRes?.data ?? [];

  const monthRecords = records
    .filter((r) => r.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  const categoryTotal = (type: InventoryType) => {
    const recordWeight = monthRecords.filter((r) => r.type === type).reduce((sum, r) => sum + r.weightKg, 0);
    const obWeight = obRecords.filter((r) => r.type === type).reduce((sum, r) => sum + r.weightKg, 0);
    return recordWeight + obWeight;
  };

  const hdpeTotal = categoryTotal('HDPE');
  const chemicalTotal = categoryTotal('CHEMICAL');
  const colorTotal = categoryTotal('COLOR');
  const grandTotal = hdpeTotal + chemicalTotal + colorTotal;

  const handleDownloadCSV = () => {
    if (monthRecords.length === 0) return;

    const headers = ['Date', 'Type', 'Name', 'Bags', 'Weight (kg)', 'DC Number'];
    const csvRows = [headers.join(',')];

    const escapeCsvField = (value: string) => `"${value.replace(/"/g, '""')}"`;

    for (const r of monthRecords) {
      csvRows.push([
        formatDateDisplay(r.date),
        inventoryTypeLabels[r.type],
        escapeCsvField(r.name),
        String(r.bagCount ?? 0),
        String(r.weightKg),
        escapeCsvField(r.DC_NUMBER || ''),
      ].join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Report_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (monthRecords.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEAL);
    doc.text('ANITHA KNITS', 105, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('INVENTORY STOCK REPORT', 105, 26, { align: 'center' });
    doc.text(`Period: ${getMonthName(month)}`, 105, 33, { align: 'center' });

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`HDPE: ${hdpeTotal.toFixed(2)} kg`, 14, 46);
    doc.text(`Chemical: ${chemicalTotal.toFixed(2)} kg`, 90, 46);
    doc.text(`Color: ${colorTotal.toFixed(2)} kg`, 160, 46, { align: 'right' });

    autoTable(doc, {
      startY: 52,
      head: [['Date', 'Type', 'Name', 'Bags', 'Weight (kg)', 'DC Number']],
      body: monthRecords.map((r) => [
        formatDateDisplay(r.date),
        inventoryTypeLabels[r.type],
        r.name,
        String(r.bagCount ?? 0),
        r.weightKg.toFixed(2),
        r.DC_NUMBER || '-',
      ]),
      foot: [['', '', '', '', `Total: ${grandTotal.toFixed(2)} kg`, '']],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: TEAL_TINT, textColor: TEAL, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`,
      105,
      pageHeight - 10,
      { align: 'center' },
    );

    doc.save(`Inventory_Report_${month}.pdf`);
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
              Inventory Report Overview
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isLoading || monthRecords.length === 0} className="gap-2 bg-white border-[#004D40] text-[#004D40] hover:bg-[#004D40]/10">
                <FileDown className="w-4 h-4" /> Download PDF
              </Button>
              <Button size="sm" onClick={handleDownloadCSV} disabled={isLoading || monthRecords.length === 0} className="gap-2 bg-[#004D40] hover:bg-[#00382e] text-white">
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
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white" id="inventory-report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                Inventory Report
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Period: {getMonthName(month)}
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader size="lg" className="mb-4" />
                <p>Generating report...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-20 text-red-500">
                <p>Unable to load report data.</p>
                <Button variant="outline" onClick={() => refetch()} className="mt-4">Retry</Button>
              </div>
            ) : (
              <>
                {/* Summary Section */}
                <div className="grid grid-cols-3 gap-3 bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
                  <div>
                    <p className="text-sm font-semibold text-[#004D40]/70 uppercase">HDPE</p>
                    <p className="text-2xl font-bold text-[#004D40]">{hdpeTotal.toFixed(2)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Chemical</p>
                    <p className="text-2xl font-bold text-[#004D40]">{chemicalTotal.toFixed(2)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Color</p>
                    <p className="text-2xl font-bold text-[#004D40]">{colorTotal.toFixed(2)} <span className="text-sm font-medium">kg</span></p>
                  </div>
                </div>

                {/* Data Table */}
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#004D40]">
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Date</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Type</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Name</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Bags</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Weight (kg)</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">DC Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            No stock received recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        monthRecords.map((r, idx) => (
                          <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                              {formatDateDisplay(r.date)}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-medium whitespace-nowrap text-gray-600">
                              {inventoryTypeLabels[r.type]}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold whitespace-nowrap text-gray-800">
                              {r.name}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-gray-600">
                              {r.bagCount ?? 0}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-bold text-right whitespace-nowrap text-gray-900">
                              {r.weightKg.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                              {r.DC_NUMBER || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {monthRecords.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-[#004D40] bg-emerald-50">
                          <td colSpan={4} className="py-4 px-4 font-bold text-[#004D40] text-right">
                            Total:
                          </td>
                          <td className="py-4 px-4 font-bold text-[#004D40] text-right text-lg">
                            {grandTotal.toFixed(2)} kg
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-400 mt-4 pt-3 border-t border-gray-200 print:mt-auto">
                  Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
