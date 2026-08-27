import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Users, UserCheck, Banknote, User, Loader2, Calendar } from 'lucide-react';
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
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  salary: number;
  status: 'Active' | 'Inactive';
}

import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from './employee-queries';
import type { Employee } from './employee-queries';

function formatCurrency(num: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('T')[0].split('-');
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

function todayFormatted() {
  const date = new Date();
  return `Today, ${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`;
}

function EmployeeDirectoryTab() {
  const { data: employees = [] } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  // Form input states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formAadhar, setFormAadhar] = useState('');
  const [formDoj, setFormDoj] = useState(todayIso());
  const [formAddress, setFormAddress] = useState('');
  const [formGender, setFormGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [formSalary, setFormSalary] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // KPI Calculations
  const activeCount = useMemo(
    () => employees.filter((e) => e.isActive).length,
    [employees]
  );

  const totalPayroll = useMemo(
    () => employees.filter((e) => e.isActive).reduce((sum, e) => sum + (e.employeeDetails?.salary || 0), 0),
    [employees]
  );

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase();
      const empId = emp.employeeDetails?.customUserId || emp.id;
      const matchesSearch =
        empId.toLowerCase().includes(q) ||
        (emp.name || '').toLowerCase().includes(q) ||
        (emp.employeeDetails?.designation || '').toLowerCase().includes(q) ||
        emp.mobile.toLowerCase().includes(q) ||
        (emp.employeeDetails?.aadhaarNumber || '').toLowerCase().includes(q) ||
        (emp.employeeDetails?.address || '').toLowerCase().includes(q);

      const statusStr = emp.isActive ? 'Active' : 'Inactive';
      const matchesStatus = statusFilter === 'ALL' || statusStr === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormId('');
    setFormName('');
    setFormDesignation('');
    setFormMobile('');
    setFormAadhar('');
    setFormDoj(todayIso());
    setFormAddress('');
    setFormGender('MALE');
    setFormSalary('');
    setFormStatus('Active');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormId(emp.employeeDetails?.customUserId || emp.id);
    setFormName(emp.name || '');
    setFormDesignation(emp.employeeDetails?.designation || '');
    setFormMobile(emp.mobile);
    setFormAadhar(emp.employeeDetails?.aadhaarNumber || '');
    // Take YYYY-MM-DD from ISO string
    const doj = emp.employeeDetails?.joiningDate ? emp.employeeDetails.joiningDate.split('T')[0] : todayIso();
    setFormDoj(doj);
    setFormAddress(emp.employeeDetails?.address || '');
    setFormGender(emp.employeeDetails?.gender || 'MALE');
    setFormSalary(emp.employeeDetails?.salary ? String(emp.employeeDetails.salary) : '');
    setFormStatus(emp.isActive ? 'Active' : 'Inactive');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!formName.trim()) {
      setFormError('Please enter employee name');
      return;
    }
    if (!formMobile.trim()) {
      setFormError('Please enter mobile number');
      return;
    }
    const parsedSalary = parseFloat(formSalary);
    if (formSalary && (isNaN(parsedSalary) || parsedSalary < 0)) {
      setFormError('Please enter a valid salary');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formName.trim(),
        mobile: formMobile.trim(),
        isActive: formStatus === 'Active',
        employeeDetails: {
          designation: formDesignation.trim(),
          address: formAddress.trim(),
          gender: formGender,
          salary: parsedSalary || undefined,
          aadhaarNumber: formAadhar.trim(),
          joiningDate: formDoj ? new Date(formDoj).toISOString() : undefined,
        },
      };

      if (editingEmployee) {
        await updateEmployee.mutateAsync({ id: editingEmployee.id, data: payload as any });
      } else {
        await createEmployee.mutateAsync(payload as any);
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
      setFormError('Failed to save employee. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="flex flex-col gap-2 h-[calc(100%-3px)] flex-1 min-h-0">
      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" style={{ fontFamily: "'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif" }}>
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-emerald-300 transition-colors flex flex-col h-full justify-center">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/employees.png" alt="" className="w-20 h-20 object-contain" />
          </div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div><img src="/employees.png" alt="Total Employees" className="w-14 h-14 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">Total Employees</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{employees.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-300 transition-colors flex flex-col h-full justify-center">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/staff.png" alt="" className="w-18 h-18 object-contain" />
          </div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div><img src="/staff.png" alt="Active Staff" className="w-12 h-12 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">Active Staff</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{activeCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-purple-300 transition-colors flex flex-col h-full justify-center">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/payroll.png" alt="" className="w-18 h-18 object-contain" />
          </div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div><img src="/payroll.png" alt="Monthly Payroll" className="w-12 h-12 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">Monthly Payroll</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{formatCurrency(totalPayroll)}</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Header Bar matching project module theme */}
        <div className="border-b border-emerald-400 p-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"></div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-44 sm:w-60 pl-8 bg-gray-50/50 border-gray-400 text-xs rounded-lg font-hanken"
              />
            </div>

            {/* Status Dropdown Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 bg-gray-50/50 border-gray-400 text-sm rounded-lg font-hanken">
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
              className="h-8 gap-1 bg-[#004D40] text-white hover:bg-[#00332a] px-3.5 text-sm font-medium cursor-pointer font-hanken"
              onClick={openCreateModal}
            >
              <Plus className="h-3.5 w-3.5" /> Add Employee
            </Button>
          </div>
        </div>

        {/* Static Data Table with requested fields */}
        <div className="overflow-x-auto flex-1 flex flex-col">
          <Table className="font-hanken">
            <TableHeader className="bg-emerald-50/30">
              <TableRow className="hover:bg-transparent border-b border-emerald-400">
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 pl-4 w-[90px]">
                  ID
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 min-w-[150px]">
                  Name
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 min-w-[150px]">
                  Designation
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 min-w-[130px]">
                  Mobile Number
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 min-w-[130px]">
                  Aadhar Card
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 min-w-[110px]">
                  Date of Joining
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 min-w-[200px]">
                  Residential Address
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 min-w-[80px]">
                  Gender
                </TableHead>
                <TableHead className="text-center text-sm font-semibold tracking-wide text-gray-800 min-w-[90px]">
                  Status
                </TableHead>
                <TableHead className="text-center text-sm font-semibold tracking-wide text-gray-800 pr-4 w-[100px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="border-b border-emerald-50 last:border-b-0 hover:bg-emerald-50/30 transition-colors"
                  >
                    <TableCell className="pl-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                      {emp.employeeDetails?.customUserId || emp.id}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {emp.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                      {emp.employeeDetails?.designation || '-'}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-700 whitespace-nowrap">
                      {emp.mobile}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600 font-mono whitespace-nowrap">
                      {emp.employeeDetails?.aadhaarNumber || '-'}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600 whitespace-nowrap">
                      {formatDateDisplay(emp.employeeDetails?.joiningDate || '')}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[240px] truncate" title={emp.employeeDetails?.address || ''}>
                      {emp.employeeDetails?.address || '-'}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {emp.employeeDetails?.gender || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${emp.isActive
                          ? 'bg-emerald-50 text-[#004D40] border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {emp.isActive ? 'Active' : 'Inactive'}
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
              }
            </TableBody>
          </Table>
          {filteredEmployees.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-md">
              No employees found matching your criteria.
            </div>
          )}
        </div>

        {/* Table Footer */}
        <div className="p-3 border-t border-gray-400 bg-emerald-50/20 text-xs text-gray-700 flex justify-between items-center px-4">
          <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
          <span className="font-semibold text-gray-700">
            Active Payroll: <span className='text-green-600'>{formatCurrency(totalPayroll)}</span>
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
              <Select value={formGender} onValueChange={(val) => setFormGender(val as 'MALE' | 'FEMALE' | 'OTHER')}>
                <SelectTrigger id="emp-gender" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
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
            <Button size="sm" onClick={handleSaveEmployee} disabled={isSaving} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
              {editingEmployee ? 'Save Changes' : 'Add Employee'}
              {isSaving && <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin" />}
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
  const [activeTab, setActiveTab] = useState('directory');

  return (
    <div className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b-4 border-[#004D40] shrink-0">
        <div>
          <h1 className="font-hanken text-[20px] font-bold text-black leading-tight px-2">Employees</h1>
          <p className="font-hanken text-[12.5px] text-gray-500 font-medium px-2">Manage worker profiles, contact info, and daily attendance</p>
        </div>
        {activeTab === 'attendance' && (
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm pointer-events-none">
            <span className="text-sm font-medium text-gray-700">{todayFormatted()}</span>
            <Calendar className="h-4 w-4 text-gray-500" />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-y-auto px-2 pb-1 gap-1">
        <TabsList variant="underline" className="px-1 gap-1.5 h-auto">
          <TabsTrigger value="directory" className="rounded-md border transition-all duration-200 py-1! px-3! bg-gray-100! text-gray-800! border-gray-400! data-[state=active]:bg-[#004D40]! data-[state=active]:text-white! data-[state=active]:border-[#004D40]!">Directory</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-md border transition-all duration-200 py-1! px-3! bg-gray-100! text-gray-800! border-gray-400! data-[state=active]:bg-[#004D40]! data-[state=active]:text-white! data-[state=active]:border-[#004D40]!">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="mt-4 animate-in fade-in-0 duration-300">
          <EmployeeDirectoryTab />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4 animate-in fade-in-0 duration-300">
          <AttendanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
