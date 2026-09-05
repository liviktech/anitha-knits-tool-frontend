import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileDown, X } from 'lucide-react';

const TEAL: [number, number, number] = [0, 77, 64]; // #004D40 — this app's primary accent
const TEAL_TINT: [number, number, number] = [232, 245, 240]; // light teal for footer/total rows

export interface PayrollReportRow {
  employeeId: string;
  name: string;
  baseSalary: number;
  daysWorked: number;
  grossSalary: number;
  advanceDeduction: number;
  marketValueBonus: number; // "Machine Value" on screen
  marketValueDeduction: number; // "Market Value" on screen
  otherDeduction: number;
  netSalary: number;
}

interface PayrollReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthStr: string; // YYYY-MM
  rows: PayrollReportRow[];
  totalPayroll: number;
  totalAdvances: number;
  totalMachineValue: number;
}

function getMonthName(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatCurrency(num: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function PayrollReportModal({
  open,
  onOpenChange,
  monthStr,
  rows,
  totalPayroll,
  totalAdvances,
  totalMachineValue,
}: PayrollReportModalProps) {
  const handleDownloadCSV = () => {
    if (rows.length === 0) return;

    const headers = ['Emp ID', 'Name', 'Base Salary', 'Days Worked', 'Gross Salary', 'Advance Deducted', 'Machine Value', 'Market Value', 'Other Deduction', 'Net Payable'];
    const csvRows = [headers.join(',')];

    const escapeCsvField = (value: string) => `"${value.replace(/"/g, '""')}"`;

    for (const row of rows) {
      csvRows.push([
        escapeCsvField(row.employeeId),
        escapeCsvField(row.name),
        String(row.baseSalary),
        String(row.daysWorked),
        String(row.grossSalary),
        String(row.advanceDeduction),
        String(row.marketValueBonus),
        String(row.marketValueDeduction),
        String(row.otherDeduction),
        String(row.netSalary),
      ].join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payroll_Report_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (rows.length === 0) return;

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
    doc.text('PAYROLL REPORT', 148, 23, { align: 'center' });
    doc.text(`Period: ${getMonthName(monthStr)}`, 148, 29, { align: 'center' });

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(14, 33, 283, 33);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Payroll: ${formatCurrency(totalPayroll)}`, 14, 40);
    doc.text(`Total Advances: ${formatCurrency(totalAdvances)}`, 130, 40);
    doc.text(`Machine Value: ${formatCurrency(totalMachineValue)}`, 283, 40, { align: 'right' });

    autoTable(doc, {
      startY: 45,
      head: [['Emp ID', 'Name', 'Base Salary', 'Days Worked', 'Gross Salary', 'Advance Deducted', 'Machine Value', 'Market Value', 'Other Deduction', 'Net Payable']],
      body: rows.map((row) => [
        row.employeeId,
        row.name,
        formatCurrency(row.baseSalary),
        String(row.daysWorked),
        formatCurrency(row.grossSalary),
        formatCurrency(row.advanceDeduction),
        formatCurrency(row.marketValueBonus),
        formatCurrency(row.marketValueDeduction),
        formatCurrency(row.otherDeduction),
        formatCurrency(row.netSalary),
      ]),
      foot: [['', '', '', '', '', '', '', '', 'Total:', formatCurrency(totalPayroll)]],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: TEAL_TINT, textColor: TEAL, fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' },
        5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
        8: { halign: 'right' }, 9: { halign: 'right' },
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

    doc.save(`Payroll_Report_${monthStr}.pdf`);
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
              Payroll Report Overview
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={rows.length === 0} className="gap-2 bg-white border-[#004D40] text-[#004D40] hover:bg-[#004D40]/10">
                <FileDown className="w-4 h-4" /> Download PDF
              </Button>
              <Button size="sm" onClick={handleDownloadCSV} disabled={rows.length === 0} className="gap-2 bg-[#004D40] hover:bg-[#00382e] text-white">
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
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white" id="payroll-report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                Payroll Report
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Period: {getMonthName(monthStr)}
              </p>
            </div>

            {/* Summary Section */}
            <div className="grid grid-cols-3 gap-3 bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
              <div>
                <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Total Payroll</p>
                <p className="text-2xl font-bold text-[#004D40]">{formatCurrency(totalPayroll)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Total Advances</p>
                <p className="text-2xl font-bold text-[#004D40]">{formatCurrency(totalAdvances)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Machine Value</p>
                <p className="text-2xl font-bold text-[#004D40]">{formatCurrency(totalMachineValue)}</p>
              </div>
            </div>

            {/* Data Table */}
            <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#004D40]">
                    <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Emp ID</th>
                    <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Name</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Base Salary</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Days Worked</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Gross Salary</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Advance Deducted</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Machine Value</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Market Value</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Other Deduction</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500">
                        No payroll data found for this period.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr key={row.employeeId} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm font-medium whitespace-nowrap text-gray-600">
                          {row.employeeId}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold whitespace-nowrap text-gray-800">
                          {row.name}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-gray-600">
                          {formatCurrency(row.baseSalary)}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-gray-600">
                          {row.daysWorked}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-gray-600">
                          {formatCurrency(row.grossSalary)}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-amber-700">
                          - {formatCurrency(row.advanceDeduction)}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-blue-700">
                          + {formatCurrency(row.marketValueBonus)}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-red-700">
                          - {formatCurrency(row.marketValueDeduction)}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-orange-700">
                          - {formatCurrency(row.otherDeduction)}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm font-bold text-right whitespace-nowrap text-gray-900">
                          {formatCurrency(row.netSalary)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#004D40] bg-emerald-50">
                      <td colSpan={9} className="py-4 px-4 font-bold text-[#004D40] text-right">
                        Total:
                      </td>
                      <td className="py-4 px-4 font-bold text-[#004D40] text-right text-lg">
                        {formatCurrency(totalPayroll)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

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
