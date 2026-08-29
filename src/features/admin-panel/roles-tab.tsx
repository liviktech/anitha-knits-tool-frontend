import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { Loader } from '@/components/shared/loader';
import { useEmployees, type Employee } from '@/features/employee/employee-queries';
import {
  useCreateRight,
  useCreateRoleAccess,
  useDeleteRight,
  useDeleteRoleAccess,
  useModules,
  useRights,
  useRoleAccesses,
  useTabs,
  useUpdateRight,
  useUpdateRoleAccess,
  useAssignRoleAccess,
  type ModuleRecord,
  type RightAction as RightActionValue,
  type RightRecord,
  type RoleAccessRecord,
  type TabRecord,
} from './roles-tab-queries';
import { CalendarDays } from 'lucide-react';


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

const PAGE_SIZE = 5;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/* ============================================================= */
/* PAGINATION BAR (client-side pagination over the fetched list) */
/* ============================================================= */

interface PaginationBarProps {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemLabel: string;
}

function PaginationBar({ page, totalItems, onPageChange, itemLabel }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalItems);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-white px-5 py-3 sm:flex-row">
      <span className="text-[14px] text-gray-500">
        Showing {rangeStart}-{rangeEnd} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[14px] font-semibold transition-colors ${p === currentPage
              ? 'bg-[#004D40] text-white'
              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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

/** Sentinel Select value for "no specific tab" — Radix Select doesn't allow an empty-string item value. */
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
            <Label className="text-xs font-semibold text-gray-700">Tab <span className="font-normal text-gray-400">(optional — leave unset for whole-module access)</span></Label>

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
                  <SelectItem value={NO_TAB_VALUE}>No specific tab (whole module)</SelectItem>
                  {tabsForModule.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.tabName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {moduleId && tabsForModule.length === 0 && (
              <p className="text-[13px] text-gray-500">
                No tabs configured for this module — this right will grant access to the whole module.
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
/* ADD / EDIT ROLE DIALOG                                        */
/* ============================================================= */

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: RoleAccessRecord | null;
  rights: RightRecord[];
  onSubmit: (data: { roleName: string; description: string; rightIds: string[] }) => Promise<boolean>;
  isPending: boolean;
  serverError?: string | null;
}

function RoleFormDialog({
  open,
  onOpenChange,
  initial,
  rights,
  onSubmit,
  isPending,
  serverError,
}: RoleFormDialogProps) {
  const [roleName, setRoleName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [rightIds, setRightIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
 
  const isEdit = initial != null;
 
  useEffect(() => {
    if (open) {
      setRoleName(initial?.roleName ?? '');
      setEffectiveDate(
        initial?.effectiveDate?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10)
      );
      setRightIds(initial?.rightIds ?? []);
      setFormError(null);
    }
  }, [open, initial]);
 
  const rightsByGroup = useMemo(() => {
    const groups = new Map<string, RightRecord[]>();
 
    rights.forEach((right) => {
      const key = right.tabName
        ? `${right.moduleName} › ${right.tabName}`
        : right.moduleName;
 
      const list = groups.get(key) ?? [];
      list.push(right);
      groups.set(key, list);
    });
 
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [rights]);
 
  const toggleRight = (id: string) => {
    setRightIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };
 
  const isGroupSelected = (groupRights: RightRecord[]) =>
    groupRights.length > 0 &&
    groupRights.every((right) => rightIds.includes(right.id));
 
  const isGroupPartiallySelected = (groupRights: RightRecord[]) =>
    groupRights.some((right) => rightIds.includes(right.id)) &&
    !isGroupSelected(groupRights);
 
  const toggleGroup = (groupRights: RightRecord[]) => {
    const ids = groupRights.map((right) => right.id);
    const allSelected = ids.every((id) => rightIds.includes(id));
 
    setRightIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
 
      return Array.from(new Set([...prev, ...ids]));
    });
  };
 
  const handleSubmit = async () => {
    if (!roleName.trim()) {
      setFormError('Please enter a role name.');
      return;
    }
 
    if (!effectiveDate) {
      setFormError('Please select an effective date.');
      return;
    }
 
    setFormError(null);
 
    const ok = await onSubmit({
      roleName: roleName.trim(),
      effectiveDate,
      rightIds,
    });
 
    if (ok) {
      onOpenChange(false);
    }
  };
 
  const displayError = formError ?? serverError;
 
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent
        className="
          !max-w-[1100px]
          w-[calc(100vw-48px)]
          max-h-[min(820px,85vh)]
          flex
          flex-col
          p-0
          gap-0
          overflow-hidden
          rounded-2xl
          border
          border-gray-200
          bg-white
          shadow-2xl
        "
      >
        {/* =====================================================
            HEADER
        ===================================================== */}
        <DialogHeader
          className="
            flex
            h-[68px]
            shrink-0
            flex-row
            items-center
            justify-between
            border-b
            border-gray-200
            bg-[#A8DCAB]
            px-7
            py-0
          "
        >
          <DialogTitle className="text-lg font-bold text-black">
            {isEdit ? 'Edit Role' : 'Add New Role'}
          </DialogTitle>
        </DialogHeader>
 
        {/* =====================================================
            BODY
        ===================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            {/* =================================================
                TOP FORM
            ================================================= */}
            <div className="grid grid-cols-2 gap-5">
              {/* Role Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="role-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Role Name <span className="text-red-500">*</span>
                </Label>
 
                <Input
                  id="role-name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Enter role name (e.g., Admin, Manager, Viewer)"
                  disabled={isPending}
                  className="
                    h-11
                    rounded-lg
                    border-slate-200
                    px-3
                    text-sm
                    shadow-none
                    placeholder:text-slate-400
                    focus-visible:border-[#005487]
                    focus-visible:ring-1
                    focus-visible:ring-[#005487]
                  "
                />
              </div>
 
              {/* Effective Date */}
              <div className="space-y-2">
                <Label
                  htmlFor="effective-date"
                  className="text-sm font-medium text-slate-700"
                >
                  Effective Date <span className="text-red-500">*</span>
                </Label>
 
                <div className="relative">
                  <CalendarDays
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      z-10
                      h-4
                      w-4
                      -translate-y-1/2
                      text-slate-400
                    "
                  />
 
                  <Input
                    id="effective-date"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    disabled={isPending}
                    className="
                      h-11
                      rounded-lg
                      border-slate-200
                      pl-10
                      text-sm
                      shadow-none
                      focus-visible:border-[#005487]
                      focus-visible:ring-1
                      focus-visible:ring-[#005487]
                    "
                  />
                </div>
              </div>
            </div>
 
            {/* =================================================
                SELECTED RIGHTS
            ================================================= */}
            <div className="mt-5">
              <span
                className="
                  inline-flex
                  items-center
                  rounded-full
                  border
                  border-blue-100
                  bg-blue-50
                  px-2.5
                  py-1
                  text-[12px]
                  font-bold
                  tracking-wide
                  text-blue-600
                "
              >
                {rightIds.length} RIGHTS SELECTED
              </span>
            </div>
 
            {/* =================================================
                RIGHTS GRID
            ================================================= */}
            <div className="mt-5">
              {rightsByGroup.length === 0 ? (
                <div
                  className="
                    flex
                    min-h-[180px]
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-dashed
                    border-gray-200
                    bg-gray-50
                  "
                >
                  <p className="text-sm text-gray-400">
                    No rights configured yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-5">
                  {rightsByGroup.map(([group, groupRights]) => {
                    const selected = isGroupSelected(groupRights);
                    const partial =
                      isGroupPartiallySelected(groupRights);
 
                    return (
                      <div
                        key={group}
                        className="
                          rounded-xl
                          border
                          border-slate-200
                          bg-white
                          p-5
                        "
                      >
                        {/* GROUP HEADER */}
                        <div className="flex items-start justify-between gap-4">
                          <label className="flex min-w-0 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              ref={(element) => {
                                if (element) {
                                  element.indeterminate = partial;
                                }
                              }}
                              onChange={() =>
                                toggleGroup(groupRights)
                              }
                              disabled={isPending}
                              className="
                                mt-0.5
                                h-4
                                w-4
                                shrink-0
                                cursor-pointer
                                rounded
                                border-gray-300
                                accent-[#005487]
                              "
                            />
 
                            <span
                              className="
                                text-[16px]
                                font-semibold
                                leading-5
                                text-slate-700
                              "
                            >
                              {group}
                            </span>
                          </label>
 
                          <span
                            className="
                              shrink-0
                              rounded-md
                              bg-slate-100
                              px-2.5
                              py-1
                              text-[11px]
                              font-semibold
                              leading-4
                              text-slate-500
                            "
                          >
                            {groupRights.length}{' '}
                            {groupRights.length === 1
                              ? 'right'
                              : 'rights'}
                          </span>
                        </div>
 
                        {/* RIGHTS */}
                        <div className="mt-5 space-y-3">
                          {groupRights.map((right) => (
                            <label
                              key={right.id}
                              className="
                                flex
                                cursor-pointer
                                items-center
                                gap-3
                                text-sm
                                leading-5
                                text-slate-600
                              "
                            >
                              <input
                                type="checkbox"
                                checked={rightIds.includes(right.id)}
                                onChange={() =>
                                  toggleRight(right.id)
                                }
                                disabled={isPending}
                                className="
                                  h-3.5
                                  w-3.5
                                  shrink-0
                                  cursor-pointer
                                  rounded
                                  border-gray-300
                                  accent-[#005487]
                                "
                              />
 
                              <span>{right.displayName}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
 
        {/* =====================================================
            ERROR
        ===================================================== */}
        {displayError && (
          <div
            className="
              shrink-0
              border-t
              border-red-100
              bg-red-50
              px-7
              py-2
            "
          >
            <p className="text-sm text-red-600">
              {displayError}
            </p>
          </div>
        )}
 
        {/* =====================================================
            FOOTER
        ===================================================== */}
        <DialogFooter
          className="
            flex
            h-[70px]
            shrink-0
            flex-row
            items-center
            justify-end
            gap-3
            border-t
            border-gray-200
            bg-white
            px-7
            py-0
          "
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="
              h-11
              rounded-lg
              border-gray-300
              px-5
              text-sm
              font-medium
              text-slate-700
            "
          >
            Cancel
          </Button>
 
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="
              h-11
              min-w-[165px]
              rounded-lg
              bg-[#004D40]
              px-6
              text-sm
              font-bold
              text-white
              hover:bg-[#00332a]
            "
          >
            {isPending && (
              <Loader
                size="sm"
                className="mr-2"
              />
            )}
 
            {isEdit ? 'SAVE CHANGES' : 'CREATE ROLE'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
/* ============================================================= */
/* ASSIGN ROLE DIALOG                                            */
/* ============================================================= */

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleAccessRecord[];
  employees: Employee[];
  onSubmit: (roleAccessId: string, employeeIds: string[]) => Promise<boolean>;
  isPending: boolean;
  serverError?: string | null;
}

function AssignRoleDialog({ open, onOpenChange, roles, employees, onSubmit, isPending, serverError }: AssignRoleDialogProps) {
  const [roleId, setRoleId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRoleId('');
      setEmployeeSearch('');
      setSelectedEmployeeIds([]);
      setFormError(null);
    }
  }, [open]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      (e.name ?? '').toLowerCase().includes(q)
      || (e.employeeDetails?.designation ?? '').toLowerCase().includes(q));
  }, [employees, employeeSearch]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!roleId) {
      setFormError('Please select a role.');
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      setFormError('Please select at least one employee.');
      return;
    }
    setFormError(null);
    const ok = await onSubmit(roleId, selectedEmployeeIds);
    if (ok) onOpenChange(false);
  };

  const displayError = formError ?? serverError;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md border border-gray-400">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-lg font-bold text-black">Assign Role</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.roleName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Employees</Label>
            <Input
              placeholder="Search employees..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="h-9 text-xs"
            />
            <div className="mt-1 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {filteredEmployees.length === 0 ? (
                <p className="px-2 py-3 text-center text-[14px] text-gray-400">No employees found.</p>
              ) : (
                filteredEmployees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#004D40] focus:ring-[#004D40]"
                      />
                      <span className="font-medium text-gray-900">{employee.name}</span>
                      {employee.employeeDetails?.designation && (
                        <span className="text-[12px] text-gray-400">{employee.employeeDetails.designation}</span>
                      )}
                    </span>
                    {employee.roleAccess && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                        {employee.roleAccess.roleName}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {displayError && <p className="text-xs text-red-600 font-medium">{displayError}</p>}
        </div>

        <DialogFooter className="border-gray-200 bg-white">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
            {isPending && <Loader size="sm" className="mr-1.5" />}
            Assign Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================= */
/* MAIN TAB                                                       */
/* ============================================================= */

export function RolesTab() {
  const [subTab, setSubTab] = useState<'roles' | 'rights'>('roles');

  const modulesQuery = useModules();
  const tabsQuery = useTabs();
  const rightsQuery = useRights();
  const roleAccessQuery = useRoleAccesses();
  const employeesQuery = useEmployees('limit=100');

  const createRight = useCreateRight();
  const updateRight = useUpdateRight();
  const deleteRight = useDeleteRight();

  const createRoleAccess = useCreateRoleAccess();
  const updateRoleAccess = useUpdateRoleAccess();
  const deleteRoleAccess = useDeleteRoleAccess();
  const assignRoleAccess = useAssignRoleAccess();

  const [roleSearch, setRoleSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const [rolesPage, setRolesPage] = useState(1);
  const [rightsPage, setRightsPage] = useState(1);

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleAccessRecord | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleAccessRecord | null>(null);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const [isRightDialogOpen, setIsRightDialogOpen] = useState(false);
  const [editingRight, setEditingRight] = useState<RightRecord | null>(null);
  const [deleteRightTarget, setDeleteRightTarget] = useState<RightRecord | null>(null);

  const modules = modulesQuery.data ?? [];
  const tabs = tabsQuery.data ?? [];
  const rights = rightsQuery.data ?? [];
  const roles = roleAccessQuery.data ?? [];
  const employees = employeesQuery.data ?? [];

  const roleEmployeeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    employees.forEach((e) => {
      if (e.roleAccessId) counts.set(e.roleAccessId, (counts.get(e.roleAccessId) ?? 0) + 1);
    });
    return counts;
  }, [employees]);

  const mostActiveRole = useMemo(() => {
    if (roles.length === 0) return null;
    return roles.reduce((best, r) => {
      const count = roleEmployeeCounts.get(r.id) ?? 0;
      const bestCount = roleEmployeeCounts.get(best.id) ?? 0;
      return count > bestCount ? r : best;
    }, roles[0]);
  }, [roles, roleEmployeeCounts]);

  const recentActivityCount = useMemo(() => {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const countRecent = (items: { createdAt: string }[]) => items.filter((i) => new Date(i.createdAt).getTime() >= cutoff).length;
    return countRecent(roles) + countRecent(rights);
  }, [roles, rights]);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.roleName.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q));
  }, [roles, roleSearch]);

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

  const paginatedRoles = useMemo(() => {
    const start = (Math.min(rolesPage, Math.max(1, Math.ceil(filteredRoles.length / PAGE_SIZE))) - 1) * PAGE_SIZE;
    return filteredRoles.slice(start, start + PAGE_SIZE);
  }, [filteredRoles, rolesPage]);

  const paginatedRights = useMemo(() => {
    const start = (Math.min(rightsPage, Math.max(1, Math.ceil(filteredRights.length / PAGE_SIZE))) - 1) * PAGE_SIZE;
    return filteredRights.slice(start, start + PAGE_SIZE);
  }, [filteredRights, rightsPage]);

  const handleRoleSearchChange = (value: string) => { setRoleSearch(value); setRolesPage(1); };
  const handleRightSearchChange = (value: string) => { setRightSearch(value); setRightsPage(1); };
  const handleModuleFilterChange = (value: string) => { setModuleFilter(value); setRightsPage(1); };

  const handleOpenAddRole = () => { setEditingRole(null); setIsRoleDialogOpen(true); };
  const handleOpenEditRole = (role: RoleAccessRecord) => { setEditingRole(role); setIsRoleDialogOpen(true); };

  const handleAssignSubmit = (roleAccessId: string, employeeIds: string[]) =>
    assignRoleAccess.mutate({ roleAccessId, employeeIds });

  const handleRoleSubmit = (data: { roleName: string; description: string; rightIds: string[] }) =>
    editingRole
      ? updateRoleAccess.mutate({ id: editingRole.id, ...data })
      : createRoleAccess.mutate(data);

  const handleConfirmDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    const ok = await deleteRoleAccess.mutate(deleteRoleTarget.id);
    if (ok) setDeleteRoleTarget(null);
  };

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

  const isLoading = modulesQuery.isLoading || tabsQuery.isLoading || rightsQuery.isLoading || roleAccessQuery.isLoading || employeesQuery.isLoading;
  const isError = modulesQuery.isError || tabsQuery.isError || rightsQuery.isError || roleAccessQuery.isError || employeesQuery.isError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
        <Loader size="xl" className="text-[#004D40]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center">
        <p className="text-sm font-semibold text-gray-900">Unable to load roles &amp; rights.</p>
        <p className="text-xs text-gray-500">Please try again.</p>
        <button
          type="button"
          onClick={() => {
            modulesQuery.refetch();
            tabsQuery.refetch();
            rightsQuery.refetch();
            roleAccessQuery.refetch();
            employeesQuery.refetch();
          }}
          className="rounded-lg bg-[#004D40] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#003D33]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-hidden py-1 px-3">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex items-center gap-5">
          {(['roles', 'rights'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSubTab(tab)}
              className={`flex items-center gap-1.5 border-b-2 px-1 pb-2.5 pt-1 text-[14px] font-semibold transition-colors ${subTab === tab
                ? 'border-[#004D40] text-[#004D40]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab === 'roles' ? (
                <Users className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {tab === 'roles' ? 'Roles' : 'Rights'}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <div className="flex min-h-[72px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              Total Roles
            </span>
            <span className="block text-[20px] font-bold leading-tight text-gray-900">
              {roles.length}
            </span>
          </div>
        </div>

        <div className="flex min-h-[72px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#004D40]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              System Rights
            </span>
            <span className="block text-[20px] font-bold leading-tight text-gray-900">
              {rights.length}
            </span>
          </div>
        </div>

        <div className="flex min-h-[72px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              Most Active
            </span>
            <span className="block truncate text-[16px] font-bold leading-tight text-gray-900">
              {mostActiveRole ? mostActiveRole.roleName : '—'}
            </span>
          </div>
        </div>

        <div className="flex min-h-[72px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#004D40]">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              Recent Activity
            </span>
            <span className="block text-[16px] font-bold leading-tight text-gray-900">
              +{recentActivityCount} <span className="font-medium text-gray-500">this month</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROLES SUB-TAB                                             */}
      {/* ========================================================= */}

      {subTab === 'roles' && (
        <>
          <div className="flex items-center gap-2 rounded-lg">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search roles by name or ID"
                value={roleSearch}
                onChange={(e) => handleRoleSearchChange(e.target.value)}
                className="h-9 border-gray-200 bg-white pl-8 text-[14px] shadow-none w-[380px]"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(true)}
              className="h-9 shrink-0 border-gray-300 bg-white px-3 text-[14px] font-semibold text-gray-700 shadow-none hover:bg-gray-50"
            >
              Assign Role
            </Button>

            <Button
              onClick={handleOpenAddRole}
              className="h-9 shrink-0 gap-1.5 bg-[#004D40] px-3 text-[14px] font-semibold text-white shadow-none hover:bg-[#003D33]"
            >
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50/80">
                    <th className="w-[18%] px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500">ID</th>
                    <th className="w-[20%] px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500">Role Name</th>
                    <th className="w-[22%] px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500">No. of Rights</th>
                    <th className="w-[25%] px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500">Created</th>
                    <th className="w-[15%] px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-[14px] text-gray-400">
                        No roles found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRoles.map((role) => (
                      <tr
                        key={role.id}
                        className="group cursor-pointer border-l-2 border-transparent transition-colors hover:border-[#004D40] hover:bg-gray-50/60"
                      >
                        <td className="px-4 py-3 font-mono text-[12px] font-medium text-[#004D40]">{role.id.slice(0, 6)}</td>
                        <td className="px-3 py-3 text-[14px] font-medium text-gray-900">{role.roleName}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#004D40]/10 px-2 py-0.5 text-[12px] font-semibold text-[#004D40]">
                            {role.rightIds.length}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-gray-600">{formatDate(role.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => handleOpenEditRole(role)}
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#004D40]"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setDeleteRoleTarget(role)}
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={rolesPage}
              totalItems={filteredRoles.length}
              onPageChange={setRolesPage}
              itemLabel="roles"
            />
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* RIGHTS SUB-TAB                                           */}
      {/* ========================================================= */}

      {subTab === 'rights' && (
        <>
          <div className="flex items-center gap-2 rounded-lg">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search rights by name or ID"
                  value={rightSearch}
                  onChange={(e) => handleRightSearchChange(e.target.value)}
                  className="h-9 border-gray-200 bg-white pl-8 text-[14px] shadow-none w-[380px]"
                />
              </div>

              <Select value={moduleFilter} onValueChange={handleModuleFilterChange}>
                <SelectTrigger className="h-9 w-40 border-gray-200 bg-white text-[14px] shadow-none">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.moduleName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleOpenAddRight}
              className="h-9 shrink-0 gap-1.5 bg-[#004D40] px-3 text-[14px] font-semibold text-white shadow-none hover:bg-[#003D33]"
            >
              <Plus className="h-4 w-4" />
              Add Right
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50/70">
                    <th className="px-5 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Right ID</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Module / Tab</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Action</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Display Name</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Created At</th>
                    <th className="px-5 py-3 text-right text-[12px] font-bold uppercase tracking-wide text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {filteredRights.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-[14px] text-gray-400">No rights found.</td>
                    </tr>
                  ) : (
                    paginatedRights.map((right) => (
                      <tr
                        key={right.id}
                        className="group cursor-pointer border-l-2 border-transparent transition-colors hover:border-[#004D40] hover:bg-gray-50/70"
                      >
                        <td className="px-5 py-3 font-mono text-[12px] font-medium text-[#004D40]">{right.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-[14px] text-gray-700">
                          {right.moduleName}
                          {right.tabName && <> <span className="text-gray-400">/</span> {right.tabName}</>}
                        </td>
                        <td className="px-4 py-3 text-[14px]">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${actionBadgeClass(right.action)}`}>
                            {right.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[14px] font-semibold text-gray-900">{right.displayName}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">{formatDate(right.createdAt)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                            <button type="button" title="Edit" onClick={() => handleOpenEditRight(right)} className="rounded-md p-1.5 text-[#004D40] transition-colors hover:bg-[#004D40]/10">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button type="button" title="Delete" onClick={() => setDeleteRightTarget(right)} className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={rightsPage}
              totalItems={filteredRights.length}
              onPageChange={setRightsPage}
              itemLabel="rights"
            />
          </div>
        </>
      )}

      <RoleFormDialog
        open={isRoleDialogOpen}
        onOpenChange={(next) => { setIsRoleDialogOpen(next); if (!next) { createRoleAccess.resetError(); updateRoleAccess.resetError(); } }}
        initial={editingRole}
        rights={rights}
        onSubmit={handleRoleSubmit}
        isPending={editingRole ? updateRoleAccess.isPending : createRoleAccess.isPending}
        serverError={editingRole ? updateRoleAccess.error : createRoleAccess.error}
      />

      <DeleteConfirmDialog
        open={!!deleteRoleTarget}
        onOpenChange={(next) => { if (!next) { setDeleteRoleTarget(null); deleteRoleAccess.resetError(); } }}
        onConfirm={handleConfirmDeleteRole}
        isPending={deleteRoleAccess.isPending}
        title="Delete this role?"
        description={deleteRoleAccess.error ?? (deleteRoleTarget ? `"${deleteRoleTarget.roleName}" will be removed — this action cannot be undone.` : undefined)}
      />

      <AssignRoleDialog
        open={isAssignDialogOpen}
        onOpenChange={(next) => { setIsAssignDialogOpen(next); if (!next) assignRoleAccess.resetError(); }}
        roles={roles}
        employees={employees}
        onSubmit={handleAssignSubmit}
        isPending={assignRoleAccess.isPending}
        serverError={assignRoleAccess.error}
      />

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
        description={deleteRight.error ?? (deleteRightTarget ? `"${deleteRightTarget.displayName}" will be removed from all roles — this action cannot be undone.` : undefined)}
      />

    </div>
  );
}
