import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { Loader } from '@/components/shared/loader';
import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';
import {
  useCreateRight,
  useDeleteRight,
  useUpdateRight,
  type ModuleRecord,
  type RightAction as RightActionValue,
  type RightRecord,
  type TabRecord,
} from './roles-tab-queries';

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

function actionBadgeClass(action: RightActionValue): string {
  switch (action) {
    case 'VIEW': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'ADD': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'EDIT': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'DELETE': return 'bg-red-50 text-red-700 border-red-200';
  }
}

/* ============================================================= */
/* ADD / EDIT RIGHT DIALOG                                      */
/* ============================================================= */

interface RightFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: RightRecord | null;
  modules: ModuleRecord[];
  tabs: TabRecord[];
  onSubmit: (data: { moduleId: string; tabId: string | null; action: RightActionValue }) => Promise<boolean>;
  isPending: boolean;
  serverError?: string | null;
}

const NO_TAB_VALUE = '__none__';

const ACTION_OPTIONS: { value: RightActionValue; label: string }[] = [
  { value: 'VIEW', label: 'View' },
  { value: 'ADD', label: 'Add' },
  { value: 'EDIT', label: 'Edit' },
  { value: 'DELETE', label: 'Delete' },
];

function RightFormDialog({ open, onOpenChange, initial, modules, tabs, onSubmit, isPending, serverError }: RightFormDialogProps) {
  const [moduleId, setModuleId] = useState('');
  const [tabId, setTabId] = useState<string | null>(null);
  const [action, setAction] = useState<RightActionValue | ''>('');
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = initial != null;

  useEffect(() => {
    if (open) {
      setModuleId(initial?.moduleId ?? '');
      setTabId(initial?.tabId ?? null);
      setAction(initial?.action ?? '');
      setFormError(null);
    }
  }, [open, initial]);

  const tabsForModule = useMemo(() => tabs.filter((t) => t.moduleId === moduleId), [tabs, moduleId]);

  const handleModuleChange = (value: string) => {
    setModuleId(value);
    if (!tabs.some((t) => t.id === tabId && t.moduleId === value)) setTabId(null);
  };

  const handleSubmit = async () => {
    if (!moduleId || !action) {
      setFormError('Please select a module and an action.');
      return;
    }
    setFormError(null);
    const ok = await onSubmit({ moduleId, tabId, action });
    if (ok) onOpenChange(false);
  };

  const displayError = formError ?? serverError;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-sm border border-gray-400">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-lg font-bold text-black">{isEdit ? 'Edit Right' : 'Add Right'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Module</Label>
            <Select value={moduleId} onValueChange={handleModuleChange}>
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue placeholder="Select a module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.moduleName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Tab</Label>

            {!moduleId && (
              <Select disabled>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Select a module first" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            )}

            {moduleId && tabsForModule.length > 0 && (
              <Select value={tabId ?? NO_TAB_VALUE} onValueChange={(v) => setTabId(v === NO_TAB_VALUE ? null : v)}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TAB_VALUE}>Whole module</SelectItem>
                  {tabsForModule.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.tabName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {moduleId && tabsForModule.length === 0 && (
              <p className="text-[13px] text-gray-500">
                No tabs configured.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as RightActionValue)}>
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {displayError && <p className="text-xs text-red-600 font-medium">{displayError}</p>}
        </div>

        <DialogFooter className="border-gray-200 bg-white">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
            {isPending && <Loader size="sm" className="mr-1.5" />}
            {isEdit ? 'Save Changes' : 'Add Right'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================= */
/* RIGHTS SUB-TAB COMPONENT                                      */
/* ============================================================= */

export interface RightsSubTabProps {
  rights: RightRecord[];
  modules: ModuleRecord[];
  tabs: TabRecord[];
  createRight: ReturnType<typeof useCreateRight>;
  updateRight: ReturnType<typeof useUpdateRight>;
  deleteRight: ReturnType<typeof useDeleteRight>;
}

export function RightsSubTab({
  rights,
  modules,
  tabs,
  createRight,
  updateRight,
  deleteRight,
}: RightsSubTabProps) {
  const [rightSearch, setRightSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [rightsPage, setRightsPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [isRightDialogOpen, setIsRightDialogOpen] = useState(false);
  const [editingRight, setEditingRight] = useState<RightRecord | null>(null);
  const [deleteRightTarget, setDeleteRightTarget] = useState<RightRecord | null>(null);

  const filteredRights = useMemo(() => {
    const q = rightSearch.trim().toLowerCase();
    return rights.filter((r) => {
      const matchesModule = moduleFilter === 'all' || r.moduleId === moduleFilter;
      const matchesSearch = !q
        || r.displayName.toLowerCase().includes(q)
        || r.rightName.toLowerCase().includes(q)
        || r.moduleName.toLowerCase().includes(q)
        || (r.tabName ?? '').toLowerCase().includes(q);
      return matchesModule && matchesSearch;
    });
  }, [rights, rightSearch, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRights.length / pageSize));

  const paginatedRights = useMemo(() => {
    const start = (Math.min(rightsPage, totalPages) - 1) * pageSize;
    return filteredRights.slice(start, start + pageSize);
  }, [filteredRights, rightsPage, pageSize, totalPages]);

  const handleRightSearchChange = (value: string) => { setRightSearch(value); setRightsPage(1); };
  const handleModuleFilterChange = (value: string) => { setModuleFilter(value); setRightsPage(1); };

  const handleOpenAddRight = () => { setEditingRight(null); setIsRightDialogOpen(true); };
  const handleOpenEditRight = (right: RightRecord) => { setEditingRight(right); setIsRightDialogOpen(true); };

  const handleRightSubmit = (data: { moduleId: string; tabId: string | null; action: RightActionValue }) =>
    editingRight
      ? updateRight.mutate({ id: editingRight.id, ...data })
      : createRight.mutate(data);

  const handleConfirmDeleteRight = async () => {
    if (!deleteRightTarget) return;
    const ok = await deleteRight.mutate(deleteRightTarget.id);
    if (ok) setDeleteRightTarget(null);
  };

  return (
    <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="border-b border-emerald-400 p-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search rights..."
              value={rightSearch}
              onChange={(e) => handleRightSearchChange(e.target.value)}
              className="h-8 w-44 sm:w-60 pl-8 bg-gray-50/50 border-gray-400 text-xs rounded-lg font-hanken"
            />
          </div>

          <Select value={moduleFilter} onValueChange={handleModuleFilterChange}>
            <SelectTrigger className="h-8 w-40 bg-gray-50/50 border-gray-400 text-xs rounded-lg font-hanken">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.moduleName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleOpenAddRight}
          className="h-8 gap-1.5 bg-[#004D40] text-xs font-semibold text-white hover:bg-[#00382e] rounded-lg px-3"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Right
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="border-collapse font-hanken">
          <TableHeader className="bg-emerald-50/30 sticky top-0 z-10">
            <TableRow className="border-b border-gray-300">
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-left border-r border-gray-300">
                RIGHT ID
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                MODULE / TAB
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                ACTION
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                DISPLAY NAME
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                CREATED AT
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-right">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 !text-center text-gray-500 text-sm">
                  No rights found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRights.map((right) => (
                <TableRow
                  key={right.id}
                  className="border-b border-gray-300 hover:bg-emerald-50/30 transition-colors"
                >
                  <TableCell className="py-3 px-5 text-left border-r border-gray-300">
                    <span className="text-sm font-semibold text-blue-600 font-mono">
                      {right.id.slice(0, 8)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center border-r border-gray-300 text-sm font-medium text-gray-700">
                    {right.moduleName}
                    {right.tabName && <> <span className="text-gray-400">/</span> {right.tabName}</>}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center border-r border-gray-300 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${actionBadgeClass(right.action)}`}>
                      {right.action}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center border-r border-gray-300 text-sm font-semibold text-gray-900">
                    {right.displayName}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-center border-r border-gray-300 text-sm text-gray-600">
                    {formatDate(right.createdAt)}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => handleOpenEditRight(right)}
                        className="h-7 w-7 rounded-full p-1.5 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => setDeleteRightTarget(right)}
                        className="h-7 w-7 rounded-full p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Footer matching Employees Tab */}
      <div className="p-3 border-t border-gray-400 bg-emerald-50/20 text-xs text-gray-700 flex flex-wrap justify-between items-center gap-3 px-4">
        <span>
          Showing {filteredRights.length === 0 ? 0 : (rightsPage - 1) * pageSize + 1}-
          {Math.min(rightsPage * pageSize, filteredRights.length)} of {filteredRights.length} rights
        </span>

        <TablePaginationControls
          currentPage={rightsPage}
          totalPages={totalPages}
          onPageChange={setRightsPage}
        />

        <RowsPerPageSelect
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setRightsPage(1);
          }}
          options={[5, 10, 20, 50]}
        />
      </div>

      <RightFormDialog
        open={isRightDialogOpen}
        onOpenChange={(next) => { setIsRightDialogOpen(next); if (!next) { createRight.resetError(); updateRight.resetError(); } }}
        initial={editingRight}
        modules={modules}
        tabs={tabs}
        onSubmit={handleRightSubmit}
        isPending={editingRight ? updateRight.isPending : createRight.isPending}
        serverError={editingRight ? updateRight.error : createRight.error}
      />

      <DeleteConfirmDialog
        open={!!deleteRightTarget}
        onOpenChange={(next) => { if (!next) { setDeleteRightTarget(null); deleteRight.resetError(); } }}
        onConfirm={handleConfirmDeleteRight}
        isPending={deleteRight.isPending}
        title="Delete this right?"
        description={deleteRight.error ?? (deleteRightTarget ? `Are you sure you want to delete this record?` : undefined)}
      />
    </div>
  );
}
