import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface SummaryRow {
  employeeId: string;
  employeeName: string;
  role: string;
  workingDays: number;
  present: number;
  absent: number;
}

export interface SummaryAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryRows: SummaryRow[];
  isLoading: boolean;
}

export function SummaryAttendanceModal({ isOpen, onClose, summaryRows, isLoading }: SummaryAttendanceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden gap-0 rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-white">
          <DialogTitle className="text-xl font-semibold text-gray-900">Attendance Summary</DialogTitle>
        </DialogHeader>

        <div className="max-h-120 overflow-y-auto p-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F8F9FA]">
                <TableRow className="hover:bg-transparent border-b border-gray-300">
                  <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5">
                    EMP ID
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5">
                    EMPLOYEE NAME
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-40 text-center">
                    ACTUAL WORKING DAYS
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-32.5 text-center">
                    NO. OF PRESENT
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-gray-500 py-4 px-5 w-32.5 text-center">
                    NO. OF ABSENT
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-gray-500">
                      Loading attendance records...
                    </TableCell>
                  </TableRow>
                ) : summaryRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-gray-500">
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  summaryRows.map((row) => (
                    <TableRow key={row.employeeId} className="border-b border-gray-300 hover:bg-gray-50/50">
                      <TableCell className="py-3 px-5">
                        <span className="text-sm font-semibold text-blue-600">{row.employeeId}</span>
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
                        <span className="text-sm font-semibold text-gray-900">{row.workingDays}</span>
                      </TableCell>
                      <TableCell className="py-3 px-5 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-[#4ADE80] px-3 py-1 text-xs font-medium text-emerald-900">{row.present}</span>
                      </TableCell>
                      <TableCell className="py-3 px-5 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-[#FECDD3] px-3 py-1 text-xs font-medium text-rose-900">{row.absent}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-white">
          <Button onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
