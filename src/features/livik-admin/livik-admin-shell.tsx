import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import {
  Infinity as InfinityIcon,
  LayoutDashboard,
  Building2,
  Users,
  Tag,
  FlaskConical,
  Palette,
  Ruler,
  BarChart3,
  Trash2,
  SlidersHorizontal,
  FileText,
  ClipboardList,
  CheckSquare,
  Archive,
  Truck,
  BarChart2,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { CompanyDetailsPage } from './company-details-page';
import { CompaniesListPage } from './companies-list-page';
import { CompaniesProvider } from './companies-context';

const navItems = [
  { to: '/livik-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/livik-admin/companies', label: 'Companies', icon: Building2 },
  { to: '/livik-admin/users', label: 'Users', icon: Users },
  { to: '/livik-admin/brands', label: 'Brands', icon: Tag },
  { to: '/livik-admin/chemicals', label: 'Chemicals', icon: FlaskConical },
  { to: '/livik-admin/colors', label: 'Colors', icon: Palette },
  { to: '/livik-admin/sizes', label: 'Sizes', icon: Ruler },
  { to: '/livik-admin/color-standards', label: 'Color Standards', icon: BarChart3 },
  { to: '/livik-admin/wastage-types', label: 'Wastage Types', icon: Trash2 },
  { to: '/livik-admin/production-settings', label: 'Production Settings', icon: SlidersHorizontal },
  { to: '/livik-admin/production-records', label: 'Production Records', icon: FileText },
  { to: '/livik-admin/wastage-records', label: 'Wastage Records', icon: ClipboardList },
  { to: '/livik-admin/approval-events', label: 'Approval Events', icon: CheckSquare },
  { to: '/livik-admin/inventories', label: 'Inventories', icon: Archive },
  { to: '/livik-admin/load-sents', label: 'Load Sents', icon: Truck },
  { to: '/livik-admin/reports', label: 'Reports', icon: BarChart2 },
  { to: '/livik-admin/settings', label: 'Settings', icon: Settings },
];

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <h2 className="text-2xl font-semibold text-gray-400">{label} — coming soon</h2>
    </div>
  );
}

/**
 * Entirely separate admin shell (own sidebar, own branding) for the
 * super-admin "Livik Admin" panel — deliberately not nested inside the main
 * AppShell/tool navigation so it can't be affected by (or affect) the
 * production tool's routes and layout.
 */
export function LivikAdminShell() {
  return (
    <div className="flex h-screen w-full bg-[#F4F1E8] font-['Hanken_Grotesk',sans-serif]">
      <aside className="hidden lg:flex w-60 shrink-0 bg-[#233327] flex-col">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <InfinityIcon className="w-7 h-7 text-[#9AC08A] shrink-0" strokeWidth={2} />
          <div className="leading-tight">
            <div className="text-white font-bold text-[15px] tracking-wide">INFINITY</div>
            <div className="text-white/70 text-2xs tracking-[0.2em]">TEXTILES</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-md transition-colors ${
                    isActive ? 'bg-[#3A5240] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-white text-[13px] font-semibold leading-tight">System Admin</div>
            <div className="text-white/50 text-[11px]">Super Admin</div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40" />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <CompaniesProvider>
        <Routes>
          <Route index element={<Navigate to="companies" replace />} />
          <Route path="dashboard" element={<ComingSoon label="Dashboard" />} />
          <Route path="companies" element={<CompaniesListPage />} />
          <Route path="companies/:companyId" element={<CompanyDetailsPage />} />
          <Route path="users" element={<ComingSoon label="Users" />} />
          <Route path="brands" element={<ComingSoon label="Brands" />} />
          <Route path="chemicals" element={<ComingSoon label="Chemicals" />} />
          <Route path="colors" element={<ComingSoon label="Colors" />} />
          <Route path="sizes" element={<ComingSoon label="Sizes" />} />
          <Route path="color-standards" element={<ComingSoon label="Color Standards" />} />
          <Route path="wastage-types" element={<ComingSoon label="Wastage Types" />} />
          <Route path="production-settings" element={<ComingSoon label="Production Settings" />} />
          <Route path="production-records" element={<ComingSoon label="Production Records" />} />
          <Route path="wastage-records" element={<ComingSoon label="Wastage Records" />} />
          <Route path="approval-events" element={<ComingSoon label="Approval Events" />} />
          <Route path="inventories" element={<ComingSoon label="Inventories" />} />
          <Route path="load-sents" element={<ComingSoon label="Load Sents" />} />
          <Route path="reports" element={<ComingSoon label="Reports" />} />
          <Route path="settings" element={<ComingSoon label="Settings" />} />
        </Routes>
        </CompaniesProvider>
      </main>
    </div>
  );
}
