import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileDown, X } from 'lucide-react';

const TEAL: [number, number, number] = [0, 77, 64]; // #004D40 — this app's primary accent
const TEAL_TINT: [number, number, number] = [232, 245, 240]; // light teal for footer/total rows

export interface AttendanceReportRow {
  employeeId: string;
  employeeName: string;
  role: string;
  present: number;
  absent: number;
  halfDay: number;
}

interface AttendanceReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthStr: string; // YYYY-MM
  rows: AttendanceReportRow[];
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
}

function getMonthName(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function AttendanceReportModal({
  open,
  onOpenChange,
  monthStr,
  rows,
  presentCount,
  absentCount,
  halfDayCount,
}: AttendanceReportModalProps) {
  const handleDownloadCSV = () => {
    if (rows.length === 0) return;

    const headers = ['Emp ID', 'Employee Name', 'Role', 'Present Days', 'Absent Days', 'Half Days'];
    const csvRows = [headers.join(',')];

    const escapeCsvField = (value: string) => `"${value.replace(/"/g, '""')}"`;

    for (const row of rows) {
      csvRows.push([
        escapeCsvField(row.employeeId),
        escapeCsvField(row.employeeName),
        escapeCsvField(row.role),
        String(row.present),
        String(row.absent),
        String(row.halfDay),
      ].join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (rows.length === 0) return;

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
    doc.text('ATTENDANCE REPORT', 105, 26, { align: 'center' });
    doc.text(`Period: ${getMonthName(monthStr)}`, 105, 33, { align: 'center' });

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Present: ${presentCount}`, 14, 46);
    doc.text(`Absent: ${absentCount}`, 90, 46);
    doc.text(`Half-day: ${halfDayCount}`, 160, 46, { align: 'right' });

    autoTable(doc, {
      startY: 52,
      head: [['Emp ID', 'Employee Name', 'Role', 'Present Days', 'Absent Days', 'Half Days']],
      body: rows.map((row) => [
        row.employeeId,
        row.employeeName,
        row.role,
        String(row.present),
        String(row.absent),
        String(row.halfDay),
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: TEAL_TINT },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
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

    doc.save(`Attendance_Report_${monthStr}.pdf`);
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
              Attendance Report Overview
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
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white" id="attendance-report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                Attendance Report
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Period: {getMonthName(monthStr)}
              </p>
            </div>

            {/* Summary Section */}
            <div className="grid grid-cols-3 gap-3 bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
              <div>
                <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Present</p>
                <p className="text-2xl font-bold text-[#004D40]">{presentCount}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Absent</p>
                <p className="text-2xl font-bold text-[#004D40]">{absentCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Half-day</p>
                <p className="text-2xl font-bold text-[#004D40]">{halfDayCount}</p>
              </div>
            </div>

            {/* Data Table */}
            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#004D40]">
                    <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Emp ID</th>
                    <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Employee Name</th>
                    <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Role</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Present Days</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Absent Days</th>
                    <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Half Days</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No attendance records found for this period.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr key={row.employeeId} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm font-medium whitespace-nowrap text-gray-600">
                          {row.employeeId}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold whitespace-nowrap text-gray-800">
                          {row.employeeName}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                          {row.role}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-gray-600">
                          {row.present}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-gray-600">
                          {row.absent}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-100 text-sm text-right whitespace-nowrap text-gray-600">
                          {row.halfDay}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
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
