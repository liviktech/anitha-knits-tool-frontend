import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface AttendanceEmployeeOption {
  id: string;
  name: string;
  role: string;
  customUserId?: string;
}

export type DailyStatus = 'Present' | 'Absent' | 'Half-day' | 'Company Holiday';

export interface DailyAttendanceEntry {
  employeeId: string;
  employeeName: string;
  role: string;
  status: DailyStatus;
  remarks: string;
}

export interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string, entries: DailyAttendanceEntry[]) => void;
  employees: AttendanceEmployeeOption[];
  defaultDate?: string;
  isSaving?: boolean;
  existingRecords?: { employeeId: string; date: string; status: DailyStatus }[];
}

const STATUS_OPTIONS: { value: DailyStatus; label: string; activeClass: string }[] = [
  { value: 'Present', label: 'Present', activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'Absent', label: 'Absent', activeClass: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'Half-day', label: 'Half Day', activeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'Company Holiday', label: 'Company Holiday', activeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
];

export function MarkAttendanceModal({ isOpen, onClose, onSave, employees, defaultDate, isSaving, existingRecords = [] }: MarkAttendanceModalProps) {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [statusMap, setStatusMap] = useState<Record<string, DailyStatus>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (!defaultDate && !date) {
        setDate(new Date().toISOString().slice(0, 10));
      }
      setSearch('');
    }
  }, [isOpen, defaultDate]);

  useEffect(() => {
    if (isOpen) {
      const initialStatusMap: Record<string, DailyStatus> = {};
      const targetDate = date || defaultDate || new Date().toISOString().slice(0, 10);
      
      existingRecords.forEach(r => {
        if (r.date.split('T')[0] === targetDate) {
          // r.employeeId is the customUserId or rawId, we need to map it to the employee option id
          const emp = employees.find(e => e.customUserId === r.employeeId || e.id === r.employeeId);
          if (emp) {
            initialStatusMap[emp.id] = r.status;
          }
        }
      });
      setStatusMap(initialStatusMap);
      setRemarksMap({}); // We can also populate remarks if they were passed
    }
  }, [date, isOpen, existingRecords, employees]);

  const filtered = employees.filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase()) || 
           (e.customUserId || e.id).toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = () => {
    const entries: DailyAttendanceEntry[] = employees
      .filter((e) => statusMap[e.id])
      .map((e) => ({ employeeId: e.id, employeeName: e.name, role: e.role, status: statusMap[e.id], remarks: remarksMap[e.id] || '' }));
    onSave(date, entries);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden gap-0 rounded-2xl border border-gray-400">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-[#A8DCAB]">
          <DialogTitle className="text-xl font-semibold text-black">Mark Daily Attendance</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-gray-100">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44 h-10" />
          <div className="relative flex-1 min-w-45">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          {/* <Button variant="link" onClick={markAllPresent} className="text-blue-600 font-semibold whitespace-nowrap px-0">
            Mark All Present
          </Button> */}
        </div>

        <div className="max-h-105 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-6 py-3">Employee</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-t border-gray-100">
                  <td className="px-6 py-3 align-top">
                    <div className="font-semibold text-gray-900">{emp.name}</div>
                    <div className="text-xs text-blue-600">{emp.customUserId || emp.id}</div>
                  </td>
                  <td className="px-6 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatusMap((m) => ({ ...m, [emp.id]: opt.value }))}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            statusMap[emp.id] === opt.value ? opt.activeClass : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 align-top">
                    <Input
                      placeholder="Optional remarks"
                      value={remarksMap[emp.id] || ''}
                      onChange={(e) => setRemarksMap((m) => ({ ...m, [emp.id]: e.target.value }))}
                      className="h-9"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex flex-row justify-end gap-3 px-6 py-2 border-t border-gray-200 bg-white sm:justify-end m-1">
          <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#004D40] hover:bg-[#00332a] text-white rounded-lg">
            Add
            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
