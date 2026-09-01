import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, AlertTriangle, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from '@/components/shared/loader';
import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';
import { useCompanies, formatCompanyDate, type Company } from './companies-queries';
import { CompanyFormDialog } from './company-form-dialog';

/**
 * Companies list for the Livik Admin panel — table view with Add/Edit
 * actions and per-row navigation into Company Details, backed by
 * GET/POST /api/v1/platform/admin/companies.
 */
export function CompaniesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading, isError } = useCompanies('');
  const [formState, setFormState] = useState<{ mode: 'add' | 'edit'; company: Company | null } | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCompanies = useMemo(() => {
    let items = (data?.data ?? []).slice();
    if (searchQuery || statusFilter !== 'ALL') {
      const q = searchQuery.toLowerCase();
      items = items.filter(c => {
        const matchesSearch = !q || (
          c.name?.toLowerCase().includes(q) ||
          c.companyCode?.toLowerCase().includes(q) ||
          c.adminMobile?.toLowerCase().includes(q) ||
          c.gst?.toLowerCase().includes(q)
        );
        const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'Active' ? c.isActive : !c.isActive);
        return matchesSearch && matchesStatus;
      });
    }
    return items.sort((a, b) => {
      if (!a.companyCode) return 1;
      if (!b.companyCode) return -1;
      return a.companyCode.localeCompare(b.companyCode, undefined, { numeric: true });
    });
  }, [data, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;
  const pagedCompanies = useMemo(() => filteredCompanies.slice((page - 1) * pageSize, page * pageSize), [filteredCompanies, page, pageSize]);

  return (
    <div id="companies-layout" className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      <style>{`
        #companies-layout, #companies-layout * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
        #companies-layout .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
      `}</style>

      {/* Unified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[20px] font-bold text-black leading-tight px-2">Companies</h1>
            <p className="text-[12.5px] text-gray-500 font-medium px-2">Manage all companies registered in the system</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="h-9 w-44 sm:w-60 pl-8 bg-white border-gray-400 text-[13px] rounded-md"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="!h-9 w-32 bg-white border-gray-400 text-[13px] rounded-md">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="bg-green-900 text-white gap-2 rounded-md px-4 h-9 text-[13px] font-semibold cursor-pointer"
            onClick={() => setFormState({ mode: 'add', company: null })}
          >
            <Plus className="w-3.5 h-3.5" /> Add Company
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
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 pl-5 text-left bg-white">Company Id</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Company</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">GST Number</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Admin Mobile</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Last-Login</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-right pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={7} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col justify-center items-center gap-3 text-gray-500">
                        <Loader size="lg" />
                        <span className="text-[14px] font-semibold">Loading companies...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={7} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col items-center justify-center gap-3 text-red-600">
                        <AlertTriangle className="w-10 h-10 text-red-500 opacity-90" />
                        <span className="text-[14px] font-semibold">Unable to load companies. Please try again.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pagedCompanies.length === 0 ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={7} className="h-[65vh] text-center align-middle border-b-0">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                        <SearchX className="w-10 h-10 text-gray-400 opacity-80" />
                        <span className="text-[14px] font-semibold">No companies found.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedCompanies.map((company) => (
                    <TableRow key={company.id} className="border-b border-gray-400 last:border-b-0 even:bg-[#FAF8F2] hover:bg-green-50 transition-colors">
                      <TableCell className="pl-5 py-3.5 text-left">
                        <button
                          type="button"
                          className="text-left font-semibold text-green-600 hover:text-[#4C7A50] hover:underline text-[13px] cursor-pointer"
                          onClick={() => navigate(`/admin/companies/${company.id}`)}
                        >
                          {company.companyCode}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2.5 font-semibold text-gray-900 text-[13px]">
                          {company.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 text-[13px] text-center">{company.gst ?? '—'}</TableCell>
                      <TableCell className="text-gray-700 text-[13px] text-center">{company.adminMobile}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${company.isActive ? 'bg-[#EAF3E6] text-[#4C7A50]' : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                          {company.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 text-[13px] text-center">{formatCompanyDate(company.updatedAt)}</TableCell>
                      <TableCell className="pr-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-gray-300 bg-white hover:bg-blue-50 cursor-pointer"
                            aria-label={`Edit ${company.name}`}
                            onClick={() => setFormState({ mode: 'edit', company })}
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-gray-300 bg-white hover:bg-red-50 cursor-pointer"
                            aria-label={`Delete ${company.name}`}
                            onClick={() => setCompanyToDelete(company)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredCompanies.length > 0 && (
            <div className="grid grid-cols-3 items-center px-5 py-3 border-t border-gray-400 text-[12px] text-gray-900">
              <div className="justify-self-start">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredCompanies.length)} of {filteredCompanies.length}
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

        {formState && <CompanyFormDialog company={formState.company} onClose={() => setFormState(null)} />}

        <Dialog open={!!companyToDelete} onOpenChange={(open) => !open && setCompanyToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Company</DialogTitle>
              <DialogDescription className="mt-2">
                Are you sure you want to delete <strong>{companyToDelete?.name}</strong> ({companyToDelete?.companyCode})? This action cannot be undone and will remove all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button className="text-xs " variant="outline" onClick={() => setCompanyToDelete(null)} disabled={isDeleting}>Cancel</Button>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  // Placeholder for actual API call
                  setTimeout(() => {
                    console.log('Deleted', companyToDelete?.id);
                    setIsDeleting(false);
                    setCompanyToDelete(null);
                  }, 800);
                }}
              >
                {isDeleting && <Loader size="sm" className="mr-2 text-white" />}
                Delete Company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
