import { useState, useMemo } from 'react';
import { Search, AlertTriangle, SearchX, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from '@/components/shared/loader';
import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api-client';

interface PlatformUser {
  id: string;
  name?: string | null;
  mobile: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
  // Based on typical employee fields
}

function usePlatformUsers(query: string = '') {
  return useQuery({
    queryKey: ['platform-users', query],
    queryFn: async () => {
      try {
        const response = await fetchJson<{ data: PlatformUser[] }>(`/employees${query ? `?${query}` : ''}`);
        return Array.isArray(response) ? response : (response.data || []);
      } catch (err) {
        // Fallback to absolute /api/employees in case it was mounted outside of /api/v1
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
        const fallbackUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '') + `/api/employees${query ? `?${query}` : ''}`;
        const fallbackRes = await fetch(fallbackUrl, { credentials: 'include' });
        if (!fallbackRes.ok) throw err;
        const fallbackData = await fallbackRes.json();
        return Array.isArray(fallbackData) ? fallbackData : (fallbackData.data || []);
      }
    },
  });
}

function formatUserDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function UserDetailDialog({ user, onClose }: { user: PlatformUser | null; onClose: () => void }) {
  if (!user) return null;

  const extra = (user as any).employeeDetails ?? {};

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border border-gray-400 p-0 overflow-hidden">
        <DialogHeader className="border-b border-gray-200 bg-[#F4F1E8] px-5 py-3">
          <DialogTitle className="text-lg font-bold text-black">User Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Name</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.name || 'Unnamed user'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Mobile</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.mobile || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Role</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.role || 'User'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.isActive !== false ? 'Active' : 'Inactive'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Company ID</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.companyId || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Joined</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.createdAt ? formatUserDate(user.createdAt) : '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Address</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 whitespace-pre-line">{extra.address || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Designation</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{extra.designation || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Gender</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{extra.gender || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Salary</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{extra.salary != null ? `₹${Number(extra.salary).toLocaleString('en-IN')}` : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Aadhaar</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{extra.aadhaarNumber || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Last Updated</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{user.updatedAt ? formatUserDate(user.updatedAt) : '—'}</p>
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
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);

  const { data: users = [], isLoading, isError } = usePlatformUsers('');

  const filteredUsers = useMemo(() => {
    let items = [...users];
    if (searchQuery || statusFilter !== 'ALL') {
      const q = searchQuery.toLowerCase();
      items = items.filter(u => {
        const matchesSearch = !q || (
          u.name?.toLowerCase().includes(q) ||
          u.mobile?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)
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
            <p className="text-[12.5px] text-gray-500 font-medium px-2">Manage all system users</p>
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
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col p-2 gap-2 w-full max-w-[1600px] mx-auto">
        <Card className="rounded-xl border border-gray-400 shadow-sm bg-white overflow-hidden p-0 flex flex-col h-full">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
                <TableRow className="hover:bg-transparent border-b border-gray-400 bg-white">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 pl-5 text-left bg-white">Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Mobile</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Role</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={6} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col justify-center items-center gap-3 text-gray-500">
                        <Loader size="lg" />
                        <span className="text-[14px] font-semibold">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={6} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col items-center justify-center gap-3 text-red-600">
                        <AlertTriangle className="w-10 h-10 text-red-500 opacity-90" />
                        <span className="text-[14px] font-semibold">Unable to load users. Please try again.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pagedUsers.length === 0 ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={6} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                        <SearchX className="w-10 h-10 text-gray-400 opacity-80" />
                        <span className="text-[14px] font-semibold">No users found.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedUsers.map((u) => (
                    <TableRow key={u.id || (u as any)._id} className="border-b border-gray-400 last:border-b-0 even:bg-[#FAF8F2] hover:bg-green-50 transition-colors">
                      <TableCell className="pl-5 py-3.5 text-left font-semibold text-gray-900 text-[13px]">
                        {u.name || ((u as any).firstName ? `${(u as any).firstName} ${(u as any).lastName || ''}` : 'Unnamed')}
                      </TableCell>
                      <TableCell className="text-gray-700 text-[13px] text-center">{u.mobile || (u as any).email || (u as any).phone || '—'}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                          {u.role || (u as any).userType || 'User'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${u.isActive !== false ? 'bg-[#EAF3E6] text-[#4C7A50]' : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 text-[13px] text-center">
                        {(u.createdAt || (u as any).created_at) ? formatUserDate(u.createdAt || (u as any).created_at) : '—'}
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
