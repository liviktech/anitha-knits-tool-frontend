import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Layers, PanelTop, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import {
  useModules,
  useTabs,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useCreateTab,
  useUpdateTab,
  useDeleteTab,
  type ModuleRecord,
  type TabRecord,
} from './roles-tab-queries';

function toCode(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ============================================================= */
/* MODULE FORM DIALOG                                            */
/* ============================================================= */

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ModuleRecord | null;
  onSubmit: (data: { moduleName: string; moduleCode: string }) => Promise<boolean>;
  isPending: boolean;
  serverError?: string | null;
}

function ModuleFormDialog({ open, onOpenChange, initial, onSubmit, isPending, serverError }: ModuleFormDialogProps) {
  const [moduleName, setModuleName] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [autoCode, setAutoCode] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = initial != null;

  useEffect(() => {
    if (open) {
      setModuleName(initial?.moduleName ?? '');
      setModuleCode(initial?.moduleCode ?? '');
      setAutoCode(!initial);
      setFormError(null);
    }
  }, [open, initial]);

  const handleNameChange = (val: string) => {
    setModuleName(val);
    if (autoCode) setModuleCode(toCode(val));
  };

  const handleSubmit = async () => {
    if (!moduleName.trim()) { setFormError('Module name is required.'); return; }
    if (!moduleCode.trim()) { setFormError('Module code is required.'); return; }
    setFormError(null);
    const ok = await onSubmit({ moduleName: moduleName.trim(), moduleCode: moduleCode.trim() });
    if (ok) onOpenChange(false);
  };

  const displayError = formError ?? serverError;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-sm border border-gray-400">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-lg font-bold text-black">
            {isEdit ? 'Edit Module' : 'Add Module'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Module Name</Label>
            <Input
              placeholder="e.g. Production Details"
              value={moduleName}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={isPending}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Module Code <span className="text-gray-400 font-normal">(unique identifier)</span>
            </Label>
            <Input
              placeholder="e.g. productiondetails"
              value={moduleCode}
              onChange={(e) => { setModuleCode(e.target.value); setAutoCode(false); }}
              disabled={isPending}
              className="h-9 text-xs font-mono"
            />
            <p className="text-[11px] text-gray-400">Lowercase letters &amp; numbers only.</p>
          </div>

          {displayError && <p className="text-xs font-medium text-red-600">{displayError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending} className="h-8 text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
            {isPending && <Loader size="sm" className="mr-1.5" />}
            {isEdit ? 'Save Changes' : 'Add Module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================= */
/* TAB FORM DIALOG                                               */
/* ============================================================= */

interface TabFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: TabRecord | null;
  modules: ModuleRecord[];
  defaultModuleId?: string;
  onSubmit: (data: { moduleId: string; tabName: string; tabCode: string }) => Promise<boolean>;
  isPending: boolean;
  serverError?: string | null;
}

function TabFormDialog({ open, onOpenChange, initial, modules, defaultModuleId, onSubmit, isPending, serverError }: TabFormDialogProps) {
  const [moduleId, setModuleId] = useState('');
  const [tabName, setTabName] = useState('');
  const [tabCode, setTabCode] = useState('');
  const [autoCode, setAutoCode] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = initial != null;

  useEffect(() => {
    if (open) {
      setModuleId(initial?.moduleId ?? defaultModuleId ?? '');
      setTabName(initial?.tabName ?? '');
      setTabCode(initial?.tabCode ?? '');
      setAutoCode(!initial);
      setFormError(null);
    }
  }, [open, initial, defaultModuleId]);

  const handleTabNameChange = (val: string) => {
    setTabName(val);
    if (autoCode) setTabCode(toCode(val));
  };

  const handleSubmit = async () => {
    if (!moduleId) { setFormError('Please select a module.'); return; }
    if (!tabName.trim()) { setFormError('Tab name is required.'); return; }
    if (!tabCode.trim()) { setFormError('Tab code is required.'); return; }
    setFormError(null);
    const ok = await onSubmit({ moduleId, tabName: tabName.trim(), tabCode: tabCode.trim() });
    if (ok) onOpenChange(false);
  };

  const displayError = formError ?? serverError;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-sm border border-gray-400">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-lg font-bold text-black">
            {isEdit ? 'Edit Tab' : 'Add Tab'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Module</Label>
            <Select value={moduleId} onValueChange={setModuleId} disabled={isEdit || isPending}>
              <SelectTrigger className="h-9 text-xs">
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
            <Label className="text-xs font-semibold text-gray-700">Tab Name</Label>
            <Input
              placeholder="e.g. Day Wise Details"
              value={tabName}
              onChange={(e) => handleTabNameChange(e.target.value)}
              disabled={isPending}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Tab Code <span className="text-gray-400 font-normal">(unique identifier)</span>
            </Label>
            <Input
              placeholder="e.g. daywisedetails"
              value={tabCode}
              onChange={(e) => { setTabCode(e.target.value); setAutoCode(false); }}
              disabled={isPending}
              className="h-9 text-xs font-mono"
            />
          </div>

          {displayError && <p className="text-xs font-medium text-red-600">{displayError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending} className="h-8 text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
            {isPending && <Loader size="sm" className="mr-1.5" />}
            {isEdit ? 'Save Changes' : 'Add Tab'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================= */
/* MODULES MANAGEMENT PANEL                                      */
/* ============================================================= */

export function ModulesManagementPanel() {
  const modulesQuery = useModules();
  const tabsQuery = useTabs();

  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();

  const createTab = useCreateTab();
  const updateTab = useUpdateTab();
  const deleteTab = useDeleteTab();

  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleRecord | null>(null);
  const [deleteModuleTarget, setDeleteModuleTarget] = useState<ModuleRecord | null>(null);

  const [isTabDialogOpen, setIsTabDialogOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<TabRecord | null>(null);
  const [deleteTabTarget, setDeleteTabTarget] = useState<TabRecord | null>(null);
  const [addTabForModuleId, setAddTabForModuleId] = useState<string | undefined>(undefined);

  const modules = modulesQuery.data ?? [];
  const tabs = tabsQuery.data ?? [];

  const tabsByModule = useMemo(() => {
    const map = new Map<string, TabRecord[]>();
    tabs.forEach((t) => {
      const list = map.get(t.moduleId) ?? [];
      list.push(t);
      map.set(t.moduleId, list);
    });
    return map;
  }, [tabs]);

  const handleOpenAddModule = () => { setEditingModule(null); setIsModuleDialogOpen(true); };
  const handleOpenEditModule = (m: ModuleRecord) => { setEditingModule(m); setIsModuleDialogOpen(true); };

  const handleModuleSubmit = (data: { moduleName: string; moduleCode: string }) =>
    editingModule
      ? updateModule.mutate({ id: editingModule.id, ...data })
      : createModule.mutate(data);

  const handleConfirmDeleteModule = async () => {
    if (!deleteModuleTarget) return;
    const ok = await deleteModule.mutate(deleteModuleTarget.id);
    if (ok) { setDeleteModuleTarget(null); setExpandedModuleId(null); }
  };

  const handleOpenAddTab = (moduleId: string) => {
    setEditingTab(null);
    setAddTabForModuleId(moduleId);
    setIsTabDialogOpen(true);
  };
  const handleOpenEditTab = (t: TabRecord) => {
    setEditingTab(t);
    setAddTabForModuleId(undefined);
    setIsTabDialogOpen(true);
  };

  const handleTabSubmit = (data: { moduleId: string; tabName: string; tabCode: string }) =>
    editingTab
      ? updateTab.mutate({ id: editingTab.id, tabName: data.tabName, tabCode: data.tabCode })
      : createTab.mutate(data);

  const handleConfirmDeleteTab = async () => {
    if (!deleteTabTarget) return;
    const ok = await deleteTab.mutate(deleteTabTarget.id);
    if (ok) setDeleteTabTarget(null);
  };

  if (modulesQuery.isLoading || tabsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
        <Loader size="xl" className="text-[#004D40]" />
      </div>
    );
  }

  if (modulesQuery.isError || tabsQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center">
        <p className="text-sm font-semibold text-gray-900">Unable to load modules.</p>
        <p className="text-xs text-gray-500">Please try again.</p>
        <Button
          size="sm"
          onClick={() => { modulesQuery.refetch(); tabsQuery.refetch(); }}
          className="bg-[#004D40] text-white hover:bg-[#003D33]"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-400 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-[#F8FAF9] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700">
            <Layers className="h-4 w-4" />
          </div>
          <h2 className="text-[15px] font-bold text-gray-900">Modules</h2>
        </div>
        <Button
          onClick={handleOpenAddModule}
          className="h-8 gap-1.5 bg-[#004D40] text-xs font-semibold text-white hover:bg-[#003D33] rounded-lg px-3"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Module
        </Button>
      </div>

      {/* Module table */}
      <div className="overflow-x-auto">
        <Table className="border-collapse font-hanken">
          <TableHeader className="bg-emerald-50/30">
            <TableRow className="border-b border-gray-300">
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-left border-r border-gray-300">
                MODULE NAME
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-left border-r border-gray-300">
                CODE
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                TABS
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                LAST UPDATED
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-right">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 !text-center text-gray-500 text-sm">
                  No modules configured yet.
                </TableCell>
              </TableRow>
            ) : (
              modules.map((mod) => {
                const moduleTabs = tabsByModule.get(mod.id) ?? [];
                const isExpanded = expandedModuleId === mod.id;

                return (
                  <>
                    <TableRow
                      key={mod.id}
                      className="border-b border-gray-300 hover:bg-emerald-50/30 transition-colors"
                    >
                      <TableCell className="py-2.5 px-5 text-left border-r border-gray-300">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                          className="h-auto p-0 gap-1.5 text-[13px] font-semibold text-gray-900 hover:text-[#004D40] hover:bg-transparent"
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-[#004D40]" />
                            : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                          }
                          {mod.moduleName}
                        </Button>
                      </TableCell>
                      <TableCell className="py-2.5 px-5 text-left border-r border-gray-300">
                        <span className="text-xs font-mono font-semibold text-blue-600">{mod.moduleCode}</span>
                      </TableCell>
                      <TableCell className="py-2.5 px-5 text-center border-r border-gray-300">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#004D40]">
                          {moduleTabs.length} {moduleTabs.length === 1 ? 'tab' : 'tabs'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-5 text-center border-r border-gray-300 text-xs text-gray-500">
                        {formatDate(mod.updatedAt)}
                      </TableCell>
                      <TableCell className="py-2.5 px-5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Add Tab to Module"
                            onClick={() => { setExpandedModuleId(mod.id); handleOpenAddTab(mod.id); }}
                            className="h-7 w-7 rounded-full p-1.5 text-[#004D40] hover:bg-[#004D40]/10"
                          >
                            <PanelTop className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Edit Module"
                            onClick={() => handleOpenEditModule(mod)}
                            className="h-7 w-7 rounded-full p-1.5 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Delete Module"
                            onClick={() => setDeleteModuleTarget(mod)}
                            className="h-7 w-7 rounded-full p-1.5 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Tabs sub-rows */}
                    {isExpanded && (
                      <TableRow key={`${mod.id}-tabs`} className="bg-gray-50/70 border-b border-gray-300">
                        <TableCell colSpan={5} className="px-10 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tabs</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAddTab(mod.id)}
                              className="h-7 gap-1 border-[#004D40]/30 px-2 text-[11px] font-semibold text-[#004D40] hover:bg-[#004D40]/5"
                            >
                              <Plus className="h-3 w-3" />
                              Add Tab
                            </Button>
                          </div>

                          {moduleTabs.length === 0 ? (
                            <p className="py-2 text-xs text-gray-400">No tabs for this module. Click "Add Tab" to create one.</p>
                          ) : (
                            <Table className="border-collapse">
                              <TableHeader>
                                <TableRow className="border-b border-gray-200">
                                  <TableHead className="py-1.5 pr-4 text-left text-[11px] font-semibold text-gray-500">TAB NAME</TableHead>
                                  <TableHead className="py-1.5 pr-4 text-left text-[11px] font-semibold text-gray-500">CODE</TableHead>
                                  <TableHead className="py-1.5 text-right text-[11px] font-semibold text-gray-500">LAST UPDATED</TableHead>
                                  <TableHead className="py-1.5 pl-4 text-right text-[11px] font-semibold text-gray-500">ACTIONS</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {moduleTabs.map((tab) => (
                                  <TableRow key={tab.id} className="border-b border-gray-100 last:border-0 hover:bg-white">
                                    <TableCell className="py-1.5 pr-4 text-xs font-medium text-gray-800">{tab.tabName}</TableCell>
                                    <TableCell className="py-1.5 pr-4 text-xs font-mono text-blue-500">{tab.tabCode}</TableCell>
                                    <TableCell className="py-1.5 text-right text-[11px] text-gray-400">{formatDate(tab.updatedAt)}</TableCell>
                                    <TableCell className="py-1.5 pl-4">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          title="Edit Tab"
                                          onClick={() => handleOpenEditTab(tab)}
                                          className="h-6 w-6 rounded-full p-1 text-blue-600 hover:bg-blue-50"
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          title="Delete Tab"
                                          onClick={() => setDeleteTabTarget(tab)}
                                          className="h-6 w-6 rounded-full p-1 text-red-500 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center border-t border-gray-400 bg-emerald-50/20 px-5 py-3 text-xs text-gray-700">
        <span>
          {modules.length} {modules.length === 1 ? 'module' : 'modules'}, {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'} total
        </span>
      </div>

      {/* Module Dialogs */}
      <ModuleFormDialog
        open={isModuleDialogOpen}
        onOpenChange={(next) => { setIsModuleDialogOpen(next); if (!next) { createModule.resetError(); updateModule.resetError(); } }}
        initial={editingModule}
        onSubmit={handleModuleSubmit}
        isPending={editingModule ? updateModule.isPending : createModule.isPending}
        serverError={editingModule ? updateModule.error : createModule.error}
      />

      <DeleteConfirmDialog
        open={!!deleteModuleTarget}
        onOpenChange={(next) => { if (!next) { setDeleteModuleTarget(null); deleteModule.resetError(); } }}
        onConfirm={handleConfirmDeleteModule}
        isPending={deleteModule.isPending}
        title="Delete this module?"
        description={deleteModule.error ?? (deleteModuleTarget ? `"${deleteModuleTarget.moduleName}" and all its tabs and rights will be removed. This cannot be undone.` : undefined)}
      />

      {/* Tab Dialogs */}
      <TabFormDialog
        open={isTabDialogOpen}
        onOpenChange={(next) => { setIsTabDialogOpen(next); if (!next) { createTab.resetError(); updateTab.resetError(); } }}
        initial={editingTab}
        modules={modules}
        defaultModuleId={addTabForModuleId}
        onSubmit={handleTabSubmit}
        isPending={editingTab ? updateTab.isPending : createTab.isPending}
        serverError={editingTab ? updateTab.error : createTab.error}
      />

      <DeleteConfirmDialog
        open={!!deleteTabTarget}
        onOpenChange={(next) => { if (!next) { setDeleteTabTarget(null); deleteTab.resetError(); } }}
        onConfirm={handleConfirmDeleteTab}
        isPending={deleteTab.isPending}
        title="Delete this tab?"
        description={deleteTab.error ?? (deleteTabTarget ? `"${deleteTabTarget.tabName}" and any rights scoped to it will be removed. This cannot be undone.` : undefined)}
      />
    </div>
  );
}

/* ============================================================= */
/* MODULES CARD (for the Drop Down category grid)               */
/* ============================================================= */

interface ModulesCardProps {
  modules: ModuleRecord[];
  tabs: TabRecord[];
  isSelected: boolean;
  onClick: () => void;
}

export function ModulesCard({ modules, isSelected, onClick }: ModulesCardProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={`flex h-[100px] w-full items-center justify-start rounded-lg border p-[5px] text-left transition-all ${
        isSelected
          ? 'border-[#004D40] bg-[#004D40]/5 ring-1 ring-[#004D40]'
          : 'border-gray-200 bg-white hover:border-[#004D40]/40 hover:shadow-sm'
      }`}
    >
      <div className="flex h-full w-[100px] shrink-0 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700">
        <Layers className="h-10 w-10" />
      </div>
      <div className="ml-auto flex flex-col items-end justify-center pr-3">
        <h3 className={`text-[15px] font-semibold ${isSelected ? 'text-[#004D40]' : 'text-gray-900'}`}>
          Modules
        </h3>
        <span className={`mt-1 text-[20px] font-bold ${isSelected ? 'text-[#004D40]' : 'text-gray-700'}`}>
          {modules.length} Items
        </span>
      </div>
    </Button>
  );
}
