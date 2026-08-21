import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/shared/loader';
import type { Company } from './mock-data';
import { useCompanies } from './companies-store';

interface CompanyFormDialogProps {
  onClose: () => void;
  /** Null = Add Company, otherwise editing this existing company. */
  company: Company | null;
}

/**
 * Add/Edit Company modal — fields match the Company Information card on the
 * Company Details screen exactly (Company Name, Company Code, GST Number,
 * Admin Mobile, Admin Password, Address, Status), plus Created/Updated At
 * shown read-only when editing. Backed by CompaniesProvider's in-memory
 * state (no company-management API yet).
 */
export function CompanyFormDialog({ onClose, company }: CompanyFormDialogProps) {
  const { addCompany, updateCompany } = useCompanies();
  const isEdit = !!company;

  const [name, setName] = useState(company?.name ?? '');
  const [code, setCode] = useState(company?.code ?? '');
  const [gstNumber, setGstNumber] = useState(company?.gstNumber ?? '');
  const [adminMobile, setAdminMobile] = useState(company?.adminMobile ?? '');
  const [adminPassword, setAdminPassword] = useState('');
  const [address, setAddress] = useState(company?.address ?? '');
  const [status, setStatus] = useState<Company['status']>(company?.status ?? 'Active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!name.trim() || !code.trim() || !gstNumber.trim() || !adminMobile.trim() || !address.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!isEdit && !adminPassword.trim()) {
      setError('Please set an admin password.');
      return;
    }
    setSaving(true);
    setError(null);

    const input = {
      name: name.trim(),
      code: code.trim(),
      gstNumber: gstNumber.trim(),
      adminMobile: adminMobile.trim(),
      adminPasswordHash: adminPassword.trim() || (company?.adminPasswordHash ?? ''),
      address: address.trim(),
      status,
    };

    if (company) {
      updateCompany(company.id, input);
    } else {
      addCompany(input);
    }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !saving && !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Company' : 'Add Company'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">Company Name</Label>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Infinity Textiles" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-address">Address</Label>
            <textarea
              id="company-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, State - PIN, Country"
              rows={3}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-code">Company Code</Label>
            <Input id="company-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. INTX-2024-001" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as Company['status'])}>
              <SelectTrigger id="company-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-gst">GST Number</Label>
            <Input id="company-gst" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="e.g. 33AABCI2345C1Z5" />
          </div>
          {company && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-created">Created At</Label>
              <Input id="company-created" value={company.createdAt} disabled />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-mobile">Admin Mobile</Label>
            <Input id="company-mobile" value={adminMobile} onChange={(e) => setAdminMobile(e.target.value)} placeholder="e.g. +91 98765 43210" />
          </div>
          {company && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-updated">Updated At</Label>
              <Input id="company-updated" value={company.updatedAt} disabled />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-password">Admin Password</Label>
            <Input
              id="company-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep unchanged' : 'Set an initial password'}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-[#5D8B62] hover:bg-[#4d7a52]" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader size="sm" className="mr-2" />}
            {isEdit ? 'Save changes' : 'Add company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
