import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, SearchX, Eye, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from '@/components/shared/loader';
import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';
import { useLivikEmployees, type LivikEmployee } from './livik-employees-queries';
import { usePlatformEmployeeAccess } from './platform-roles-tab-queries';

function formatUserDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function UserDetailDialog({ user, onClose }: { user: LivikEmployee | null; onClose: () => void }) {
  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border border-gray-400 p-0 overflow-hidden">
        <DialogHeader className="border-b border-gray-200 bg-[#F4F1E8] px-5 py-3">
          <DialogTitle className="text-lg font-bold text-black">Employee Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Employee ID</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.empId}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Name</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{`${user.firstName} ${user.lastName}`.trim() || 'Unnamed'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.email || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Phone</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.phoneNumber || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Designation</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.designation || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Department</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.department || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.isActive ? 'Active' : 'Inactive'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Joined</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.dateOfJoining ? formatUserDate(user.dateOfJoining) : '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UsersListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<LivikEmployee | null>(null);

  const { data, isLoading, isError } = useLivikEmployees();
  const users = data?.data ?? [];

  const { data: employeeAccess = [] } = usePlatformEmployeeAccess();
  const roleNameByEmpId = useMemo(() => {
    const map = new Map<string, string>();
    employeeAccess.forEach((row) => {
      if (row.isActive && row.roleName) map.set(row.livikEmpId, row.roleName);
    });
    return map;
  }, [employeeAccess]);

  const filteredUsers = useMemo(() => {
    let items = [...users];
    if (searchQuery || statusFilter !== 'ALL') {
      const q = searchQuery.toLowerCase();
      items = items.filter(u => {
        const matchesSearch = !q || (
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.empId?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phoneNumber?.toLowerCase().includes(q) ||
          u.designation?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q)
        );
        const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'Active' ? u.isActive : !u.isActive);
        return matchesSearch && matchesStatus;
      });
    }
    return items;
  }, [users, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const pagedUsers = useMemo(() => filteredUsers.slice((page - 1) * pageSize, page * pageSize), [filteredUsers, page, pageSize]);

  return (
    <div id="users-layout" className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      <style>{`
        #users-layout, #users-layout * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
        #users-layout .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
      `}</style>

      {/* Unified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[20px] font-bold text-black leading-tight px-2">Users</h1>
            <p className="text-[12.5px] text-gray-500 font-medium px-2">Livik employees</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="h-9 w-44 sm:w-60 pl-8 bg-white border-gray-400 text-[13px] rounded-md"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="!h-9 w-32 bg-white border-gray-400 text-[13px] rounded-md">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm" className="h-9 border-gray-300 text-gray-700 hover:bg-gray-50">
            <Link to="/admin/roles">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Manage Roles
            </Link>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col p-2 gap-2 w-full max-w-[1600px] mx-auto">
        <Card className="rounded-xl border border-gray-400 shadow-sm bg-white overflow-hidden p-0 flex flex-col h-full">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
                <TableRow className="hover:bg-transparent border-b border-gray-400 bg-white">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 pl-5 text-left bg-white">Emp ID</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-left">Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-left">Designation</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-left">Department</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">LK Space Role</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Phone</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Joined</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={9} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col justify-center items-center gap-3 text-gray-500">
                        <Loader size="lg" />
                        <span className="text-[14px] font-semibold">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={9} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col items-center justify-center gap-3 text-red-600">
                        <AlertTriangle className="w-10 h-10 text-red-500 opacity-90" />
                        <span className="text-[14px] font-semibold">Unable to load users. Please try again.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pagedUsers.length === 0 ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={9} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                        <SearchX className="w-10 h-10 text-gray-400 opacity-80" />
                        <span className="text-[14px] font-semibold">No users found.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedUsers.map((u) => (
                    <TableRow key={u.id} className="border-b border-gray-400 last:border-b-0 even:bg-[#FAF8F2] hover:bg-green-50 transition-colors">
                      <TableCell className="pl-5 py-3.5 text-left font-semibold text-gray-900 text-[13px]">
                        {u.empId}
                      </TableCell>
                      <TableCell className="text-gray-700 text-[13px] text-left">{`${u.firstName} ${u.lastName}`.trim() || 'Unnamed'}</TableCell>
                      <TableCell className="text-gray-700 text-[13px] text-left">{u.designation || '—'}</TableCell>
                      <TableCell className="text-gray-700 text-[13px] text-left">{u.department || '—'}</TableCell>
                      <TableCell className="text-center">
                        {roleNameByEmpId.get(u.empId) ? (
                          <span className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                            {roleNameByEmpId.get(u.empId)}
                          </span>
                        ) : (
                          <span className="text-[12px] text-gray-400">No access</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700 text-[13px] text-center">{u.phoneNumber || '—'}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${u.isActive ? 'bg-[#EAF3E6] text-[#4C7A50]' : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 text-[13px] text-center">
                        {u.dateOfJoining ? formatUserDate(u.dateOfJoining) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="sm" className="h-8 border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setSelectedUser(u)}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length > 0 && (
            <div className="grid grid-cols-3 items-center px-5 py-3 border-t border-gray-400 text-[12px] text-gray-900">
              <div className="justify-self-start">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length}
              </div>
              <div className="justify-self-center">
                <TablePaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
              <div className="justify-self-end">
                <RowsPerPageSelect
                  pageSize={pageSize}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <UserDetailDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}
