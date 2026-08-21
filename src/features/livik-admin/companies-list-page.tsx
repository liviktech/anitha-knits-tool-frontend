import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Eye, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanies } from './companies-store';
import { CompanyFormDialog } from './company-form-dialog';
import type { Company } from './mock-data';

/**
 * Companies list for the Livik Admin panel — table view with Add/Edit
 * actions and per-row navigation into the (static, mock-data-backed)
 * Company Details screen. No live API yet, matching the rest of this panel.
 */
export function CompaniesListPage() {
  const navigate = useNavigate();
  const { companies } = useCompanies();
  const [formState, setFormState] = useState<{ mode: 'add' | 'edit'; company: Company | null } | null>(null);

  return (
    <div className="p-6 xl:p-8 flex flex-col gap-5 max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
        <span>Dashboard</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-medium">Companies</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold text-[#1F2E27]">Companies</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage all companies registered in the system</p>
        </div>
        <Button
          className="bg-[#5D8B62] hover:bg-[#4d7a52] text-white gap-2 rounded-md px-4 h-9 text-[13px] font-semibold"
          onClick={() => setFormState({ mode: 'add', company: null })}
        >
          <Plus className="w-3.5 h-3.5" /> Add Company
        </Button>
      </div>

      <Card className="rounded-xl border border-[#E8E2D5] shadow-sm bg-white overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-[#E8E2D5]">
                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 pl-5">Company</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Company Code</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500">GST Number</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Admin Mobile</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Status</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Created At</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-400 text-sm">No companies found.</TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} className="border-b border-[#EFEBE0] last:border-b-0 hover:bg-[#FAF8F2] transition-colors">
                    <TableCell className="pl-5 py-3.5">
                      <button
                        type="button"
                        className="flex items-center gap-2.5 text-left font-semibold text-gray-900 hover:text-[#4C7A50] hover:underline"
                        onClick={() => navigate(`/livik-admin/companies/${company.id}`)}
                      >
                        <span className="w-8 h-8 rounded-full bg-[#EAF3E6] flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-[#4C7A50]" />
                        </span>
                        {company.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-gray-700 text-[13px]">{company.code}</TableCell>
                    <TableCell className="text-gray-700 text-[13px]">{company.gstNumber}</TableCell>
                    <TableCell className="text-gray-700 text-[13px]">{company.adminMobile}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                          company.status === 'Active' ? 'bg-[#EAF3E6] text-[#4C7A50]' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {company.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-[13px]">{company.createdAt}</TableCell>
                    <TableCell className="pr-5">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-gray-300 bg-white"
                          aria-label={`View ${company.name}`}
                          onClick={() => navigate(`/livik-admin/companies/${company.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-gray-300 bg-white"
                          aria-label={`Edit ${company.name}`}
                          onClick={() => setFormState({ mode: 'edit', company })}
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {formState && <CompanyFormDialog company={formState.company} onClose={() => setFormState(null)} />}
    </div>
  );
}
