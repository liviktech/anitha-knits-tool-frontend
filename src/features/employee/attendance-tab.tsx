import { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Search, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MarkAttendanceModal } from './mark-attendance-modal';
import { EmployeeAttendanceDetailsModal } from './employee-attendance-details-modal';
import { useEmployees } from './employee-queries';
import { useAttendanceRecords, useUpsertAttendance } from './attendance-queries';

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

export interface AttendanceTabRef {
  openAddModal: () => void;
}

export const AttendanceTab = forwardRef<AttendanceTabRef>((_props, ref) => {
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

  useImperativeHandle(ref, () => ({ openAddModal }));

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
    <div className="flex flex-col gap-2 h-[calc(100%-3px)] flex-1 min-h-0 p-2">
      {/* Header section */}
      <div className="flex items-center justify-end">
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" style={{ fontFamily: "'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif" }}>
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-emerald-400 transition-colors flex flex-col h-full justify-center">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/present.png" alt="" className="w-18 h-18 object-contain" />
          </div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div><img src="/present.png" alt="Present" className="w-13 h-13 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">Present</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{presentCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-red-400 transition-colors flex flex-col h-full justify-center">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/absent.png" alt="" className="w-18 h-18 object-contain" />
          </div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div><img src="/absent.png" alt="Absent" className="w-13 h-13 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">Absent</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{absentCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-400 transition-colors flex flex-col h-full justify-center">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/halfday.png" alt="" className="w-18 h-18 object-contain" />
          </div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div><img src="/halfday.png" alt="Half-day" className="w-13 h-13 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">Half-day</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{halfDayCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Filters and Table Actions */}
        <div className="border-b border-emerald-400 p-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"></div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-44 sm:w-60 pl-8 bg-gray-50/50 border-gray-400 text-xs rounded-lg font-hanken"
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-8 w-32 bg-gray-50/50 border-gray-400 text-sm rounded-lg font-hanken">
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
              <SelectTrigger className="h-8 w-28 bg-gray-50/50 border-gray-400 text-sm rounded-lg font-hanken">
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
              <SelectTrigger className="h-8 w-40 bg-gray-50/50 border-gray-400 text-sm rounded-lg font-hanken">
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 flex flex-col">
          <Table className="font-hanken">
            <TableHeader className="bg-emerald-50/30">
              <TableRow className="hover:bg-transparent border-b border-emerald-300">
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 py-2 px-5 text-left w-[15%] border-r border-emerald-300">
                  EMP ID
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 py-2 px-5 text-center w-[17%] border-r border-emerald-300">
                  EMPLOYEE NAME
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 py-2 px-5 text-center w-[17%] border-r border-emerald-300">
                  PRESENT DAYS
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 py-2 px-5 text-center w-[17%] border-r border-emerald-300">
                  ABSENT DAYS
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 py-2 px-5 text-center w-[17%] border-r border-emerald-300">
                  HALF DAYS
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 py-2 px-5 text-right w-[17%]">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && summaryRows.map((row) => (
                <TableRow key={row.employeeId} className="border-b border-gray-300 hover:bg-gray-50/50">
                  <TableCell className="py-3 px-5 text-left border-r border-gray-300">
                    <span className="text-sm font-semibold text-blue-600">
                      {row.employeeId}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center border-r border-gray-300">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                        {row.employeeName.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{row.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center border-r border-gray-300">
                    <span className="inline-flex items-center justify-center rounded-full text-green-700 px-3 py-1 text-sm font-medium text-emerald-900">
                      {row.present}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center border-r border-gray-300">
                    <span className="inline-flex items-center justify-center rounded-full text-red-500 px-3 py-1 text-sm font-medium text-rose-900">
                      {row.absent}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center border-r border-gray-300">
                    <span className="inline-flex items-center justify-center rounded-full text-[#BFDBFE] px-3 py-1 text-sm font-medium text-blue-900">
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
              }
            </TableBody>
          </Table>
          {isLoading && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-md">
              Loading attendance records...
            </div>
          )}
          {!isLoading && summaryRows.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-md">
              No attendance records found.
            </div>
          )}
        </div>
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
        isSaving={upsertMutation.isPending}
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
});
