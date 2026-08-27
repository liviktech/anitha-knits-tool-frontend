import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/shared/loader';
import { apiFetch } from '@/lib/api-client';
import {
  companiesKeys,
  useCompanies,
  formatCompanyDate,
  type Company,
  type CompanyCreatePayload,
  type CompanyUpdatePayload,
} from './companies-queries';

interface CompanyFormDialogProps {
  onClose: () => void;
  /** Null = Add Company, otherwise editing this existing company. */
  company: Company | null;
}

interface ErrorEnvelope {
  error?: { message?: string };
}


/**
 * Add/Edit Company modal, backed by POST/PATCH /api/v1/platform/admin/companies.
 * Add creates the company and its first ADMIN user in one call (adminPassword
 * required); Edit uses the update endpoint, which never accepts a password —
 * resetting the admin's password is a separate concern the API doesn't expose here.
 */
export function CompanyFormDialog({ onClose, company }: CompanyFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!company;
  const { data: companiesData } = useCompanies('?limit=100');

  const [name, setName] = useState(company?.name ?? '');
  const [companyCode, setCompanyCode] = useState(company?.companyCode ?? '');
  const [gst, setGst] = useState(company?.gst ?? '');
  const [adminMobile, setAdminMobile] = useState(company?.adminMobile ?? '');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [address, setAddress] = useState(company?.address ?? '');
  const [isActive, setIsActive] = useState(company?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit && !companyCode && companiesData?.data) {
      const cmpCodes = companiesData.data
        .map(c => c.companyCode)
        .filter(code => code && code.startsWith('CMP-'))
        .map(code => parseInt(code.replace('CMP-', ''), 10))
        .filter(num => !isNaN(num));
      const max = cmpCodes.length > 0 ? Math.max(...cmpCodes) : 0;
      setCompanyCode(`CMP-${String(max + 1).padStart(3, '0')}`);
    }
  }, [isEdit, companyCode, companiesData?.data]);

  const handleSubmit = async () => {
    if (!name.trim() || !adminMobile.trim()) {
      setError('Please fill in Company Name and Admin Mobile.');
      return;
    }
    if (!isEdit && adminPassword.trim().length < 8) {
      setError('Admin password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await (company
        ? apiFetch(`/platform/admin/companies/${company.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              companyCode: companyCode.trim(),
              adminMobile: adminMobile.trim(),
              gst: gst.trim() || null,
              address: address.trim() || null,
              isActive,
            } satisfies CompanyUpdatePayload),
          })
        : apiFetch('/platform/admin/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyName: name.trim(),
              companyCode: companyCode.trim(),
              adminMobile: adminMobile.trim(),
              adminPassword: adminPassword.trim(),
              ...(gst.trim() && { gst: gst.trim() }),
              ...(address.trim() && { companyAddress: address.trim() }),
              ...(adminName.trim() && { adminName: adminName.trim() }),
            } satisfies CompanyCreatePayload),
          }));

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorEnvelope | null;
        throw new Error(payload?.error?.message ?? 'Failed to save company');
      }

      await queryClient.invalidateQueries({ queryKey: companiesKeys.all });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this company. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !saving && !next && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Company' : 'Add Company'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">Company Name</Label>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Infinity Textiles" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-code">Company Id</Label>
            <Input id="company-code" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} placeholder="e.g. CMP-001" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
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

          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-status">Status</Label>
              <Select value={isActive ? 'Active' : 'Inactive'} onValueChange={(value) => setIsActive(value === 'Active')}>
                <SelectTrigger id="company-status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-gst">GST Number</Label>
            <Input id="company-gst" value={gst} onChange={(e) => setGst(e.target.value)} placeholder="e.g. 33AABCI2345C1Z5" />
          </div>
          {company && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-created">Created At</Label>
              <Input id="company-created" value={formatCompanyDate(company.createdAt)} disabled />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-mobile">Admin Mobile</Label>
            <Input id="company-mobile" value={adminMobile} onChange={(e) => setAdminMobile(e.target.value)} placeholder="e.g. 9876543210" />
          </div>
          {company && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-updated">Updated At</Label>
              <Input id="company-updated" value={formatCompanyDate(company.updatedAt)} disabled />
            </div>
          )}

          {!isEdit && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manager-name">Manager Name</Label>
                <Input id="manager-name" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Optional" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company-password">Temp Password</Label>
                <Input
                  id="company-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
            </>
          )}
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
