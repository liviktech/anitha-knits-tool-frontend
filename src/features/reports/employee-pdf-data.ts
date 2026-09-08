import { useMemo } from 'react';
import { useEmployees, useSavedPayrollRecords, usePayrollSummary, useMarketValueAllocations, buildPayrollRows } from '@/features/employee/employee-queries';
import { useAttendanceRecords } from '@/features/employee/attendance-queries';

export function useEmployeePdfData(monthStr: string) {
  const [year, month] = monthStr.split('-');
  const yearNum = Number(year);
  const monthNum = Number(month);

  // For Employee Directory
  const { data: allEmployeesData = [], isLoading: isLoadingEmployees } = useEmployees();

  // For Attendance Report
  const dateFrom = `${yearNum}-${month.padStart(2, '0')}-01`;
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  const dateTo = `${yearNum}-${month.padStart(2, '0')}-${lastDay}`;
  const { data: attendanceData, isLoading: isLoadingAttendance } = useAttendanceRecords(dateFrom, dateTo);

  // For Payroll Report
  const { data: savedRecords = [], isLoading: isLoadingSaved } = useSavedPayrollRecords(monthNum, yearNum);
  const { data: payrollSummary = [], isLoading: isLoadingSummary } = usePayrollSummary(monthNum, yearNum);
  const { data: marketValueAllocations = {}, isLoading: isLoadingMarketValue } = useMarketValueAllocations(monthNum, yearNum);

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

    const filteredRecords = records.filter((r) => r.date.startsWith(monthStr));

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
    monthStr,
    isLoadingEmployees,
    isLoadingAttendance,
    isLoadingSaved,
    isLoadingSummary,
    isLoadingMarketValue,
  ]);
}
