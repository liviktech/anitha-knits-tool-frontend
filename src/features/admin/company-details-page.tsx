import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Users,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/shared/loader';
import { useCompany, useCompanyUsers, formatCompanyDate } from './companies-queries';
import { CompanyFormDialog } from './company-form-dialog';


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500 mb-1">{label}</p>
      <div className="text-[14px] font-semibold text-gray-900">{children}</div>
    </div>
  );
}

/**
 * Standalone super-admin "Company Details" screen for the Livik Admin panel,
 * backed by GET /api/v1/platform/admin/companies/{id}. The Related Master
 * Data / Quick Summary tiles stay placeholder counts — those modules
 * (Users, Brands, ...) don't have their own APIs yet.
 */
export function CompanyDetailsPage() {
  const { companyId } = useParams();
  const { data, isLoading, isError } = useCompany(companyId);
  const { data: usersData, isLoading: usersLoading } = useCompanyUsers(companyId);
  const [editOpen, setEditOpen] = useState(false);
  const company = data?.data;
  const users = usersData?.data ?? [];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size="xl" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-gray-500 text-sm">Unable to load this company.</p>
        <Link to="/admin/companies" className="text-[#4C7A50] text-sm font-semibold hover:underline">
          Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="relative p-6 xl:p-8 flex flex-col gap-5 max-w-[1400px]">
      {/* Decorative corner accent (stand-in for the photographic motif in the design) */}
      <svg
        aria-hidden
        className="pointer-events-none absolute right-4 top-2 w-40 h-40 opacity-40 hidden md:block"
        viewBox="0 0 160 160"
        fill="none"
      >
        <path d="M140 10 C 110 30, 90 60, 80 100 C 95 80, 115 65, 140 55" stroke="#8FAE84" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="118" cy="34" rx="16" ry="9" fill="#A9C79C" transform="rotate(-35 118 34)" />
        <ellipse cx="98" cy="58" rx="16" ry="9" fill="#9AC08A" transform="rotate(-25 98 58)" />
        <ellipse cx="128" cy="60" rx="14" ry="8" fill="#B9D2AC" transform="rotate(15 128 60)" />
        <ellipse cx="84" cy="90" rx="15" ry="8" fill="#A9C79C" transform="rotate(-10 84 90)" />
      </svg>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
        <Link to="/admin/dashboard" className="hover:text-gray-700 hover:underline">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/admin/companies" className="hover:text-gray-700 hover:underline">Companies</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-medium">Company Details</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <h1 className="text-[26px] font-bold text-[#1F2E27]">Company Details</h1>
          <p className="text-[13px] text-gray-500 mt-1">View and manage company information and settings</p>
        </div>
        {/* <div className="flex items-center gap-2">
          <Button
            className="bg-[#5D8B62] hover:bg-[#4d7a52] text-white gap-2 rounded-md px-4 h-9 text-[13px] font-semibold"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Company
          </Button>
          <Button variant="outline" size="icon" className="border-gray-300 h-9 w-9 bg-white">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </Button>
        </div> */}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5 min-w-0">
          <Card className="rounded-xl border border-[#E8E2D5] shadow-sm bg-white p-5 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-[18px] h-[18px] text-gray-700" />
              <h2 className="font-bold text-gray-900 text-[15px]">Company Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div className="flex flex-col gap-5">
                <Field label="Company Name">{company.name}</Field>
                <Field label="Company Id">{company.companyCode}</Field>
                <Field label="GST Number">{company.gst ?? '—'}</Field>
                <Field label="Admin Mobile">{company.adminMobile}</Field>
              </div>

              <div className="flex flex-col gap-5">
                <Field label="Address">
                  <span className="font-semibold whitespace-pre-line leading-snug">{company.address ?? '—'}</span>
                </Field>
                <Field label="Status">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      company.isActive ? 'bg-[#EAF3E6] text-[#4C7A50]' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {company.isActive ? 'Active' : 'Inactive'}
                  </span>
                </Field>
                <Field label="Created At">{formatCompanyDate(company.createdAt)}</Field>
                <Field label="Updated At">{formatCompanyDate(company.updatedAt)}</Field>
              </div>
            </div>
          </Card>


          <Card className="rounded-xl border border-[#E8E2D5] shadow-sm bg-white overflow-hidden p-0 mt-5">
            <div className="border-b border-[#E8E2D5] p-5">
              <h2 className="font-bold text-gray-900 text-[15px]">Company Users</h2>
              <p className="text-[13px] text-gray-500 mt-1">Users associated with this company</p>
            </div>
            
            <div className="p-5">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader size="sm" />
                  <span className="ml-2 text-sm text-gray-500">Loading users...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No users found for this company.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-[#E8E2D5] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F4F1E8] flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-[14px]">{user.name || 'Unnamed User'}</p>
                          <p className="text-[12px] text-gray-500">{user.mobile}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {user.role}
                        </span>
                        <span className={`text-[11px] font-medium ${user.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column */}
        {/* <div className="flex flex-col gap-5 min-w-0">
          <Card className="rounded-xl border border-[#E8E2D5] shadow-sm bg-white p-5 flex flex-col items-center text-center gap-2">
            <h2 className="font-bold text-gray-900 text-[15px] self-start mb-1">Company Status</h2>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center my-1 ${company.isActive ? 'bg-[#EAF3E6]' : 'bg-gray-100'}`}>
              <ShieldCheck className={`w-8 h-8 ${company.isActive ? 'text-[#4C7A50]' : 'text-gray-400'}`} />
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[12px] font-semibold ${
                company.isActive ? 'bg-[#EAF3E6] text-[#4C7A50]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {company.isActive ? 'Active' : 'Inactive'}
            </span>
            <p className="text-[12px] text-gray-500 mt-1">
              {company.isActive
                ? 'Company is active and available in the system.'
                : 'Company is inactive and currently unavailable in the system.'}
            </p>
          </Card>

          <Card className="rounded-xl border border-[#E8E2D5] shadow-sm bg-white p-5">
            <h2 className="font-bold text-gray-900 text-[15px] mb-3">Quick Summary</h2>
            <div className="flex flex-col divide-y divide-gray-100">
              {quickSummary.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5 text-gray-700">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-[13px] font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-gray-900">{item.count}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div> */}
      </div>

      {editOpen && <CompanyFormDialog company={company} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
