import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Layers,
  Plus,
  Search,
  Shield,
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

/* ============================================================= */
/* STATIC DATA (no API integration — everything lives in memory) */
/* ============================================================= */

interface RightRecord {
  id: string;
  module: string;
  displayName: string;
  rightName: string;
  createdAt: string;
}

interface RoleRecord {
  id: string;
  name: string;
  description: string;
  rightIds: string[];
  createdAt: string;
}

const INITIAL_RIGHTS: RightRecord[] = [
  { id: 'cmpapwcvm0', module: 'Admin', displayName: 'Admin Control Roles', rightName: 'admin_control_roles', createdAt: '2026-05-18' },
  { id: 'cmpapwd2o0', module: 'Admin', displayName: 'Admin Module', rightName: 'admin_module_access', createdAt: '2026-05-18' },
  { id: 'cmpapwd9j0', module: 'Admin', displayName: 'Admin View Customers', rightName: 'admin_view_customers', createdAt: '2026-05-18' },
  { id: 'cmpapwdiy0', module: 'Admin', displayName: 'Admin View Dashboard', rightName: 'admin_view_dashboard', createdAt: '2026-05-18' },
  { id: 'cmpapwdri0', module: 'Admin', displayName: 'Admin View Roles', rightName: 'admin_view_roles', createdAt: '2026-05-18' },
  { id: 'cmpapwco20', module: 'Admin', displayName: 'Admin Control Customers', rightName: 'admin_control_customers', createdAt: '2026-05-18' },
  { id: 'cmpapwh330', module: 'Asset', displayName: 'Asset Control All', rightName: 'asset_control_all', createdAt: '2026-05-18' },
  { id: 'cmpapwdzx0', module: 'Asset', displayName: 'Asset Control All Assets', rightName: 'asset_control_assets', createdAt: '2026-05-18' },
  { id: 'cmpapwe4t0', module: 'Production', displayName: 'Production View Details', rightName: 'production_view_details', createdAt: '2026-05-19' },
  { id: 'cmpapweb10', module: 'Production', displayName: 'Production Control Entries', rightName: 'production_control_entries', createdAt: '2026-05-19' },
  { id: 'cmpapwehq0', module: 'Inventory', displayName: 'Inventory View Stock', rightName: 'inventory_view_stock', createdAt: '2026-05-19' },
  { id: 'cmpapwep90', module: 'Inventory', displayName: 'Inventory Control Stock', rightName: 'inventory_control_stock', createdAt: '2026-05-19' },
  { id: 'cmpapwewc0', module: 'Employees', displayName: 'Employees View List', rightName: 'employees_view_list', createdAt: '2026-05-20' },
  { id: 'cmpapwf2z0', module: 'Employees', displayName: 'Employees Control Records', rightName: 'employees_control_records', createdAt: '2026-05-20' },
  { id: 'cmpapwf9g0', module: 'Expenses', displayName: 'Expenses View Ledger', rightName: 'expenses_view_ledger', createdAt: '2026-05-20' },
  { id: 'cmpapwfg10', module: 'Expenses', displayName: 'Expenses Control Ledger', rightName: 'expenses_control_ledger', createdAt: '2026-05-20' },
];

const INITIAL_ROLES: RoleRecord[] = [
  {
    id: 'cmrz8k2p91',
    name: 'Super Admin',
    description: 'Unrestricted access to every module, including admin configuration and roles.',
    rightIds: INITIAL_RIGHTS.map((r) => r.id),
    createdAt: '2026-05-18',
  },
  {
    id: 'cmqw3n7d42',
    name: 'Production Manager',
    description: 'Manages production entries and views inventory and dashboard data.',
    rightIds: ['cmpapwdiy0', 'cmpapwe4t0', 'cmpapweb10', 'cmpapwehq0'],
    createdAt: '2026-05-19',
  },
  {
    id: 'cmt5j9f183',
    name: 'Inventory Staff',
    description: 'Handles day-to-day stock updates and views the admin dashboard.',
    rightIds: ['cmpapwdiy0', 'cmpapwehq0', 'cmpapwep90'],
    createdAt: '2026-05-19',
  },
  {
    id: 'cmvb2h6k74',
    name: 'Accountant',
    description: 'Manages the expenses ledger and views employee and customer records.',
    rightIds: ['cmpapwdiy0', 'cmpapwd9j0', 'cmpapwf9g0', 'cmpapwfg10'],
    createdAt: '2026-05-20',
  },
  {
    id: 'cmyx8q4m15',
    name: 'Viewer',
    description: 'Read-only access to the admin dashboard for reporting purposes.',
    rightIds: ['cmpapwdiy0'],
    createdAt: '2026-05-20',
  },
];

interface EmployeeRecord {
  id: string;
  name: string;
  department: string;
}

const EMPLOYEES: EmployeeRecord[] = [
  { id: 'emp001', name: 'Aarav Sharma', department: 'Administration' },
  { id: 'emp002', name: 'Priya Nair', department: 'Production' },
  { id: 'emp003', name: 'Rohit Verma', department: 'Inventory' },
  { id: 'emp004', name: 'Sneha Iyer', department: 'Human Resources' },
  { id: 'emp005', name: 'Karthik Reddy', department: 'Finance' },
  { id: 'emp006', name: 'Meera Pillai', department: 'Production' },
  { id: 'emp007', name: 'Arjun Menon', department: 'Inventory' },
  { id: 'emp008', name: 'Divya Krishnan', department: 'Administration' },
];

function generateId() {
  return `cm${Math.random().toString(36).slice(2, 11)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

const PAGE_SIZE = 5;

/* ============================================================= */
/* PAGINATION BAR (client-side — table data is static/in-memory) */
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
  modules: string[];
  onSubmit: (data: { module: string; displayName: string; rightName: string }) => void;
}

function RightFormDialog({ open, onOpenChange, initial, modules, onSubmit }: RightFormDialogProps) {
  const [module, setModule] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rightName, setRightName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isEdit = initial != null;

  useEffect(() => {
    if (open) {
      setModule(initial?.module ?? '');
      setDisplayName(initial?.displayName ?? '');
      setRightName(initial?.rightName ?? '');
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!module.trim() || !displayName.trim() || !rightName.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    onSubmit({ module: module.trim(), displayName: displayName.trim(), rightName: rightName.trim().replace(/\s+/g, '_').toLowerCase() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Right' : 'Add Right'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="right-module" className="text-sm font-semibold text-gray-600">Module</Label>
            <Input
              id="right-module"
              list="right-module-options"
              placeholder="e.g. Admin"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="h-8 text-sm"
            />
            <datalist id="right-module-options">
              {modules.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="right-display-name" className="text-sm font-semibold text-gray-600">Display Name</Label>
            <Input
              id="right-display-name"
              placeholder="e.g. Admin View Roles"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="right-name" className="text-sm font-semibold text-gray-600">Right Name</Label>
            <Input
              id="right-name"
              placeholder="e.g. admin_view_roles"
              value={rightName}
              onChange={(e) => setRightName(e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="bg-[#004D40] hover:bg-[#003D33]" onClick={handleSubmit}>
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
  initial: RoleRecord | null;
  rights: RightRecord[];
  onSubmit: (data: { name: string; description: string; rightIds: string[] }) => void;
}

function RoleFormDialog({ open, onOpenChange, initial, rights, onSubmit }: RoleFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rightIds, setRightIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isEdit = initial != null;

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setRightIds(initial?.rightIds ?? []);
      setError(null);
    }
  }, [open, initial]);

  const rightsByModule = useMemo(() => {
    const groups = new Map<string, RightRecord[]>();
    rights.forEach((r) => {
      const list = groups.get(r.module) ?? [];
      list.push(r);
      groups.set(r.module, list);
    });
    return Array.from(groups.entries());
  }, [rights]);

  const toggleRight = (id: string) => {
    setRightIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter a role name.');
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim(), rightIds });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Role' : 'Add Role'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="role-name" className="text-sm font-semibold text-gray-600">Role Name</Label>
            <Input
              id="role-name"
              placeholder="e.g. Production Manager"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="role-description" className="text-sm font-semibold text-gray-600">Description</Label>
            <Input
              id="role-description"
              placeholder="What can this role do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-sm font-semibold text-gray-600">Assigned Rights</Label>
            <div className="flex max-h-56 flex-col gap-3 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {rightsByModule.map(([module, moduleRights]) => (
                <div key={module} className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold uppercase tracking-wide text-gray-400">{module}</span>
                  {moduleRights.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={rightIds.includes(r.id)}
                        onChange={() => toggleRight(r.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#004D40] focus:ring-[#004D40]"
                      />
                      {r.displayName}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="bg-[#004D40] hover:bg-[#003D33]" onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Add Role'}
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
  roles: RoleRecord[];
  employees: EmployeeRecord[];
  assignments: Record<string, string>;
  onSubmit: (roleId: string, employeeIds: string[]) => void;
}

function AssignRoleDialog({ open, onOpenChange, roles, employees, assignments, onSubmit }: AssignRoleDialogProps) {
  const [roleId, setRoleId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRoleId('');
      setEmployeeSearch('');
      setSelectedEmployeeIds([]);
      setError(null);
    }
  }, [open]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
  }, [employees, employeeSearch]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const handleSubmit = () => {
    if (!roleId) {
      setError('Please select a role.');
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      setError('Please select at least one employee.');
      return;
    }
    setError(null);
    onSubmit(roleId, selectedEmployeeIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-sm font-semibold text-gray-600">Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="h-9 w-full text-[14px]">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-sm font-semibold text-gray-600">Employees</Label>
            <Input
              placeholder="Search employees..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="h-9 text-[14px]"
            />
            <div className="mt-1 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {filteredEmployees.length === 0 ? (
                <p className="px-2 py-3 text-center text-[14px] text-gray-400">No employees found.</p>
              ) : (
                filteredEmployees.map((employee) => {
                  const currentRoleId = assignments[employee.id];
                  const currentRole = currentRoleId ? roles.find((r) => r.id === currentRoleId) : null;
                  return (
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
                        <span className="text-[12px] text-gray-400">{employee.department}</span>
                      </span>
                      {currentRole && (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                          {currentRole.name}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="bg-[#004D40] hover:bg-[#003D33]" onClick={handleSubmit}>
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

  const [roles, setRoles] = useState<RoleRecord[]>(INITIAL_ROLES);
  const [rights, setRights] = useState<RightRecord[]>(INITIAL_RIGHTS);

  const [roleSearch, setRoleSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const [rolesPage, setRolesPage] = useState(1);
  const [rightsPage, setRightsPage] = useState(1);

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleRecord | null>(null);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const [isRightDialogOpen, setIsRightDialogOpen] = useState(false);
  const [editingRight, setEditingRight] = useState<RightRecord | null>(null);
  const [deleteRightTarget, setDeleteRightTarget] = useState<RightRecord | null>(null);

  const modules = useMemo(() => Array.from(new Set(rights.map((r) => r.module))).sort(), [rights]);

  const topRole = useMemo(
    () => roles.reduce((max, r) => (r.rightIds.length > max.rightIds.length ? r : max), roles[0]),
    [roles],
  );

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [roles, roleSearch]);

  const filteredRights = useMemo(() => {
    const q = rightSearch.trim().toLowerCase();
    return rights.filter((r) => {
      const matchesModule = moduleFilter === 'all' || r.module === moduleFilter;
      const matchesSearch = !q
        || r.displayName.toLowerCase().includes(q)
        || r.rightName.toLowerCase().includes(q)
        || r.module.toLowerCase().includes(q);
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
  const handleOpenEditRole = (role: RoleRecord) => { setEditingRole(role); setIsRoleDialogOpen(true); };
  const handleAssignSubmit = (roleId: string, employeeIds: string[]) => {
    setAssignments((prev) => {
      const next = { ...prev };
      employeeIds.forEach((employeeId) => { next[employeeId] = roleId; });
      return next;
    });
  };
  const handleRoleSubmit = (data: { name: string; description: string; rightIds: string[] }) => {
    if (editingRole) {
      setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? { ...r, ...data } : r)));
    } else {
      setRoles((prev) => [...prev, { id: generateId(), createdAt: new Date().toISOString(), ...data }]);
    }
  };
  const handleConfirmDeleteRole = () => {
    if (!deleteRoleTarget) return;
    setRoles((prev) => prev.filter((r) => r.id !== deleteRoleTarget.id));
    setDeleteRoleTarget(null);
  };

  const handleOpenAddRight = () => { setEditingRight(null); setIsRightDialogOpen(true); };
  const handleOpenEditRight = (right: RightRecord) => { setEditingRight(right); setIsRightDialogOpen(true); };
  const handleRightSubmit = (data: { module: string; displayName: string; rightName: string }) => {
    if (editingRight) {
      setRights((prev) => prev.map((r) => (r.id === editingRight.id ? { ...r, ...data } : r)));
    } else {
      setRights((prev) => [...prev, { id: generateId(), createdAt: new Date().toISOString(), ...data }]);
    }
  };
  const handleConfirmDeleteRight = () => {
    if (!deleteRightTarget) return;
    setRights((prev) => prev.filter((r) => r.id !== deleteRightTarget.id));
    setRoles((prev) => prev.map((r) => ({ ...r, rightIds: r.rightIds.filter((id) => id !== deleteRightTarget.id) })));
    setDeleteRightTarget(null);
  };

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
              HR Admin
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
              +2 <span className="font-medium text-gray-500">this month</span>
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
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="w-[18%] px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500">ID</th>
                    <th className="w-[20%] px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500">Role Name</th>
                    <th className="w-[22%] px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500">No. of Rights</th>
                    <th className="w-[25%] px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500">Created</th>
                    <th className="w-[15%] px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
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
                        <td className="px-3 py-3 text-[14px] font-medium text-gray-900">{role.name}</td>
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
                    <SelectItem key={m} value={m}>{m}</SelectItem>
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
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Right ID</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Module</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Display Name</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Right Name</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-gray-400">Created At</th>
                    <th className="px-5 py-3 text-right text-[12px] font-bold uppercase tracking-wide text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
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
                        <td className="px-5 py-3 font-mono text-[12px] font-medium text-[#004D40]">{right.id}</td>
                        <td className="px-4 py-3 text-[14px] text-gray-700">{right.module}</td>
                        <td className="px-4 py-3 text-[14px] font-semibold text-gray-900">{right.displayName}</td>
                        <td className="px-4 py-3 font-mono text-[12px] text-gray-500">{right.rightName}</td>
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
        onOpenChange={setIsRoleDialogOpen}
        initial={editingRole}
        rights={rights}
        onSubmit={handleRoleSubmit}
      />

      <DeleteConfirmDialog
        open={!!deleteRoleTarget}
        onOpenChange={(next) => { if (!next) setDeleteRoleTarget(null); }}
        onConfirm={handleConfirmDeleteRole}
        title="Delete this role?"
        description={deleteRoleTarget ? `"${deleteRoleTarget.name}" will be removed — this action cannot be undone.` : undefined}
      />

      <AssignRoleDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        roles={roles}
        employees={EMPLOYEES}
        assignments={assignments}
        onSubmit={handleAssignSubmit}
      />

      <RightFormDialog
        open={isRightDialogOpen}
        onOpenChange={setIsRightDialogOpen}
        initial={editingRight}
        modules={modules}
        onSubmit={handleRightSubmit}
      />

      <DeleteConfirmDialog
        open={!!deleteRightTarget}
        onOpenChange={(next) => { if (!next) setDeleteRightTarget(null); }}
        onConfirm={handleConfirmDeleteRight}
        title="Delete this right?"
        description={deleteRightTarget ? `"${deleteRightTarget.displayName}" will be removed from all roles — this action cannot be undone.` : undefined}
      />

    </div>
  );
}