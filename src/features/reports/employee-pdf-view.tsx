import { useEffect, useState } from 'react';
import { useEmployeePdfData } from './employee-pdf-data';
import { ReportLayout } from './report-layout';
import { useReportPeriod } from './report-period';

const TEAL: [number, number, number] = [0, 77, 64];
const TEAL_TINT: [number, number, number] = [232, 245, 240];

function formatCurrency(num: number) {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);
  return `Rs. ${formatted}`;
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return isoDate;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface EmployeePdfViewProps {
  tab: string; // 'employee_directory' | 'attendance_report' | 'payroll_report'
  allReports?: { id: string; label: string; moduleId: string }[];
  selectedReport?: string;
  onReportChange?: (tabId: string, moduleId: string) => void;
}

export function EmployeePdfView({ tab, allReports, selectedReport, onReportChange }: EmployeePdfViewProps) {
  const period = useReportPeriod();

  // Payroll is always scoped to a single calendar month (the backend only aggregates payroll
  // per month, ignoring any "from" bound), so force Month mode and collapse From/To to the same
  // month whenever the user is viewing (or switches to) the Payroll tab — otherwise the picker
  // and the displayed period label could show a range while the report itself only reflects
  // the "to" month.
  useEffect(() => {
    if (tab !== 'payroll_report') return;
    if (period.mode === 'date') period.setMode('month');
    if (period.fromMonthStr !== period.toMonthStr) period.setFromMonthStr(period.toMonthStr);
  }, [tab, period.mode, period.fromMonthStr, period.toMonthStr]);

  const data = useEmployeePdfData(period.effectiveFrom, period.effectiveTo, period.toMonthStr);
  const isLoading = data.isLoading;

  // attendanceRows/payrollRows always carry one row per employee (zeroed out where there's no
  // record), so their .length alone can't tell "no data for this period" from "no employees" —
  // check the actual counts/values instead.
  const hasData = tab === 'employee_directory'
    ? data.employees.length > 0
    : tab === 'attendance_report'
      ? data.presentCount + data.absentCount + data.halfDayCount > 0
      : data.payrollRows.some((r) => r.grossSalary > 0 || r.netSalary > 0);

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    
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
        doc.text(`Period: ${period.label}`, centerX, y, { align: 'center' });
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
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 8) {
              data.cell.styles.halign = 'right';
            }
          },
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
          didParseCell: (data) => {
            if (data.section === 'head' && [3, 4, 5].includes(data.column.index)) {
              data.cell.styles.halign = 'right';
            }
          },
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
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index >= 2 && data.column.index <= 9) {
              data.cell.styles.halign = 'right';
            }
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
  }, [data, isLoading, tab, period.label]);

  const handleDownloadXlsx = async () => {
    if (!data) return;
    setIsGeneratingXlsx(true);
    try {
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();
      const wsData: any[][] = [];

      let displayTitle = '';
      if (tab === 'employee_directory') displayTitle = 'Employee Directory';
      else if (tab === 'attendance_report') displayTitle = 'Attendance Report';
      else if (tab === 'payroll_report') displayTitle = 'Payroll Report';

      wsData.push([displayTitle]);
      if (tab === 'employee_directory') {
        wsData.push([`As of ${formatDateDisplay(new Date().toISOString())}`]);
      } else {
        wsData.push([`Period: ${period.label}`]);
      }
      wsData.push([]);

      if (tab === 'employee_directory') {
        wsData.push(['ID', 'Name', 'Designation', 'Mobile Number', 'Aadhar Card', 'Date of Joining', 'Address', 'Gender', 'Status']);
        data.employees.forEach((emp) => {
          wsData.push([
            emp.employeeDetails?.customUserId || emp.id,
            emp.name || '-',
            emp.employeeDetails?.designation || '-',
            emp.mobile,
            emp.employeeDetails?.aadhaarNumber || '-',
            formatDateDisplay(emp.employeeDetails?.joiningDate || ''),
            emp.employeeDetails?.address || '-',
            emp.employeeDetails?.gender || '-',
            emp.isActive ? 'Active' : 'Inactive',
          ]);
        });
      } else if (tab === 'attendance_report') {
        wsData.push(['Emp ID', 'Employee Name', 'Role', 'Present Days', 'Absent Days', 'Half Days']);
        data.attendanceRows.forEach((row) => {
          wsData.push([
            row.employeeId,
            row.employeeName,
            row.role,
            row.present,
            row.absent,
            row.halfDay,
          ]);
        });
      } else if (tab === 'payroll_report') {
        wsData.push(['Emp ID', 'Name', 'Base Salary', 'Days Worked', 'Gross Salary', 'Advance Deducted', 'Machine Value', 'Market Value', 'Other Deduction', 'Net Payable']);
        data.payrollRows.forEach((row) => {
          wsData.push([
            row.employeeId,
            row.name,
            row.baseSalary,
            row.daysWorked,
            row.grossSalary,
            row.advanceDeduction,
            row.marketValueBonus,
            row.marketValueDeduction,
            row.otherDeduction,
            row.netSalary,
          ]);
        });
        wsData.push(['', '', '', '', '', '', '', '', 'Total:', data.totalPayroll]);
      }

      const ws = utils.aoa_to_sheet(wsData);
      utils.book_append_sheet(wb, ws, displayTitle.substring(0, 31));

      writeFile(wb, `Anitha_Knits_${tab}_${period.fileSuffix}.xlsx`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingXlsx(false);
    }
  };

  let displayTitle = '';
  if (tab === 'employee_directory') displayTitle = 'Employee Directory';
  else if (tab === 'attendance_report') displayTitle = 'Attendance Report';
  else if (tab === 'payroll_report') displayTitle = 'Payroll Report';

  const showPeriodPicker = tab !== 'employee_directory';

  const handleDownload = () => {
    if (pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      a.download = `Anitha_Knits_${tab}_${period.fileSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <ReportLayout
      displayTitle={displayTitle}
      allReports={allReports}
      selectedReport={selectedReport}
      onReportChange={onReportChange}
      period={period}
      showPeriodPicker={showPeriodPicker}
      supportsDateMode={tab !== 'payroll_report'}
      hasData={hasData}
      pdfBlobUrl={pdfBlobUrl}
      isGenerating={isGenerating}
      isGeneratingXlsx={isGeneratingXlsx}
      isLoading={isLoading}
      onDownloadXlsx={handleDownloadXlsx}
      onDownload={handleDownload}
    />
  );
}
