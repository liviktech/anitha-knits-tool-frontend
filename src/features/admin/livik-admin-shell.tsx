import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import {
  Infinity as InfinityIcon,
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
} from 'lucide-react';
import { CompanyDetailsPage } from './company-details-page';
import { CompaniesListPage } from './companies-list-page';
import { useAuth } from '@/features/auth/auth-context';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/users', label: 'Users', icon: Users },
  // { to: '/admin/production-records', label: 'Production Records', icon: FileText },
  // { to: '/admin/wastage-records', label: 'Wastage Records', icon: ClipboardList },
  // { to: '/admin/approval-events', label: 'Approval Events', icon: CheckSquare },
  // { to: '/admin/inventories', label: 'Inventories', icon: Archive },
  // { to: '/admin/load-sents', label: 'Load Sents', icon: Truck },
  // { to: '/admin/reports', label: 'Reports', icon: BarChart2 },
  // { to: '/admin/settings', label: 'Settings', icon: Settings },
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
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin-login', { replace: true });
  }

  return (
    <div className="flex h-screen w-full bg-[#F4F1E8] font-['Hanken_Grotesk',sans-serif]">
      <aside className="hidden lg:flex w-60 shrink-0 bg-[#233327] flex-col">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
          <InfinityIcon className="w-7 h-7 text-[#9AC08A] shrink-0" strokeWidth={2} />
          <div className="leading-tight">
            <div className="text-white font-bold text-[20px] tracking-wide">LK SPACE</div>
            <div className="text-white/70 text-2xs tracking-[0.2em]"></div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-[14.5px] font-medium rounded-md transition-colors ${isActive ? 'bg-[#3A5240] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
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
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<Navigate to="companies" replace />} />
          <Route path="dashboard" element={<ComingSoon label="Dashboard" />} />
          <Route path="companies" element={<CompaniesListPage />} />
          <Route path="companies/:companyId" element={<CompanyDetailsPage />} />
          <Route path="users" element={<ComingSoon label="Users" />} />
          {/* <Route path="brands" element={<ComingSoon label="Brands" />} />
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
          <Route path="settings" element={<ComingSoon label="Settings" />} /> */}
        </Routes>
      </main>
    </div>
  );
}
