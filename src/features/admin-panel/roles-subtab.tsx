import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, UserMinus, Users } from 'lucide-react';
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
import { type Employee } from '@/features/employee/employee-queries';
import {
  useAssignRoleAccess,
  useCreateRoleAccess,
  useDeleteRoleAccess,
  useUnassignRoleAccess,
  useUpdateRoleAccess,
  type RightRecord,
  type RoleAccessRecord,
} from './roles-tab-queries';

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

/* ============================================================= */
/* ADD / EDIT ROLE DIALOG                                        */
/* ============================================================= */

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: RoleAccessRecord | null;
  rights: RightRecord[];
  onSubmit: (data: { roleName: string; description: string; effectiveDate?: string; rightIds: string[] }) => Promise<boolean>;
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
      description: initial?.description ?? '',
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
      <DialogContent className="sm:max-w-md border border-gray-400">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-lg font-bold text-black">{isEdit ? 'Edit Role' : 'Add Role'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role-name" className="text-xs font-semibold text-gray-700">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g. Production Manager"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={isPending}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="effective-date" className="text-xs font-semibold text-gray-700">Effective Date</Label>
              <Input
                id="effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={isPending}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-700">Assigned Rights</Label>
              <span className="text-[11px] font-bold text-[#004D40]">{rightIds.length} selected</span>
            </div>
            <div className="flex max-h-56 flex-col gap-3 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {rightsByGroup.length === 0 ? (
                <p className="text-center text-[13px] text-gray-400">No rights configured yet.</p>
              ) : (
                rightsByGroup.map(([group, groupRights]) => {
                  const selected = isGroupSelected(groupRights);
                  const partial = isGroupPartiallySelected(groupRights);
                  return (
                    <div key={group} className="flex flex-col gap-1.5">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          ref={(element) => { if (element) element.indeterminate = partial; }}
                          onChange={() => toggleGroup(groupRights)}
                          disabled={isPending}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-[#004D40] focus:ring-[#004D40]"
                        />
                        <span className="text-[12px] font-bold uppercase tracking-wide text-gray-400">{group}</span>
                      </label>
                      {groupRights.map((right) => (
                        <label key={right.id} className="ml-5 flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={rightIds.includes(right.id)}
                            onChange={() => toggleRight(right.id)}
                            disabled={isPending}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-[#004D40] focus:ring-[#004D40]"
                          />
                          {right.displayName}
                        </label>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {displayError && <p className="text-xs text-red-600 font-medium">{displayError}</p>}
        </div>

        <DialogFooter className="border-gray-200 bg-white">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
            {isPending && <Loader size="sm" className="mr-1.5" />}
            {isEdit ? 'Save Changes' : 'Add Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================= */
/* ROLE MEMBERS DIALOG                                           */
/* ============================================================= */

interface RoleMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleAccessRecord | null;
  employees: Employee[];
  onUnassign: (roleAccessId: string, employeeId: string) => Promise<boolean>;
  isUnassignPending: boolean;
  unassignError?: string | null;
}

function RoleMembersDialog({
  open,
  onOpenChange,
  role,
  employees,
  onUnassign,
  isUnassignPending,
  unassignError,
}: RoleMembersDialogProps) {
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<Employee | null>(null);

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const assignedEmployees = useMemo(() => {
    if (!role) return [];
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => e.roleAccessId === role.id)
      .filter((e) =>
        !q ||
        (e.name ?? '').toLowerCase().includes(q) ||
        (e.employeeDetails?.designation ?? '').toLowerCase().includes(q),
      );
  }, [role, employees, search]);

  const handleConfirmUnassign = async () => {
    if (!role || !confirmTarget) return;
    const ok = await onUnassign(role.id, confirmTarget.id);
    if (ok) setConfirmTarget(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border border-gray-400">
          <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black flex items-center gap-2">
              <Users className="h-4 w-4" />
              {role?.roleName ?? 'Role'} — Members
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {assignedEmployees.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  {search ? 'No members match your search.' : 'No employees assigned to this role.'}
                </p>
              ) : (
                assignedEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[13px] font-bold text-[#004D40]">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-gray-900">{emp.name ?? '—'}</p>
                        {emp.employeeDetails?.designation && (
                          <p className="truncate text-[11px] text-gray-400">{emp.employeeDetails.designation}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmTarget(emp)}
                      disabled={isUnassignPending}
                      className="h-7 shrink-0 gap-1 px-2 text-[11px] font-semibold text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Unassign
                    </Button>
                  </div>
                ))
              )}
            </div>

            {unassignError && (
              <p className="text-xs font-medium text-red-600">{unassignError}</p>
            )}
          </div>

          <DialogFooter className="bg-white">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(next) => { if (!next) setConfirmTarget(null); }}
        onConfirm={handleConfirmUnassign}
        isPending={isUnassignPending}
        title={`Unassign ${confirmTarget?.name ?? 'this employee'}?`}
        description={`"${confirmTarget?.name ?? 'This employee'}" will be removed from the "${role?.roleName ?? ''}" role.`}
      />
    </>
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
/* ROLES SUB-TAB COMPONENT                                       */
/* ============================================================= */

export interface RolesSubTabProps {
  roles: RoleAccessRecord[];
  rights: RightRecord[];
  employees: Employee[];
  roleEmployeeCounts: Map<string, number>;
  createRoleAccess: ReturnType<typeof useCreateRoleAccess>;
  updateRoleAccess: ReturnType<typeof useUpdateRoleAccess>;
  deleteRoleAccess: ReturnType<typeof useDeleteRoleAccess>;
  assignRoleAccess: ReturnType<typeof useAssignRoleAccess>;
  unassignRoleAccess: ReturnType<typeof useUnassignRoleAccess>;
}

export function RolesSubTab({
  roles,
  rights,
  employees,
  roleEmployeeCounts,
  createRoleAccess,
  updateRoleAccess,
  deleteRoleAccess,
  assignRoleAccess,
  unassignRoleAccess,
}: RolesSubTabProps) {
  const [roleSearch, setRoleSearch] = useState('');
  const [rolesPage, setRolesPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleAccessRecord | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleAccessRecord | null>(null);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const [membersDialogRole, setMembersDialogRole] = useState<RoleAccessRecord | null>(null);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.roleName.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q));
  }, [roles, roleSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));

  const paginatedRoles = useMemo(() => {
    const start = (Math.min(rolesPage, totalPages) - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, rolesPage, pageSize, totalPages]);

  const handleRoleSearchChange = (value: string) => { setRoleSearch(value); setRolesPage(1); };

  const handleOpenAddRole = () => { setEditingRole(null); setIsRoleDialogOpen(true); };
  const handleOpenEditRole = (role: RoleAccessRecord) => { setEditingRole(role); setIsRoleDialogOpen(true); };

  const handleAssignSubmit = (roleAccessId: string, employeeIds: string[]) =>
    assignRoleAccess.mutate({ roleAccessId, employeeIds });

  const handleUnassignSubmit = (roleAccessId: string, employeeId: string) =>
    unassignRoleAccess.mutate({ roleAccessId, employeeId });

  const handleRoleSubmit = (data: { roleName: string; description: string; rightIds: string[] }) =>
    editingRole
      ? updateRoleAccess.mutate({ id: editingRole.id, ...data })
      : createRoleAccess.mutate(data);

  const handleConfirmDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    const ok = await deleteRoleAccess.mutate(deleteRoleTarget.id);
    if (ok) setDeleteRoleTarget(null);
  };

  return (
    <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="border-b border-emerald-400 p-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search roles..."
            value={roleSearch}
            onChange={(e) => handleRoleSearchChange(e.target.value)}
            className="h-8 w-44 sm:w-60 pl-8 bg-gray-50/50 border-gray-400 text-xs rounded-lg font-hanken"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAssignDialogOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold text-gray-700 border-gray-300 hover:bg-gray-50 rounded-lg px-3"
          >
            <Users className="h-3.5 w-3.5 text-gray-500" />
            Assign Role
          </Button>

          <Button
            onClick={handleOpenAddRole}
            className="h-8 gap-1.5 bg-[#004D40] text-xs font-semibold text-white hover:bg-[#00382e] rounded-lg px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Role
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
        <Table className="border-collapse font-hanken">
          <TableHeader className="bg-emerald-50/30 sticky top-0 z-10">
            <TableRow className="border-b border-gray-300">
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-left border-r border-gray-300">
                ROLE ID
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                ROLE NAME
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                RIGHTS COUNT
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-800 py-2.5 px-5 text-center border-r border-gray-300">
                ASSIGNED USERS
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
            {filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 !text-center text-gray-500 text-sm">
                  No roles found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRoles.map((role) => {
                const count = roleEmployeeCounts.get(role.id) ?? 0;
                return (
                  <TableRow
                    key={role.id}
                    className="border-b border-gray-300 hover:bg-emerald-50/30 transition-colors"
                  >
                    <TableCell className="py-3 px-5 text-left border-r border-gray-300">
                      <span className="text-sm font-semibold text-blue-600 font-mono">
                        {role.id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-5 text-center border-r border-gray-300 text-sm font-bold text-gray-900">
                      <button
                        type="button"
                        onClick={() => setMembersDialogRole(role)}
                        className="cursor-pointer font-bold text-[#004D40] hover:underline underline-offset-2"
                      >
                        {role.roleName}
                      </button>
                    </TableCell>
                    <TableCell className="py-3 px-5 text-center border-r border-gray-300 text-sm">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-[#004D40]">
                        {role.rightIds.length} rights
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-5 text-center border-r border-gray-300 text-sm">
                      {count === 0 ? (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="flex -space-x-1.5 overflow-hidden">
                            
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            {count} {count === 1 ? 'user' : 'users'}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-5 text-center border-r border-gray-300 text-sm text-gray-600">
                      {formatDate(role.createdAt)}
                    </TableCell>
                    <TableCell className="py-3 px-5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => handleOpenEditRole(role)}
                          className="h-7 w-7 rounded-full p-1.5 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setDeleteRoleTarget(role)}
                          className="h-7 w-7 rounded-full p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Footer matching Employees Tab */}
      <div className="shrink-0 p-3 border-t border-gray-400 bg-emerald-50/20 text-xs text-gray-700 flex flex-wrap justify-between items-center gap-3 px-4">
        <span>
          Showing {filteredRoles.length === 0 ? 0 : (rolesPage - 1) * pageSize + 1}-
          {Math.min(rolesPage * pageSize, filteredRoles.length)} of {filteredRoles.length} roles
        </span>

        <TablePaginationControls
          currentPage={rolesPage}
          totalPages={totalPages}
          onPageChange={setRolesPage}
        />

        <RowsPerPageSelect
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setRolesPage(1);
          }}
          options={[5, 10, 20, 50]}
        />
      </div>

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

      <RoleMembersDialog
        open={!!membersDialogRole}
        onOpenChange={(next) => { if (!next) { setMembersDialogRole(null); unassignRoleAccess.resetError(); } }}
        role={membersDialogRole}
        employees={employees}
        onUnassign={handleUnassignSubmit}
        isUnassignPending={unassignRoleAccess.isPending}
        unassignError={unassignRoleAccess.error}
      />
    </div>
  );
}
