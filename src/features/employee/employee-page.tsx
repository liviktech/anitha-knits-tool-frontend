import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, Calendar, Wallet, Upload, UserRound, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';
import { AttendanceTab, type AttendanceTabRef } from './attendance-tab';
import { PayrollTab, type PayrollTabRef } from './payroll-tab';
import { useAuth } from '@/features/auth/auth-context';
import { can, hasTabAccess } from '@/lib/access';
import { RIGHTS } from '@/lib/permissions';


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





const MAX_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;
function ViewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      <p className="text-sm font-medium text-gray-900 wrap-break-word">{value}</p>
    </div>
  );
}

function FileUploadField({
  id,
  label,
  file,
  accept,
  existingUrl,
  isAllowedType,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  accept: string;
  existingUrl?: string | null;
  isAllowedType: (mimetype: string) => boolean;
  onChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isImage = !!file && file.type.startsWith('image/');

  useEffect(() => {
    if (!isImage || !file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const handleFileSelected = (selected: File | null) => {
    if (!selected) {
      setValidationError(null);
      onChange(null);
      return;
    }
    if (!isAllowedType(selected.type)) {
      setValidationError('Unsupported file type.');
      return;
    }
    if (selected.size > MAX_UPLOAD_SIZE_BYTES) {
      setValidationError('File exceeds the 3MB size limit.');
      return;
    }
    setValidationError(null);
    onChange(selected);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-gray-700">{label}</Label>
      <label
        htmlFor={id}
        className="relative flex flex-col items-center justify-center gap-1 h-40 rounded-md border border-dashed border-gray-400 bg-gray-50/50 text-gray-500 hover:bg-gray-100 cursor-pointer text-center px-2 transition-colors overflow-hidden"
      >
        {file && previewUrl ? (
          <>
            <img src={previewUrl} alt={label} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-2xs leading-tight text-white">{file.name}</span>
          </>
        ) : file ? (
          <>
            <Upload className="h-4 w-4" />
            <span className="text-[11px] leading-tight break-all line-clamp-2">{file.name}</span>
          </>
        ) : existingUrl ? (
          <>
            <Upload className="h-4 w-4" />
            <span className="text-[11px] leading-tight break-all line-clamp-2">Uploaded — click to replace</span>
            <a
              href={existingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] underline text-emerald-700 hover:text-emerald-800"
            >
              View current file
            </a>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            <span className="text-[11px] leading-tight break-all line-clamp-2">Click to upload</span>
          </>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
      />
      {validationError && <p className="text-[11px] text-red-600 font-medium">{validationError}</p>}
    </div>
  );
}

export interface EmployeeDirectoryTabRef {
  openCreateModal: () => void;
}

const EmployeeDirectoryTab = forwardRef<EmployeeDirectoryTabRef>((_props, ref) => {
  const { user } = useAuth();
  const canEdit = can(user, RIGHTS.employees.directory.edit);
  const canDelete = can(user, RIGHTS.employees.directory.delete);
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [viewTarget, setViewTarget] = useState<Employee | null>(null);

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
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formAadharFile, setFormAadharFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Real-time validation
  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (hasAttemptedSubmit && !formName.trim()) errs.name = "Name is required";
    else if (formName !== '' && formName.trim().length < 3) errs.name = "Name must be at least 3 characters";

    if (hasAttemptedSubmit && !formDesignation.trim()) errs.designation = "Designation is required";
    else if (formDesignation !== '' && formDesignation.trim().length < 2) errs.designation = "Designation is too short";

    if (hasAttemptedSubmit && !formMobile.trim()) errs.mobile = "Mobile number is required";
    else if (formMobile !== '' && !/^\+?\d{10,12}$/.test(formMobile.replace(/\s/g, ''))) errs.mobile = "Invalid mobile number";

    if (hasAttemptedSubmit && !formAadhar.trim()) errs.aadhar = "Aadhar number is required";
    else if (formAadhar !== '' && !/^\d{12}$/.test(formAadhar.replace(/\s/g, ''))) errs.aadhar = "Aadhar must be exactly 12 digits";

    if (hasAttemptedSubmit && !formAddress.trim()) errs.address = "Address is required";
    else if (formAddress !== '' && formAddress.trim().length < 5) errs.address = "Address is too short";

    const parsedSalary = parseFloat(formSalary);
    if (hasAttemptedSubmit && (!formSalary || isNaN(parsedSalary) || parsedSalary < 0)) errs.salary = "Valid salary is required";

    return errs;
  }, [formName, formDesignation, formMobile, formAadhar, formAddress, formSalary, hasAttemptedSubmit, editingEmployee]);


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
  }, [employees, searchQuery, statusFilter, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedEmployees = useMemo(
    () => filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredEmployees, currentPage, pageSize],
  );

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
    setFormPhoto(null);
    setFormAadharFile(null);
    setFormError(null);
    setHasAttemptedSubmit(false);
    setIsFormOpen(true);
  };

  useImperativeHandle(ref, () => ({ openCreateModal }));

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
    setFormPhoto(null);
    setFormAadharFile(null);
    setFormError(null);
    setHasAttemptedSubmit(false);
    setIsFormOpen(true);
  };

  const handleSaveEmployee = async () => {
    setHasAttemptedSubmit(true);
    setFormError(null);

    if (Object.keys(fieldErrors).length > 0) {
      setFormError('Please fix the errors in the form before saving.');
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
          salary: formSalary ? parseFloat(formSalary) : undefined,
          aadhaarNumber: formAadhar.trim(),
          joiningDate: formDoj ? new Date(formDoj).toISOString() : undefined,
        },
      };

      if (editingEmployee) {
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          data: { ...payload, photo: formPhoto, aadhaarFile: formAadharFile },
        });
      } else {
        await createEmployee.mutateAsync({
          ...payload,
          password: '',
          photo: formPhoto,
          aadhaarFile: formAadharFile,
        });
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to save employee. Please try again.');
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
    <div className="flex flex-col gap-2 h-[calc(100%-3px)] flex-1 min-h-0 p-2">
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

            {/* Role Dropdown Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 w-32 bg-gray-50/50 border-gray-400 text-sm rounded-lg font-hanken">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Dropdown Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 bg-gray-50/50 border-gray-400 text-sm rounded-lg font-hanken">
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

        {/* Static Data Table with requested fields */}
        <div className="overflow-x-auto overflow-y-auto flex-1 flex flex-col min-h-0">
          <Table className="border-collapse font-hanken">
            <TableHeader className="bg-emerald-50/30 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-b border-gray-300">
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 pl-3 pr-2 w-[80px] border-r border-gray-300">
                  ID
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-2 w-[130px] border-r border-gray-300">
                  Name
                </TableHead>
                
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-2 w-[130px] border-r border-gray-300">
                  Designation
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-2 w-[110px] border-r border-gray-300">
                  Mobile Number
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-2 w-[110px] border-r border-gray-300">
                  Aadhar Card
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-2 w-[100px] border-r border-gray-300">
                  Date of Joining
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-2 w-[160px] border-r border-gray-300">
                  Residential Address
                </TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-gray-800 px-2 w-[70px] border-r border-gray-300">
                  Gender
                </TableHead>
                <TableHead className="text-center text-sm font-semibold tracking-wide text-gray-800 px-2 w-[80px] border-r border-gray-300">
                  Status
                </TableHead>
                <TableHead className="!text-center text-sm font-semibold tracking-wide text-gray-800 pl-2 pr-3 w-[90px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-28 text-center text-gray-500 text-sm">
                    <div className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading employees...</div>
                  </TableCell>
                </TableRow>
              ) : pagedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-28 !text-center text-gray-500 text-sm">No employees found matching your criteria.</TableCell>
                </TableRow>
              ) : (
                pagedEmployees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="border-b border-gray-300 hover:bg-emerald-50/30 transition-colors"
                  >
                    <TableCell className="pl-3 pr-2 py-2 text-sm font-bold whitespace-nowrap border-r border-gray-300">
                      <button
                        type="button"
                        onClick={() => setViewTarget(emp)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {emp.employeeDetails?.customUserId || emp.id}
                      </button>
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm font-semibold text-gray-900 whitespace-nowrap border-r border-gray-300">
                      {emp.name || '-'}
                    </TableCell>
                    
                    <TableCell className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap border-r border-gray-300">
                      {emp.employeeDetails?.designation || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-[13px] text-gray-700 whitespace-nowrap border-r border-gray-300">
                      {emp.mobile}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-[13px] text-gray-700 whitespace-nowrap border-r border-gray-300">
                      {emp.employeeDetails?.aadhaarNumber || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-[13px] text-gray-600 whitespace-nowrap border-r border-gray-300">
                      {formatDateDisplay(emp.employeeDetails?.joiningDate || '')}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm text-gray-600 max-w-[240px] truncate border-r border-gray-300" title={emp.employeeDetails?.address || ''}>
                      {emp.employeeDetails?.address || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm whitespace-nowrap border-r border-gray-300">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {emp.employeeDetails?.gender || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-2 text-center whitespace-nowrap border-r border-gray-300">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${emp.isActive
                          ? 'bg-emerald-50 text-[#004D40] border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="pl-2 pr-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                            aria-label="Edit employee"
                            onClick={() => openEditModal(emp)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                            aria-label="Delete employee"
                            onClick={() => setDeleteTarget(emp)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* {!isLoading && filteredEmployees.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-md">
              No employees found matching your criteria.
            </div>
          )} */}
        </div>

        {/* Table Footer */}
        <div className="p-3 border-t border-gray-400 bg-emerald-50/20 text-xs text-gray-700 flex flex-wrap justify-between items-center gap-3 px-4">
          <span>
            Showing {filteredEmployees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} employees
          </span>

          <TablePaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />

          <RowsPerPageSelect pageSize={pageSize} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      </div>

      {/* Add / Edit Employee Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl border border-gray-400 flex flex-col max-h-[90vh]">
          <DialogHeader className="-mx-4 -mt-4 mb-2 shrink-0 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black">
              {editingEmployee ? 'Edit Employee Record' : 'Add New Employee'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-id" className="text-xs font-semibold text-gray-700">Employee ID</Label>
                <Input
                  id="emp-id"
                  placeholder="Auto-generated"
                  value={formId}
                  disabled
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-name" className={`text-xs font-semibold ${fieldErrors.name ? 'text-red-600' : 'text-gray-700'}`}>Full Name</Label>
                <Input
                  id="emp-name"
                  placeholder="e.g. Ramesh Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`h-9 text-xs ${fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.name && <span className="text-[10px] text-red-500">{fieldErrors.name}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-designation" className={`text-xs font-semibold ${fieldErrors.designation ? 'text-red-600' : 'text-gray-700'}`}>Designation</Label>
                <Input
                  id="emp-designation"
                  list="designation-list"
                  placeholder="Select or type designation..."
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className={`h-9 text-xs ${fieldErrors.designation ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  autoComplete="off"
                />
                <datalist id="designation-list">
                  <option value="Manager" />
                  <option value="Supervisor" />
                  <option value="Knitting Operator" />
                  <option value="Employee" />
                </datalist>
                {fieldErrors.designation && <span className="text-[10px] text-red-500">{fieldErrors.designation}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-mobile" className={`text-xs font-semibold ${fieldErrors.mobile ? 'text-red-600' : 'text-gray-700'}`}>Mobile Number</Label>
                <Input
                  id="emp-mobile"
                  placeholder="e.g. 98765 43210"
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  className={`h-9 text-xs ${fieldErrors.mobile ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.mobile && <span className="text-[10px] text-red-500">{fieldErrors.mobile}</span>}
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
                <Label htmlFor="emp-salary" className={`text-xs font-semibold ${fieldErrors.salary ? 'text-red-600' : 'text-gray-700'}`}>Monthly Salary (₹)</Label>
                <Input
                  id="emp-salary"
                  type="number"
                  min="0"
                  placeholder="e.g. 25000"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value.replace(/-/g, ''))}
                  className={`h-9 text-xs ${fieldErrors.salary ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.salary && <span className="text-[10px] text-red-500">{fieldErrors.salary}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-gender" className="text-xs font-semibold text-gray-700">Gender</Label>
                <Select value={formGender} onValueChange={(val) => setFormGender(val as 'MALE' | 'FEMALE' | 'OTHER')}>
                  <SelectTrigger id="emp-gender" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-status" className="text-xs font-semibold text-gray-700">Status</Label>
                <Select value={formStatus} onValueChange={(val) => setFormStatus(val as 'Active' | 'Inactive')}>
                  <SelectTrigger id="emp-status" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-aadhar" className={`text-xs font-semibold ${fieldErrors.aadhar ? 'text-red-600' : 'text-gray-700'}`}>Aadhar Card</Label>
                <Input
                  id="emp-aadhar"
                  placeholder="e.g. 4521 8890 1234"
                  value={formAadhar}
                  onChange={(e) => setFormAadhar(e.target.value)}
                  className={`h-9 text-xs ${fieldErrors.aadhar ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.aadhar && <span className="text-[10px] text-red-500">{fieldErrors.aadhar}</span>}
              </div>

              <div className="sm:col-span-3 flex flex-col gap-1.5">
                <Label htmlFor="emp-address" className={`text-xs font-semibold ${fieldErrors.address ? 'text-red-600' : 'text-gray-700'}`}>Residential Address</Label>
                <Input
                  id="emp-address"
                  placeholder="Door No, Street Name, City..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className={`h-9 text-xs ${fieldErrors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.address && <span className="text-[10px] text-red-500">{fieldErrors.address}</span>}
              </div>

              {formError && <p className="sm:col-span-3 text-xs text-red-600 font-medium">{formError}</p>}

              <div className="sm:col-span-3 flex flex-col gap-3 pt-2 border-t border-gray-200">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Uploads</h3>
                <div className="flex flex-row gap-4">
                  <div className="flex-1">
                    <FileUploadField
                      id="emp-photo"
                      label="Employee Photo"
                      file={formPhoto}
                      accept="image/*"
                      existingUrl={editingEmployee?.employeeDetails?.photoUrl}
                      isAllowedType={(mimetype) => mimetype.startsWith('image/')}
                      onChange={setFormPhoto}
                    />
                  </div>
                  <div className="flex-1">
                    <FileUploadField
                      id="emp-aadhar-file"
                      label="Aadhar Card Upload"
                      file={formAadharFile}
                      accept="image/*,.pdf"
                      existingUrl={editingEmployee?.employeeDetails?.aadhaarDocumentUrl}
                      isAllowedType={(mimetype) => mimetype.startsWith('image/') || mimetype === 'application/pdf'}
                      onChange={setFormAadharFile}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-gray-200 bg-white pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEmployee} disabled={isSaving} className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4">
              {editingEmployee ? 'Update' : 'Add'}
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
            ? `Are you sure you want to delete this record?`
            : 'This action cannot be undone.'
        }
      />

      {/* View Employee Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg border border-gray-400">
          <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
            <DialogTitle className="text-lg font-bold text-black">Employee Details</DialogTitle>
          </DialogHeader>

          {viewTarget && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
              <ViewField label="Employee ID" value={viewTarget.employeeDetails?.customUserId || viewTarget.id} />
              <ViewField label="Full Name" value={viewTarget.name || '-'} />
              <ViewField label="Designation" value={viewTarget.employeeDetails?.designation || '-'} />
              <ViewField label="Mobile Number" value={viewTarget.mobile} />
              <ViewField label="Date of Joining" value={formatDateDisplay(viewTarget.employeeDetails?.joiningDate || '')} />
              <ViewField label="Monthly Salary (₹)" value={viewTarget.employeeDetails?.salary ? formatCurrency(viewTarget.employeeDetails.salary) : '-'} />
              <ViewField label="Gender" value={viewTarget.employeeDetails?.gender || '-'} />
              <ViewField label="Status" value={viewTarget.isActive ? 'Active' : 'Inactive'} />
              <ViewField label="Aadhar Card" value={viewTarget.employeeDetails?.aadhaarNumber || '-'} />
              <div className="sm:col-span-3">
                <ViewField label="Residential Address" value={viewTarget.employeeDetails?.address || '-'} />
              </div>
            </div>
          )}

          <DialogFooter className="border-gray-200 bg-white">
            <Button variant="outline" size="sm" onClick={() => setViewTarget(null)} className="h-8 text-xs">
              Close
            </Button>
            {canEdit && (
              <Button
                size="sm"
                className="h-8 bg-[#004D40] hover:bg-[#00332a] text-white text-xs font-medium px-4"
                onClick={() => {
                  if (viewTarget) openEditModal(viewTarget);
                  setViewTarget(null);
                }}
              >
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});


const EMPLOYEE_TABS = [
  { value: 'directory', tabCode: 'directory' },
  { value: 'attendance', tabCode: 'attendance' },
  { value: 'payroll', tabCode: 'payroll' },
] as const;

export function EmployeePage() {
  const { user } = useAuth();
  const visibleTabs = useMemo<string[]>(
    () => EMPLOYEE_TABS.filter((t) => hasTabAccess(user, 'employees', t.tabCode)).map((t) => t.value),
    [user],
  );
  const canSeeDirectory = visibleTabs.includes('directory');
  const canSeeAttendance = visibleTabs.includes('attendance');
  const canSeePayroll = visibleTabs.includes('payroll');
  const canAddEmployee = can(user, RIGHTS.employees.directory.add);
  const canMarkAttendance = can(user, RIGHTS.employees.attendance.edit);

  const [activeTab, setActiveTab] = useState('directory');
  const directoryRef = useRef<EmployeeDirectoryTabRef>(null);
  const attendanceRef = useRef<AttendanceTabRef>(null);
  const payrollRef = useRef<PayrollTabRef>(null);

  // Keep activeTab pointed at a tab this user can actually see — matters when their
  // RoleAccess doesn't grant "directory" (today's default) or changes mid-session.
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
  }, [visibleTabs, activeTab]);

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500">
        You don&apos;t have access to any Employees tab yet. Contact your admin to request access.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div>
          <h1 className="font-hanken text-[20px] font-bold text-black leading-tight px-2">Employees</h1>
          <p className="font-hanken text-[12.5px] text-gray-500 font-medium px-2">Manage worker profiles, contact info, and daily attendance</p>
        </div>
        {activeTab === 'attendance' && canSeeAttendance && (
          <div className="flex items-center gap-3">
            {/* <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm pointer-events-none">
              <span className="text-sm font-medium text-gray-700">{todayFormatted()}</span>
              <Calendar className="h-4 w-4 text-gray-500" />
            </div> */}
            {canMarkAttendance && (
              <Button
                className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)]"
                onClick={() => attendanceRef.current?.openAddModal()}
              >
                <Plus className="w-3 h-3" />
                ADD ATTENDANCE
              </Button>
            )}
          </div>
        )}
        {activeTab === 'directory' && canSeeDirectory && canAddEmployee && (
          <Button
            className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)]"
            onClick={() => directoryRef.current?.openCreateModal()}
          >
            <Plus className="w-3 h-3" />
            ADD EMPLOYEE
          </Button>
        )}
        {activeTab === 'payroll' && (
          <Button
            className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)]"
            onClick={() => payrollRef.current?.openGenerateModal()}
          >
            <FileText className="w-3 h-3" />
            GENERATE PAYROLL
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-y-auto pb-1 gap-1">
        <div className="px-1">
          <TabsList variant="notch-flip">
            {canSeeDirectory && (
              <TabsTrigger value="directory">
                <span className="flex items-center gap-1">
                  <UserRound className="h-4 w-4" strokeWidth={1.75} />
                  Directory
                </span>
              </TabsTrigger>
            )}
            {canSeeAttendance && (
              <TabsTrigger value="attendance">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" strokeWidth={1.75} />
                  Attendance
                </span>
              </TabsTrigger>
            )}
            {canSeePayroll && (
              <TabsTrigger value="payroll">
                <span className="flex items-center gap-1">
                  <Wallet className="h-4 w-4" strokeWidth={1.75} />
                  Payroll
                </span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        {canSeeDirectory && (
          <TabsContent value="directory" className="mt-0 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 ease-in-out">
            <EmployeeDirectoryTab ref={directoryRef} />
          </TabsContent>
        )}
        {canSeeAttendance && (
          <TabsContent value="attendance" className="mt-0 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 ease-in-out">
            <AttendanceTab ref={attendanceRef} />
          </TabsContent>
        )}
        {canSeePayroll && (
          <TabsContent value="payroll" className="mt-0 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 ease-in-out">
            <PayrollTab ref={payrollRef} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
