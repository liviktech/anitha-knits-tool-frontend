import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Users, UserCheck, Banknote, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { AttendanceTab } from './attendance-tab';

export interface EmployeeRecord {
  id: string;
  name: string;
  designation: string;
  mobileNumber: string;
  aadharCard: string;
  dateOfJoining: string;
  residentialAddress: string;
  gender: 'Male' | 'Female' | 'Other';
  salary: number;
  status: 'Active' | 'Inactive';
}

const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'EMP-001',
    name: 'Karthik Subramanian',
    designation: 'Knitting Operator',
    mobileNumber: '+91 98765 43210',
    aadharCard: '4521 8890 1234',
    dateOfJoining: '2024-01-15',
    residentialAddress: '12/A, Factory Road, Rayapuram, Tiruppur',
    gender: 'Male',
    salary: 28000,
    status: 'Active',
  },
  {
    id: 'EMP-002',
    name: 'Priya Ramesh',
    designation: 'Quality Checker',
    mobileNumber: '+91 98421 67890',
    aadharCard: '5890 3341 9812',
    dateOfJoining: '2024-03-01',
    residentialAddress: '45, Knitting Colony, Avinashi Road, Tiruppur',
    gender: 'Female',
    salary: 24500,
    status: 'Active',
  },
  {
    id: 'EMP-003',
    name: 'Muthukumar S.',
    designation: 'Extruder Operator',
    mobileNumber: '+91 97100 23456',
    aadharCard: '6712 9044 1122',
    dateOfJoining: '2023-11-10',
    residentialAddress: '8/120, South Street, Palladam Road, Tiruppur',
    gender: 'Male',
    salary: 32000,
    status: 'Active',
  },
  {
    id: 'EMP-004',
    name: 'Lakshmi Narayanan',
    designation: 'Helper',
    mobileNumber: '+91 99445 11223',
    aadharCard: '2341 8901 7765',
    dateOfJoining: '2024-05-20',
    residentialAddress: '102, New Bus Stand Extension, Tiruppur',
    gender: 'Female',
    salary: 22000,
    status: 'Active',
  },
  {
    id: 'EMP-005',
    name: 'Suresh Kumar',
    designation: 'Supervisor',
    mobileNumber: '+91 96554 88776',
    aadharCard: '8910 4455 3321',
    dateOfJoining: '2023-08-14',
    residentialAddress: '22, Cotton Mill Line, Dharapuram Road, Tiruppur',
    gender: 'Male',
    salary: 26000,
    status: 'Inactive',
  },
];

function formatCurrency(num: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function EmployeeDirectoryTab() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(INITIAL_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);

  // Form input states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formAadhar, setFormAadhar] = useState('');
  const [formDoj, setFormDoj] = useState(todayIso());
  const [formAddress, setFormAddress] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formSalary, setFormSalary] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formError, setFormError] = useState<string | null>(null);

  // KPI Calculations
  const activeCount = useMemo(
    () => employees.filter((e) => e.status === 'Active').length,
    [employees]
  );

  const totalPayroll = useMemo(
    () => employees.filter((e) => e.status === 'Active').reduce((sum, e) => sum + e.salary, 0),
    [employees]
  );

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        emp.id.toLowerCase().includes(q) ||
        emp.name.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.mobileNumber.toLowerCase().includes(q) ||
        emp.aadharCard.toLowerCase().includes(q) ||
        emp.residentialAddress.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  const openCreateModal = () => {
    const nextNum = employees.length + 1;
    const generatedId = `EMP-${String(nextNum).padStart(3, '0')}`;
    setEditingEmployee(null);
    setFormId(generatedId);
    setFormName('');
    setFormDesignation('');
    setFormMobile('');
    setFormAadhar('');
    setFormDoj(todayIso());
    setFormAddress('');
    setFormGender('Male');
    setFormSalary('');
    setFormStatus('Active');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (emp: EmployeeRecord) => {
    setEditingEmployee(emp);
    setFormId(emp.id);
    setFormName(emp.name);
    setFormDesignation(emp.designation);
    setFormMobile(emp.mobileNumber);
    setFormAadhar(emp.aadharCard);
    setFormDoj(emp.dateOfJoining);
    setFormAddress(emp.residentialAddress);
    setFormGender(emp.gender);
    setFormSalary(String(emp.salary));
    setFormStatus(emp.status);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveEmployee = () => {
    if (!formName.trim()) {
      setFormError('Please enter employee name');
      return;
    }
    if (!formMobile.trim()) {
      setFormError('Please enter mobile number');
      return;
    }
    const parsedSalary = parseFloat(formSalary);
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      setFormError('Please enter a valid salary');
      return;
    }

    if (editingEmployee) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployee.id
            ? {
              ...emp,
              name: formName.trim(),
              designation: formDesignation.trim(),
              mobileNumber: formMobile.trim(),
              aadharCard: formAadhar.trim(),
              dateOfJoining: formDoj,
              residentialAddress: formAddress.trim(),
              gender: formGender,
              salary: parsedSalary,
              status: formStatus,
            }
            : emp
        )
      );
    } else {
      const newEmp: EmployeeRecord = {
        id: formId.trim() || `EMP-${Date.now().toString().slice(-3)}`,
        name: formName.trim(),
        designation: formDesignation.trim(),
        mobileNumber: formMobile.trim(),
        aadharCard: formAadhar.trim(),
        dateOfJoining: formDoj,
        residentialAddress: formAddress.trim(),
        gender: formGender,
        salary: parsedSalary,
        status: formStatus,
      };
      setEmployees((prev) => [newEmp, ...prev]);
    }

    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setEmployees((prev) => prev.filter((emp) => emp.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Employees</span>
            <div className="text-2xl font-bold text-[#1F2E27] mt-1">{employees.length}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-[#004D40]">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Staff</span>
            <div className="text-2xl font-bold text-[#1F2E27] mt-1">{activeCount}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Monthly Payroll</span>
            <div className="text-2xl font-bold text-[#1F2E27] mt-1">{formatCurrency(totalPayroll)}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700">
            <Banknote className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
        {/* Header Bar matching project module theme */}
        <div className="border-b border-emerald-100 p-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-emerald-200 bg-emerald-50 text-[#004D40]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Employee Directory</h2>
              <p className="text-xs text-gray-500">Manage worker profiles, contact info, and salary master data</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search name, ID, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-44 sm:w-60 pl-8 bg-gray-50/50 border-gray-200 text-xs rounded-lg focus-visible:ring-[#004D40]"
              />
            </div>

            {/* Status Dropdown Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 bg-gray-50/50 border-gray-200 text-xs rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Add Employee Button */}
            <Button
              size="sm"
              className="h-8 gap-1 rounded-full bg-[#004D40] text-white hover:bg-[#00332a] px-3.5 text-xs font-medium cursor-pointer"
              onClick={openCreateModal}
            >
              <Plus className="h-3.5 w-3.5" /> Add Employee
            </Button>
          </div>
        </div>

        {/* Static Data Table with requested fields */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-emerald-50/30">
              <TableRow className="hover:bg-transparent border-b border-emerald-100">
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 pl-4 w-[90px]">
                  ID
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 min-w-[150px]">
                  Name
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 min-w-[150px]">
                  Designation
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 min-w-[130px]">
                  Mobile Number
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 min-w-[130px]">
                  Aadhar Card
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 min-w-[110px]">
                  Date of Joining
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 min-w-[200px]">
                  Residential Address
                </TableHead>
                <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-500 min-w-[80px]">
                  Gender
                </TableHead>
                <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-500 min-w-[90px]">
                  Status
                </TableHead>
                <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-500 pr-4 w-[100px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-28 text-center text-gray-500 text-xs">
                    No employees found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="border-b border-emerald-50 last:border-b-0 hover:bg-emerald-50/30 transition-colors"
                  >
                    <TableCell className="pl-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                      {emp.id}
                    </TableCell>
                    <TableCell className="py-3 text-xs font-semibold text-gray-900 whitespace-nowrap">
                      {emp.name}
                    </TableCell>
                    <TableCell className="text-xs text-gray-700 whitespace-nowrap">
                      {emp.designation}
                    </TableCell>
                    <TableCell className="text-xs text-gray-700 whitespace-nowrap">
                      {emp.mobileNumber}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">
                      {emp.aadharCard || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                      {formatDateDisplay(emp.dateOfJoining)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 max-w-[240px] truncate" title={emp.residentialAddress}>
                      {emp.residentialAddress || '-'}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {emp.gender}
                      </span>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${emp.status === 'Active'
                            ? 'bg-emerald-50 text-[#004D40] border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {emp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center pr-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                          aria-label="Edit employee"
                          onClick={() => openEditModal(emp)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                          aria-label="Delete employee"
                          onClick={() => setDeleteTarget(emp)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer */}
        <div className="p-3 border-t border-emerald-100 bg-emerald-50/20 text-xs text-gray-500 flex justify-between items-center px-4">
          <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
          <span className="font-semibold text-gray-700">
            Active Payroll: {formatCurrency(totalPayroll)}
          </span>
        </div>
      </div>

      {/* Add / Edit Employee Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {editingEmployee ? 'Edit Employee Record' : 'Add New Employee'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-id" className="text-xs font-semibold text-gray-700">Employee ID</Label>
              <Input
                id="emp-id"
                placeholder="e.g. EMP-006"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={!!editingEmployee}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-name" className="text-xs font-semibold text-gray-700">Full Name</Label>
              <Input
                id="emp-name"
                placeholder="e.g. Ramesh Kumar"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-designation" className="text-xs font-semibold text-gray-700">Designation</Label>
              <Input
                id="emp-designation"
                placeholder="e.g. Knitting Operator"
                value={formDesignation}
                onChange={(e) => setFormDesignation(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-mobile" className="text-xs font-semibold text-gray-700">Mobile Number</Label>
              <Input
                id="emp-mobile"
                placeholder="e.g. +91 98765 43210"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-aadhar" className="text-xs font-semibold text-gray-700">Aadhar Card</Label>
              <Input
                id="emp-aadhar"
                placeholder="e.g. 4521 8890 1234"
                value={formAadhar}
                onChange={(e) => setFormAadhar(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-doj" className="text-xs font-semibold text-gray-700">Date of Joining</Label>
              <Input
                id="emp-doj"
                type="date"
                value={formDoj}
                onChange={(e) => setFormDoj(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-gender" className="text-xs font-semibold text-gray-700">Gender</Label>
              <Select value={formGender} onValueChange={(val) => setFormGender(val as 'Male' | 'Female' | 'Other')}>
                <SelectTrigger id="emp-gender" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-salary" className="text-xs font-semibold text-gray-700">Monthly Salary (₹)</Label>
              <Input
                id="emp-salary"
                type="number"
                placeholder="e.g. 25000"
                value={formSalary}
                onChange={(e) => setFormSalary(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-status" className="text-xs font-semibold text-gray-700">Status</Label>
              <Select value={formStatus} onValueChange={(val) => setFormStatus(val as 'Active' | 'Inactive')}>
                <SelectTrigger id="emp-status" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="emp-address" className="text-xs font-semibold text-gray-700">Residential Address</Label>
              <Input
                id="emp-address"
                placeholder="Door No, Street Name, City..."
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {formError && <p className="sm:col-span-2 text-xs text-red-600 font-medium">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEmployee} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
              {editingEmployee ? 'Save Changes' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee Record?"
        description={
          deleteTarget
            ? `Are you sure you want to delete employee record for ${deleteTarget.name} (${deleteTarget.id})?`
            : 'This action cannot be undone.'
        }
      />
    </div>
  );
}

export function EmployeePage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <p className="text-sm text-gray-500">Manage worker profiles, contact info, and daily attendance</p>
      </div>

      <Tabs defaultValue="directory">
        <TabsList variant="underline">
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="mt-4">
          <EmployeeDirectoryTab />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
