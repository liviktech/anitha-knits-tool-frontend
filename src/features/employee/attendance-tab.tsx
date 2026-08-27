import { useState, useMemo } from 'react';
import { Search, Plus, Calendar, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MarkAttendanceModal } from './mark-attendance-modal';
import { EmployeeAttendanceDetailsModal } from './employee-attendance-details-modal';
import { useEmployees } from './employee-queries';
import { useAttendanceRecords, useUpsertAttendance } from './attendance-queries';
function todayFormatted() {
  const date = new Date();
  return `Today, ${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = ['2024', '2025', '2026'];
const ROLES = ['Knitting Operator', 'Supervisor', 'Helper', 'Quality Checker'];

export interface AttendanceRecord {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  role: string;
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Absent' | 'Half-day' | 'Leave';
}

export function AttendanceTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const openDetailsModal = (row: { employeeId: string; employeeName: string }) => {
    setSelectedEmployee({ id: row.employeeId, name: row.employeeName });
    setIsDetailsModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  // We pass 'isActive=true' or just fetch all for employeeOptions
  const { data: employeesData } = useEmployees('isActive=true');
  const employeeOptions = useMemo(() => {
    if (!employeesData) return [];
    return employeesData.map((emp) => ({
      id: emp.id,
      name: emp.name || 'Unknown',
      role: emp.employeeDetails?.designation || emp.role,
      customUserId: emp.employeeDetails?.customUserId || emp.id,
    }));
  }, [employeesData]);

  const { data: attendanceData, isLoading } = useAttendanceRecords();
  const upsertMutation = useUpsertAttendance();

  const records = useMemo<AttendanceRecord[]>(() => {
    if (!attendanceData) return [];
    return attendanceData.map((att) => {
      // Map API status back to UI format
      const statusMap: Record<string, string> = {
        'PRESENT': 'Present',
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
        checkIn: '', // No longer used in schema
        checkOut: '', // No longer used in schema
        status: (statusMap[att.status] || 'Present') as 'Present' | 'Absent' | 'Half-day' | 'Leave',
      };
    });
  }, [attendanceData]);

  const presentCount = records.filter(r => r.status === 'Present').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;
  const halfDayCount = records.filter(r => r.status === 'Half-day').length;

  const filteredRecords = records.filter((r) => {
    const [year, month] = r.date.split('-');
    const matchesMonth = monthFilter === 'ALL' || MONTHS[Number(month) - 1] === monthFilter;
    const matchesYear = yearFilter === 'ALL' || year === yearFilter;
    return matchesMonth && matchesYear;
  });

  const summaryRows = useMemo(() => {
    const map = new Map<string, { employeeId: string; rawId: string; employeeName: string; role: string; present: number; absent: number; halfDay: number }>();

    // Initialize with all employees
    employeeOptions.forEach((emp) => {
      const key = emp.customUserId || emp.id;
      map.set(key, {
        employeeId: key,
        rawId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        present: 0,
        absent: 0,
        halfDay: 0,
      });
    });

    // Populate from filtered records
    filteredRecords.forEach((r) => {
      const existing = map.get(r.employeeId);
      if (existing) {
        if (r.status === 'Present') existing.present += 1;
        if (r.status === 'Absent') existing.absent += 1;
        if (r.status === 'Half-day') existing.halfDay += 1;
      }
    });

    // Apply search and role filters
    const q = searchQuery.toLowerCase();
    const rows = Array.from(map.values()).filter(row => {
      const matchesSearch = row.employeeName.toLowerCase().includes(q) || row.employeeId.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || row.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    return rows;
  }, [employeeOptions, filteredRecords, searchQuery, roleFilter]);

  const detailsRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    return filteredRecords.filter(r => r.employeeId === selectedEmployee.id);
  }, [filteredRecords, selectedEmployee]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Attendance</h2>
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-sm font-medium text-gray-700">{todayFormatted()}</span>
          <Calendar className="h-4 w-4 text-gray-500" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#0B503B] p-5 text-center shadow-sm">
          <div className="text-3xl font-bold text-white">{presentCount}</div>
          <div className="mt-1 text-[11px] font-bold tracking-wider text-emerald-100 uppercase">Present</div>
        </div>
        <div className="rounded-xl bg-[#FDE8E6] p-5 text-center shadow-sm border border-red-100">
          <div className="text-3xl font-bold text-[#C62828]">{absentCount}</div>
          <div className="mt-1 text-[11px] font-bold tracking-wider text-[#C62828] uppercase">Absent</div>
        </div>
        <div className="rounded-xl bg-[#E6F0F9] p-5 text-center shadow-sm border border-blue-100">
          <div className="text-3xl font-bold text-[#1565C0]">{halfDayCount}</div>
          <div className="mt-1 text-[11px] font-bold tracking-wider text-[#1565C0] uppercase">Half-day</div>
        </div>
      </div>

      {/* Filters and Table Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-45 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 w-full rounded-lg border-gray-200 shadow-sm"
            />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-10 w-36 rounded-lg border-gray-200 shadow-sm">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Months</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="h-10 w-28 rounded-lg border-gray-200 shadow-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-10 w-44 rounded-lg border-gray-200 shadow-sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={openAddModal}
          className="h-10 gap-2 bg-[#0B503B] text-white hover:bg-[#083A2A] shadow-sm rounded-lg"
        >
          <Plus className="h-4 w-4" /> Add Attendance
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-[#F8F9FA]">
            <TableRow className="hover:bg-transparent border-b border-gray-200">
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5">
                EMP ID
              </TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5">
                EMPLOYEE NAME
              </TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-[140px] text-center">
                PRESENT DAYS
              </TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-[140px] text-center">
                ABSENT DAYS
              </TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-[120px] text-center">
                HALF DAYS
              </TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-[100px] text-right">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 !text-center text-gray-500">
                  Loading attendance records...
                </TableCell>
              </TableRow>
            ) : summaryRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 !text-center text-gray-500">
                  No attendance records found.
                </TableCell>
              </TableRow>
            ) : (
              summaryRows.map((row) => (
                <TableRow key={row.employeeId} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <TableCell className="py-3 px-5">
                    <span className="text-sm font-semibold text-blue-600">
                      {row.employeeId}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                        {row.employeeName.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{row.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-[#4ADE80] px-3 py-1 text-xs font-medium text-emerald-900">
                      {row.present}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-[#FECDD3] px-3 py-1 text-xs font-medium text-rose-900">
                      {row.absent}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-[#BFDBFE] px-3 py-1 text-xs font-medium text-blue-900">
                      {row.halfDay}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="icon-sm" className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer" aria-label="View attendance details" onClick={() => openDetailsModal(row)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MarkAttendanceModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedRecord(null); }}
        onSave={(date, entries) => {
          const apiEntries = entries.map((e) => {
            const apiStatusMap: Record<string, 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'COMPANY_HOLIDAY'> = {
              'Present': 'PRESENT',
              'Absent': 'ABSENT',
              'Half-day': 'HALF_DAY',
              'Company Holiday': 'COMPANY_HOLIDAY'
            };
            return {
              employeeId: e.employeeId,
              status: apiStatusMap[e.status] || 'PRESENT',
              remarks: e.remarks,
            };
          });
          upsertMutation.mutate({ date, records: apiEntries });
        }}
        employees={employeeOptions}
        defaultDate={selectedRecord?.date}
      />

      <EmployeeAttendanceDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedEmployee(null); }}
        employeeId={selectedEmployee?.id || ''}
        employeeName={selectedEmployee?.name || ''}
        records={detailsRecords}
        onSave={async (updates) => {
          const promises = updates.map(update => {
            const apiStatusMap: Record<string, 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'COMPANY_HOLIDAY'> = {
              'Present': 'PRESENT',
              'Absent': 'ABSENT',
              'Half-day': 'HALF_DAY',
              'Leave': 'COMPANY_HOLIDAY'
            };
            return upsertMutation.mutateAsync({
              date: update.date,
              records: [{
                employeeId: update.employeeId,
                status: apiStatusMap[update.status] || 'PRESENT',
                remarks: '',
              }]
            });
          });
          await Promise.all(promises);
          setIsDetailsModalOpen(false);
          setSelectedEmployee(null);
        }}
      />
    </div>
  );
}
