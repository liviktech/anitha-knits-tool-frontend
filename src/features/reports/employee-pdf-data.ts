import { useMemo } from 'react';
import { useEmployees, useSavedPayrollRecords, usePayrollSummary, useMarketValueAllocations, buildPayrollRows } from '@/features/employee/employee-queries';
import { useAttendanceRecords } from '@/features/employee/attendance-queries';

/**
 * @param dateFromStr Exact "YYYY-MM-DD" start date, used for the Attendance Report — works for
 *   either a whole month (1st to last day) or an exact day-level range.
 * @param dateToStr Exact "YYYY-MM-DD" end date, used for the Attendance Report.
 * @param payrollMonthStr The single "YYYY-MM" month used for the Payroll Report — the backend
 *   only supports a per-calendar-month payroll query, so Payroll always uses this instead of
 *   the (possibly day-level) attendance date range.
 */
export function useEmployeePdfData(dateFromStr: string, dateToStr: string, payrollMonthStr: string) {
  const [yearTo, monthTo] = payrollMonthStr.split('-');
  const yearNumTo = Number(yearTo);
  const monthNumTo = Number(monthTo);

  // For Employee Directory
  const { data: allEmployeesData = [], isLoading: isLoadingEmployees } = useEmployees();

  // For Attendance Report
  const { data: attendanceData, isLoading: isLoadingAttendance } = useAttendanceRecords(dateFromStr, dateToStr);

  // For Payroll Report
  // NOTE: Backend for payroll may only support a single month query, so Payroll is always
  // month-scoped (see payrollMonthStr above) regardless of the Attendance Report's period mode.
  const { data: savedRecords = [], isLoading: isLoadingSaved } = useSavedPayrollRecords(monthNumTo, yearNumTo);
  const { data: payrollSummary = [], isLoading: isLoadingSummary } = usePayrollSummary(monthNumTo, yearNumTo);
  const { data: marketValueAllocations = {}, isLoading: isLoadingMarketValue } = useMarketValueAllocations(monthNumTo, yearNumTo);

  return useMemo(() => {
    // 1. Employee Directory
    const activeCount = allEmployeesData.filter((e) => e.isActive).length;

    // 2. Attendance Report
    const employeeOptions = allEmployeesData.map((emp) => ({
      id: emp.id,
      name: emp.name || 'Unknown',
      role: emp.employeeDetails?.designation || 'Unknown',
      customUserId: emp.employeeDetails?.customUserId || emp.id,
    }));

    const records = (attendanceData || []).map((att) => {
      const statusMap: Record<string, string> = {
        'DAY_SHIFT': 'Day shift',
        'NIGHT_SHIFT': 'Night shift',
        'ABSENT': 'Absent',
        'HALF_DAY': 'Half-day',
        'COMPANY_HOLIDAY': 'Leave'
      };

      return {
        id: att.id,
        date: att.date,
        employeeId: att.employee?.employeeDetails?.customUserId || att.employeeId,
        employeeName: att.employee?.name || 'Unknown',
        role: att.employee?.employeeDetails?.designation || 'Employee',
        status: (statusMap[att.status] || 'Day shift') as 'Day shift' | 'Night shift' | 'Absent' | 'Half-day' | 'Leave',
      };
    });

    const filteredRecords = records.filter((r) => {
      const d = r.date.slice(0, 10);
      return d >= dateFromStr && d <= dateToStr;
    });

    const presentCount = filteredRecords.filter(r => r.status === 'Day shift' || r.status === 'Night shift').length;
    const absentCount = filteredRecords.filter(r => r.status === 'Absent').length;
    const halfDayCount = filteredRecords.filter(r => r.status === 'Half-day').length;

    const attendanceSummaryMap = new Map<string, { employeeId: string; rawId: string; employeeName: string; role: string; present: number; absent: number; halfDay: number }>();
    employeeOptions.forEach((emp) => {
      const key = emp.customUserId || emp.id;
      attendanceSummaryMap.set(key, {
        employeeId: key,
        rawId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        present: 0,
        absent: 0,
        halfDay: 0,
      });
    });

    filteredRecords.forEach((r) => {
      const employeeKey = employeeOptions.find(emp => emp.id === r.employeeId)?.customUserId || r.employeeId;
      const existing = attendanceSummaryMap.get(employeeKey);
      if (existing) {
        if (r.status === 'Day shift' || r.status === 'Night shift') existing.present += 1;
        if (r.status === 'Absent') existing.absent += 1;
        if (r.status === 'Half-day') existing.halfDay += 1;
      }
    });

    const attendanceRows = Array.from(attendanceSummaryMap.values());

    // 3. Payroll Report
    const isGenerated = savedRecords.length > 0;
    const payrollRows = buildPayrollRows(allEmployeesData, savedRecords, payrollSummary, marketValueAllocations);

    const totalPayroll = isGenerated
      ? savedRecords.reduce((sum, p) => sum + Number(p.netSalary), 0)
      : payrollSummary.reduce((sum, p) => sum + p.netSalary, 0);
    const totalAdvances = isGenerated
      ? savedRecords.reduce((sum, p) => sum + Number(p.advanceDeduction), 0)
      : payrollSummary.reduce((sum, p) => sum + p.advanceDeduction, 0);
    const totalMachineValue = isGenerated
      ? savedRecords.reduce((sum, p) => sum + Number(p.marketValueBonus), 0)
      : Object.values(marketValueAllocations).reduce((sum, val) => sum + val, 0);

    return {
      isLoading: isLoadingEmployees || isLoadingAttendance || isLoadingSaved || isLoadingSummary || isLoadingMarketValue,
      employees: allEmployeesData,
      activeCount,
      attendanceRows,
      presentCount,
      absentCount,
      halfDayCount,
      payrollRows: payrollRows.map(row => ({
        employeeId: row.customUserId || row.id,
        name: row.name || '-',
        baseSalary: row.baseSalary,
        daysWorked: row.daysWorked,
        grossSalary: row.grossSalary,
        advanceDeduction: row.advanceDeduction,
        marketValueBonus: row.marketValueBonus,
        marketValueDeduction: row.marketValueDeduction,
        otherDeduction: row.otherDeduction ?? 0,
        netSalary: row.netSalary,
      })),
      totalPayroll,
      totalAdvances,
      totalMachineValue,
    };
  }, [
    allEmployeesData,
    attendanceData,
    savedRecords,
    payrollSummary,
    marketValueAllocations,
    dateFromStr,
    dateToStr,
    isLoadingEmployees,
    isLoadingAttendance,
    isLoadingSaved,
    isLoadingSummary,
    isLoadingMarketValue,
  ]);
}
