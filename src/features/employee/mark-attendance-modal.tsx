import { useState, useEffect } from 'react';
import { Search, Calendar as CalendarIcon, Clock, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AttendanceEmployeeOption {
  id: string;
  name: string;
  role: string;
}

export interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  readOnly?: boolean;
  initialData?: any;
  employees: AttendanceEmployeeOption[];
}

// Converts a 24h "HH:MM" input value to a "hh:mm AM/PM" display string.
function formatTime12h(time: string): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${mStr} ${period}`;
}

// Converts a "hh:mm AM/PM" display string back to a 24h "HH:MM" input value.
function parseTime12h(time: string): string {
  if (!time) return '';
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';
  let h = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${match[2]}`;
}

export function MarkAttendanceModal({ isOpen, onClose, onSave, readOnly = false, initialData = null, employees }: MarkAttendanceModalProps) {
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId || '');
  const [date, setDate] = useState(initialData?.date || '2023-10-27');
  const [status, setStatus] = useState<'Present' | 'Absent' | 'Half-day'>(initialData?.status || 'Present');
  const [checkIn, setCheckIn] = useState(parseTime12h(initialData?.checkIn) || '09:00');
  const [checkOut, setCheckOut] = useState(parseTime12h(initialData?.checkOut) || '18:00');
  const [remarks, setRemarks] = useState(initialData?.remarks || '');

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setEmployeeId(initialData?.employeeId || '');
      setDate(initialData?.date || '2023-10-27');
      setStatus(initialData?.status || 'Present');
      setCheckIn(parseTime12h(initialData?.checkIn) || '09:00');
      setCheckOut(parseTime12h(initialData?.checkOut) || '18:00');
      setRemarks(initialData?.remarks || '');
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    const employee = employees.find((e) => e.id === employeeId);
    onSave({
      date,
      employeeId,
      employeeName: employee?.name ?? 'Unknown Employee',
      role: employee?.role ?? '',
      checkIn: status === 'Absent' ? '' : formatTime12h(checkIn),
      checkOut: status === 'Absent' ? '' : formatTime12h(checkOut),
      status
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0 border-t-4 border-t-gray-300 rounded-2xl">
        <div className="flex justify-center pt-3 pb-1 bg-white">
          <div className="h-1.5 w-12 rounded-full bg-gray-300"></div>
        </div>
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-white">
          <DialogTitle className="text-xl font-semibold text-gray-900">Mark Attendance</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-5 bg-[#FAFAFA]">
          {/* Employee Select */}
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-bold text-gray-600 tracking-wide uppercase">Employee</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Select value={employeeId} onValueChange={setEmployeeId} disabled={readOnly}>
                <SelectTrigger className="w-full pl-9 h-11 bg-white border-gray-200">
                  <SelectValue placeholder="Search employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-bold text-gray-600 tracking-wide uppercase">Date</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={readOnly}
                className="pl-9 h-11 bg-white border-gray-200 block w-full"
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-bold text-gray-600 tracking-wide uppercase">Status</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => !readOnly && setStatus('Present')}
                disabled={readOnly}
                className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors border ${status === 'Present'
                  ? 'bg-[#EAF3EE] text-[#0B503B] border-[#0B503B]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  } ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                Present
              </button>
              <button
                type="button"
                onClick={() => !readOnly && setStatus('Absent')}
                disabled={readOnly}
                className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors border ${status === 'Absent'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  } ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                Absent
              </button>
              <button
                type="button"
                onClick={() => !readOnly && setStatus('Half-day')}
                disabled={readOnly}
                className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors border ${status === 'Half-day'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  } ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                Half-day
              </button>
            </div>
          </div>

          {/* Check-in / Check-out */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-[11px] font-bold text-gray-600 tracking-wide uppercase">Check-In</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  disabled={readOnly}
                  className="pl-9 h-11 bg-white border-gray-200 w-full"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-[11px] font-bold text-gray-600 tracking-wide uppercase">Check-Out</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  disabled={readOnly}
                  className="pl-9 h-11 bg-white border-gray-200 w-full"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-bold text-gray-600 tracking-wide uppercase">Remarks (Optional)</Label>
            <textarea
              placeholder="Add any notes here..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={readOnly}
              className={`w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B503B] focus:border-transparent resize-none h-24 ${readOnly ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 px-6 py-5 bg-white border-t border-gray-100 sm:flex-col sm:justify-start">
          {!readOnly && (
            <Button
              onClick={handleSubmit}
              className="w-full h-12 bg-[#0B503B] hover:bg-[#083A2A] text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" /> Mark Attendance
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-12 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
