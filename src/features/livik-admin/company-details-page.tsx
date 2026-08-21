import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Pencil,
  MoreVertical,
  Eye,
  EyeOff,
  FileText,
  ShieldCheck,
  Users,
  Tag,
  FlaskConical,
  Palette,
  Ruler,
  BarChart3,
  Trash2,
  SlidersHorizontal,
  ClipboardList,
  Archive,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCompanies } from './companies-store';
import { CompanyFormDialog } from './company-form-dialog';

const masterData = [
  { label: 'Users', sub: 'Active users', count: 12, icon: Users, color: '#2F6FB0', bg: '#E7F0FA' },
  { label: 'Brands', sub: 'Total brands', count: 8, icon: Tag, color: '#B0722F', bg: '#FAF0E7' },
  { label: 'Chemicals', sub: 'Total chemicals', count: 34, icon: FlaskConical, color: '#7A4FB0', bg: '#F1E9FA' },
  { label: 'Colors', sub: 'Total colors', count: 52, icon: Palette, color: '#B0417A', bg: '#FAE7F1' },
  { label: 'Sizes', sub: 'Total sizes', count: 18, icon: Ruler, color: '#1E8F8A', bg: '#E4F5F4' },
  { label: 'Color Standards', sub: 'Standards set', count: 26, icon: BarChart3, color: '#3F58B0', bg: '#E9ECFA' },
  { label: 'Wastage Types', sub: 'Total types', count: 14, icon: Trash2, color: '#C0453E', bg: '#FBE9E8' },
  { label: 'Production Settings', sub: 'Configuration set', count: 1, icon: SlidersHorizontal, color: '#4C7A50', bg: '#EAF3E6' },
];

const quickSummary = [
  { label: 'Users', count: 12, icon: Users },
  { label: 'Brands', count: 8, icon: Tag },
  { label: 'Chemicals', count: 34, icon: FlaskConical },
  { label: 'Colors', count: 52, icon: Palette },
  { label: 'Sizes', count: 18, icon: Ruler },
  { label: 'Production Records', count: 156, icon: FileText },
  { label: 'Wastage Records', count: 87, icon: ClipboardList },
  { label: 'Inventories', count: 24, icon: Archive },
  { label: 'Load Sents', count: 16, icon: Truck },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500 mb-1">{label}</p>
      <div className="text-[14px] font-semibold text-gray-900">{children}</div>
    </div>
  );
}

/**
 * Standalone super-admin "Company Details" screen for the Livik Admin panel
 * — a static mockup matching the provided design exactly (no live API here
 * yet), rendered under its own /livik-admin shell.
 */
export function CompanyDetailsPage() {
  const { companyId } = useParams();
  const { companies } = useCompanies();
  const [showPasswordHash, setShowPasswordHash] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const company = companies.find((c) => c.id === companyId) ?? companies[0];
  const recentActivity = [
    { title: 'Company information updated', meta: `${company.updatedAt} by System Admin` },
    { title: 'Company created', meta: `${company.createdAt} by System Admin` },
  ];

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
        <Link to="/livik-admin/dashboard" className="hover:text-gray-700 hover:underline">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/livik-admin/companies" className="hover:text-gray-700 hover:underline">Companies</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-medium">Company Details</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <h1 className="text-[26px] font-bold text-[#1F2E27]">Company Details</h1>
          <p className="text-[13px] text-gray-500 mt-1">View and manage company information and settings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-[#5D8B62] hover:bg-[#4d7a52] text-white gap-2 rounded-md px-4 h-9 text-[13px] font-semibold"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Company
          </Button>
          <Button variant="outline" size="icon" className="border-gray-300 h-9 w-9 bg-white">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </Button>
        </div>
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
                <Field label="Company Code">{company.code}</Field>
                <Field label="GST Number">{company.gstNumber}</Field>
                <Field label="Admin Mobile">{company.adminMobile}</Field>
                <Field label="Admin Password Hash">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] tracking-wider">
                      {showPasswordHash ? company.adminPasswordHash : '•'.repeat(14)}
                    </span>
                    <button
                      type="button"
                      aria-label={showPasswordHash ? 'Hide admin password hash' : 'Show admin password hash'}
                      onClick={() => setShowPasswordHash((v) => !v)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showPasswordHash ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>

              <div className="flex flex-col gap-5">
                <Field label="Address">
                  <span className="font-semibold whitespace-pre-line leading-snug">{company.address}</span>
                </Field>
                <Field label="Status">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      company.status === 'Active' ? 'bg-[#EAF3E6] text-[#4C7A50]' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {company.status}
                  </span>
                </Field>
                <Field label="Created At">{company.createdAt}</Field>
                <Field label="Updated At">{company.updatedAt}</Field>
              </div>
            </div>
          </Card>

          <div>
            <h3 className="font-bold text-gray-900 text-[15px] mb-3">Related Master Data</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {masterData.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.label} className="rounded-xl border border-[#E8E2D5] shadow-sm bg-white p-4 flex flex-row items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[20px] font-extrabold text-gray-900 leading-none">{item.count}</p>
                      <p className="text-[13px] font-semibold text-gray-700 truncate">{item.label}</p>
                      <p className="text-[11px] text-gray-400 truncate">{item.sub}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5 min-w-0">
          <Card className="rounded-xl border border-[#E8E2D5] shadow-sm bg-white p-5 flex flex-col items-center text-center gap-2">
            <h2 className="font-bold text-gray-900 text-[15px] self-start mb-1">Company Status</h2>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center my-1 ${company.status === 'Active' ? 'bg-[#EAF3E6]' : 'bg-gray-100'}`}>
              <ShieldCheck className={`w-8 h-8 ${company.status === 'Active' ? 'text-[#4C7A50]' : 'text-gray-400'}`} />
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[12px] font-semibold ${
                company.status === 'Active' ? 'bg-[#EAF3E6] text-[#4C7A50]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {company.status}
            </span>
            <p className="text-[12px] text-gray-500 mt-1">
              {company.status === 'Active'
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

          <Card className="rounded-xl border border-[#E8E2D5] shadow-sm bg-white p-5">
            <h2 className="font-bold text-gray-900 text-[15px] mb-3">Recent Activity</h2>
            <div className="flex flex-col gap-4">
              {recentActivity.map((entry) => (
                <div key={entry.title} className="flex gap-2.5">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-[#4C7A50] shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900 leading-tight">{entry.title}</p>
                    <p className="text-[11.5px] text-gray-400 mt-0.5">{entry.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {editOpen && <CompanyFormDialog company={company} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
