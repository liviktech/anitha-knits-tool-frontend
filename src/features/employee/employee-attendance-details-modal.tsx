import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AttendanceRecord } from './attendance-tab';
import { Loader2 } from 'lucide-react';

export interface EmployeeAttendanceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  records: AttendanceRecord[];
  onSave?: (updates: { employeeId: string; date: string; status: string }[]) => Promise<void>;
}

export function EmployeeAttendanceDetailsModal({ isOpen, onClose, employeeId, employeeName, records, onSave }: EmployeeAttendanceDetailsModalProps) {
  const [editedStatuses, setEditedStatuses] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditedStatuses({});
    }
  }, [isOpen]);

  const handleStatusChange = (date: string, newStatus: string) => {
    setEditedStatuses(prev => ({
      ...prev,
      [date]: newStatus
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const updates = Object.entries(editedStatuses).map(([date, status]) => ({
        employeeId,
        date,
        status
      }));
      await onSave(updates);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(editedStatuses).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 rounded-2xl border border-gray-400">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-[#A8DCAB]">
          <DialogTitle className="text-xl font-semibold text-black">{employeeName}'s Attendance Details</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F8F9FA]">
                <TableRow className="hover:bg-transparent border-b border-gray-300">
                  <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-3 px-5">
                    DATE
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-3 px-5">
                    STATUS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-28 text-center text-gray-500">
                      No attendance records found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((rec) => {
                    const currentStatus = editedStatuses[rec.date] || rec.status;
                    return (
                      <TableRow key={rec.id} className="border-b border-gray-300 hover:bg-gray-50/50">
                        <TableCell className="py-3 px-5 w-1/2">
                          <span className="text-sm font-medium text-gray-900">{rec.date}</span>
                        </TableCell>
                        <TableCell className="py-3 px-5">
                          <Select
                            value={currentStatus}
                            onValueChange={(val) => handleStatusChange(rec.date, val)}
                          >
                            <SelectTrigger className="w-full h-8 bg-white border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                              <SelectItem value="Half-day">Half-day</SelectItem>
                              <SelectItem value="Leave">Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center w-full sm:justify-between">
          <Button onClick={onClose} variant="outline" className="bg-white text-gray-700 hover:bg-gray-50 rounded-lg h-9">
            Cancel
          </Button>
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-[#004D40] text-white hover:bg-[#00332a] rounded-lg h-9"
            >
              Update
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
