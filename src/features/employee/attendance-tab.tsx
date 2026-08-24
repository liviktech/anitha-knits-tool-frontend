import { useState } from 'react';
import { Search, SlidersHorizontal, Plus, Calendar, Edit2, Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MarkAttendanceModal } from './mark-attendance-modal';

function todayFormatted() {
  const date = new Date();
  return `Today, ${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Absent' | 'Half-day' | 'Leave';
}

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-1', date: '2026-08-24', employeeId: 'EMP-1042', employeeName: 'Karthik S.', checkIn: '09:00 AM', checkOut: '06:15 PM', status: 'Present' },
  { id: 'att-2', date: '2026-08-24', employeeId: 'EMP-1088', employeeName: 'Priya Ramesh', checkIn: '', checkOut: '', status: 'Absent' },
  { id: 'att-3', date: '2026-08-24', employeeId: 'EMP-0931', employeeName: 'Muthukumar S.', checkIn: '09:15 AM', checkOut: '01:30 PM', status: 'Half-day' },
  { id: 'att-4', date: '2026-08-24', employeeId: 'EMP-1102', employeeName: 'Lakshmi N.', checkIn: '08:45 AM', checkOut: '05:30 PM', status: 'Present' },
];

export function AttendanceTab() {
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);

  const openViewModal = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setRecords(records.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  const presentCount = records.filter(r => r.status === 'Present').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;
  const halfDayCount = records.filter(r => r.status === 'Half-day').length;

  const filteredRecords = records.filter(r =>
    r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Search and Table Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 w-full rounded-lg border-gray-200 shadow-sm"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-gray-200 shadow-sm">
            <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          </Button>
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
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-[140px]">
                CHECK-IN
              </TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-[140px]">
                CHECK-OUT
              </TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-[120px] text-center">
                STATUS
              </TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-[100px] text-right">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-gray-500">
                  No attendance records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((rec) => (
                <TableRow key={rec.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <TableCell className="py-3 px-5">
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); openViewModal(rec); }}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {rec.employeeId}
                    </a>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                        {rec.employeeName.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{rec.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <span className="text-sm text-gray-900">{rec.checkIn || <span className="italic text-gray-400">N/A</span>}</span>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <span className="text-sm text-gray-900">{rec.checkOut || <span className="italic text-gray-400">N/A</span>}</span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${rec.status === 'Present'
                          ? 'bg-[#4ADE80] text-emerald-900'
                          : rec.status === 'Absent'
                            ? 'bg-[#FECDD3] text-rose-900'
                            : rec.status === 'Half-day'
                              ? 'bg-[#BFDBFE] text-blue-900'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {rec.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="icon-sm" className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer" aria-label="Edit attendance" onClick={() => openViewModal(rec)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="h-7 w-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer" aria-label="Delete attendance" onClick={() => setDeleteTarget(rec)}>
                        <Trash2 className="h-3.5 w-3.5" />
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
        onSave={(data) => {
          setRecords([{ id: `att-${Date.now()}`, ...data }, ...records]);
        }}
        readOnly={!!selectedRecord}
        initialData={selectedRecord}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Attendance Record"
        description={`Are you sure you want to delete the attendance record for ${deleteTarget?.employeeName}? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
