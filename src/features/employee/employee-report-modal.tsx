import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileDown, X } from 'lucide-react';
import { Loader } from '@/components/shared/loader';
import { useEmployees } from './employee-queries';

const TEAL: [number, number, number] = [0, 77, 64]; // #004D40 — this app's primary accent
const TEAL_TINT: [number, number, number] = [232, 245, 240]; // light teal for footer/total rows

interface EmployeeReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return isoDate;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function EmployeeReportModal({ open, onOpenChange }: EmployeeReportModalProps) {
  const { data: employees = [], isLoading, isError, refetch } = useEmployees();

  const activeCount = employees.filter((e) => e.isActive).length;

  const handleDownloadCSV = () => {
    if (employees.length === 0) return;

    const headers = ['Employee ID', 'Name', 'Designation', 'Mobile Number', 'Aadhar Card', 'Date of Joining', 'Address', 'Gender', 'Status'];
    const csvRows = [headers.join(',')];

    const escapeCsvField = (value: string) => `"${value.replace(/"/g, '""')}"`;

    for (const emp of employees) {
      csvRows.push([
        escapeCsvField(emp.employeeDetails?.customUserId || emp.id),
        escapeCsvField(emp.name || ''),
        escapeCsvField(emp.employeeDetails?.designation || ''),
        escapeCsvField(emp.mobile),
        escapeCsvField(emp.employeeDetails?.aadhaarNumber || ''),
        escapeCsvField(emp.employeeDetails?.joiningDate ? emp.employeeDetails.joiningDate.slice(0, 10) : ''),
        escapeCsvField(emp.employeeDetails?.address || ''),
        escapeCsvField(emp.employeeDetails?.gender || ''),
        escapeCsvField(emp.isActive ? 'Active' : 'Inactive'),
      ].join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Employee_Directory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (employees.length === 0) return;

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
    doc.text('EMPLOYEE DIRECTORY REPORT', 148, 23, { align: 'center' });
    doc.text(`As of ${formatDateDisplay(new Date().toISOString())}`, 148, 29, { align: 'center' });

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(14, 33, 283, 33);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Employees: ${employees.length}`, 14, 40);
    doc.text(`Active Staff: ${activeCount}`, 283, 40, { align: 'right' });

    autoTable(doc, {
      startY: 45,
      head: [['ID', 'Name', 'Designation', 'Mobile Number', 'Aadhar Card', 'Date of Joining', 'Address', 'Gender', 'Status']],
      body: employees.map((emp) => [
        emp.employeeDetails?.customUserId || emp.id,
        emp.name || '-',
        emp.employeeDetails?.designation || '-',
        emp.mobile,
        emp.employeeDetails?.aadhaarNumber || '-',
        formatDateDisplay(emp.employeeDetails?.joiningDate || ''),
        emp.employeeDetails?.address || '-',
        emp.employeeDetails?.gender || '-',
        emp.isActive ? 'Active' : 'Inactive',
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: TEAL_TINT },
      columnStyles: { 8: { halign: 'right' } },
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

    doc.save(`Employee_Directory_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
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
              Employee Directory Report Overview
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isLoading || employees.length === 0} className="gap-2 bg-white border-[#004D40] text-[#004D40] hover:bg-[#004D40]/10">
                <FileDown className="w-4 h-4" /> Download PDF
              </Button>
              <Button size="sm" onClick={handleDownloadCSV} disabled={isLoading || employees.length === 0} className="gap-2 bg-[#004D40] hover:bg-[#00382e] text-white">
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
        <div className="flex-1 overflow-auto p-4 print:p-0 bg-gray-100 print:bg-white" id="employee-report-printable-area">
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-4 border-b-2 border-[#004D40] pb-3">
              <h1 className="text-3xl font-extrabold text-[#004D40] uppercase tracking-wider mb-2">
                Anitha Knits
              </h1>
              <h2 className="text-xl font-semibold text-gray-600 uppercase tracking-wide">
                Employee Directory Report
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                As of {formatDateDisplay(new Date().toISOString())}
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
                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
                  <div>
                    <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Total Employees</p>
                    <p className="text-3xl font-bold text-[#004D40]">{employees.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#004D40]/70 uppercase">Active Staff</p>
                    <p className="text-xl font-bold text-[#004D40]">{activeCount}</p>
                  </div>
                </div>

                {/* Data Table */}
                <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#004D40]">
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">ID</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Name</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Designation</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Mobile Number</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Aadhar Card</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Date of Joining</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Address</th>
                        <th className="py-3 px-4 font-bold text-white whitespace-nowrap">Gender</th>
                        <th className="py-3 px-4 font-bold text-white text-right whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-gray-500">
                            No employees recorded.
                          </td>
                        </tr>
                      ) : (
                        employees.map((emp, idx) => (
                          <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-medium whitespace-nowrap text-gray-600">
                              {emp.employeeDetails?.customUserId || emp.id}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-semibold whitespace-nowrap text-gray-800">
                              {emp.name || '-'}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                              {emp.employeeDetails?.designation || '-'}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                              {emp.mobile}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                              {emp.employeeDetails?.aadhaarNumber || '-'}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                              {formatDateDisplay(emp.employeeDetails?.joiningDate || '')}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm text-gray-600 max-w-[200px] truncate" title={emp.employeeDetails?.address || ''}>
                              {emp.employeeDetails?.address || '-'}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm whitespace-nowrap text-gray-600">
                              {emp.employeeDetails?.gender || '-'}
                            </td>
                            <td className="py-3 px-4 border-b border-gray-100 text-sm font-bold whitespace-nowrap text-gray-900 text-right">
                              {emp.isActive ? 'Active' : 'Inactive'}
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
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
