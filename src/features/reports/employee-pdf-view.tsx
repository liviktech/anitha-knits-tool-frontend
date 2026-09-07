import { useEffect, useState } from 'react';
import { Loader } from '@/components/shared/loader';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmployeePdfData } from './employee-pdf-data';

const TEAL: [number, number, number] = [0, 77, 64];
const TEAL_TINT: [number, number, number] = [232, 245, 240];

function formatCurrency(num: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return isoDate;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getMonthName(monthStr: string) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

interface EmployeePdfViewProps {
  tab: string; // 'employee_directory' | 'attendance_report' | 'payroll_report'
}

export function EmployeePdfView({ tab }: EmployeePdfViewProps) {
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const data = useEmployeePdfData(monthStr);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (data.isLoading) return;
    
    let isCancelled = false;
    
    const generatePdf = async () => {
      setIsGenerating(true);
      
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const isLandscape = tab === 'employee_directory' || tab === 'payroll_report';
      const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;

      let y = 18;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEAL);
      doc.text('ANITHA KNITS', centerX, y, { align: 'center' });
      y += 8;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 90, 90);
      
      let title = '';
      if (tab === 'employee_directory') title = 'EMPLOYEE DIRECTORY REPORT';
      else if (tab === 'attendance_report') title = 'ATTENDANCE REPORT';
      else if (tab === 'payroll_report') title = 'PAYROLL REPORT';
      
      doc.text(title, centerX, y, { align: 'center' });
      y += 7;

      if (tab === 'employee_directory') {
        doc.text(`As of ${formatDateDisplay(new Date().toISOString())}`, centerX, y, { align: 'center' });
      } else {
        doc.text(`Period: ${getMonthName(monthStr)}`, centerX, y, { align: 'center' });
      }
      y += 5;

      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.6);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      if (tab === 'employee_directory') {
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Total Employees: ${data.employees.length}`, 14, y);
        doc.text(`Active Staff: ${data.activeCount}`, pageWidth - 14, y, { align: 'right' });

        autoTable(doc, {
          startY: y + 5,
          head: [['ID', 'Name', 'Designation', 'Mobile Number', 'Aadhar Card', 'Date of Joining', 'Address', 'Gender', 'Status']],
          body: data.employees.map((emp) => [
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

      } else if (tab === 'attendance_report') {
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Present: ${data.presentCount}`, 14, y);
        doc.text(`Absent: ${data.absentCount}`, centerX - 15, y);
        doc.text(`Half-day: ${data.halfDayCount}`, pageWidth - 14, y, { align: 'right' });

        autoTable(doc, {
          startY: y + 6,
          head: [['Emp ID', 'Employee Name', 'Role', 'Present Days', 'Absent Days', 'Half Days']],
          body: data.attendanceRows.map((row) => [
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

      } else if (tab === 'payroll_report') {
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Total Payroll: ${formatCurrency(data.totalPayroll)}`, 14, y);
        doc.text(`Total Advances: ${formatCurrency(data.totalAdvances)}`, centerX - 20, y);
        doc.text(`Machine Value: ${formatCurrency(data.totalMachineValue)}`, pageWidth - 14, y, { align: 'right' });

        autoTable(doc, {
          startY: y + 6,
          head: [['Emp ID', 'Name', 'Base Salary', 'Days Worked', 'Gross Salary', 'Advance Deducted', 'Machine Value', 'Market Value', 'Other Deduction', 'Net Payable']],
          body: data.payrollRows.map((row) => [
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
          foot: [['', '', '', '', '', '', '', '', 'Total:', formatCurrency(data.totalPayroll)]],
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: TEAL_TINT, textColor: TEAL, fontStyle: 'bold' },
          columnStyles: {
            2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' },
            5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
            8: { halign: 'right' }, 9: { halign: 'right' },
          },
        });
      }

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`,
        centerX,
        pageHeight - 10,
        { align: 'center' },
      );

      if (!isCancelled) {
        setPdfBlobUrl(doc.output('bloburi').toString());
        setIsGenerating(false);
      }
    };
    
    generatePdf();

    return () => {
      isCancelled = true;
    };
  }, [data, tab, monthStr]);

  let displayTitle = '';
  if (tab === 'employee_directory') displayTitle = 'Employee Directory';
  else if (tab === 'attendance_report') displayTitle = 'Attendance Report';
  else if (tab === 'payroll_report') displayTitle = 'Payroll Report';

  const showMonthPicker = tab !== 'employee_directory';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 print:hidden">
        <div>
          <h2 className="text-[14px] font-bold text-gray-700 leading-tight uppercase tracking-wide">{displayTitle} PDF Preview</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showMonthPicker && (
            <Input
              type="month"
              value={monthStr}
              max={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
              onChange={(e) => setMonthStr(e.target.value)}
              className="h-8 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-sm font-semibold text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
            />
          )}
          <Button
            onClick={() => {
              if (pdfBlobUrl) {
                const a = document.createElement('a');
                a.href = pdfBlobUrl;
                a.download = `${tab}_report_${showMonthPicker ? monthStr : new Date().toISOString().slice(0,10)}.pdf`;
                a.click();
              }
            }}
            disabled={!pdfBlobUrl || isGenerating}
            className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-8 text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)]"
          >
            <Download className="w-3.5 h-3.5" /> DOWNLOAD PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
        {data.isLoading || isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader size="lg" className="mb-4 text-[#004D40]" />
            <p>Generating PDF Preview...</p>
          </div>
        ) : pdfBlobUrl ? (
          <iframe 
            src={pdfBlobUrl} 
            className="w-full h-full rounded-lg shadow-sm border border-gray-300 bg-white"
            title={`${displayTitle} PDF Preview`}
          />
        ) : (
          <div className="text-gray-500">Could not generate PDF.</div>
        )}
      </div>
    </div>
  );
}
