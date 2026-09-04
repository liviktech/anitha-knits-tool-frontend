import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import {
  Infinity as InfinityIcon,
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  CheckSquare,
} from 'lucide-react';
import { CompanyDetailsPage } from './company-details-page';
import { CompaniesListPage } from './companies-list-page';
import { UsersListPage } from './users-list-page';
import { PlatformRolesTab } from './platform-roles-tab';
import { useAuth } from '@/features/auth/auth-context';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, moduleCode: 'dashboard' },
  { to: '/admin/companies', label: 'Companies', icon: Building2, moduleCode: 'companies' },
  { to: '/admin/users', label: 'Users', icon: Users, moduleCode: 'users' },
  { to: '/admin/roles', label: 'Roles and Rights', icon: CheckSquare, moduleCode: 'roles' },
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const access = user?.kind === 'platform-admin' ? user.access : null;
  const visibleNavItems = access ? navItems.filter((item) => access.moduleCodes.includes(item.moduleCode)) : navItems;

  function handleLogout() {
    logout();
    navigate('/admin-login', { replace: true });
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#F4F1E8] font-['Hanken_Grotesk',sans-serif]">
      {/* Top Navigation - Finnova Style */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#F4F1E8] shrink-0">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <InfinityIcon className="w-8 h-8 text-[#4F46E5]" strokeWidth={2.5} />
          <div className="leading-tight">
            <div className="text-gray-900 font-extrabold text-[19px] tracking-wide">LK SPACE</div>
            <div className="text-gray-500 text-[9px] tracking-[0.1em] font-semibold uppercase">Smart Production</div>
          </div>
        </div>

        {/* Center: Pill Nav */}
        <nav className="hidden lg:flex items-center p-1.5 bg-[#1c1c24] rounded-full gap-1 shadow-sm">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-5 py-2 text-[13.5px] font-semibold rounded-full transition-all ${
                    isActive ? 'bg-[#4F46E5] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-gray-900 text-[13px] font-bold leading-tight">
                {user?.kind === 'platform-admin' ? user.name : 'System Admin'}
              </div>
              <div className="text-gray-500 text-[11px] font-medium">
                {user?.kind === 'platform-admin'
                  ? (user.role === 'SUPER_ADMIN' ? 'Super Admin' : (user.access?.roleName ?? 'Employee'))
                  : 'Super Admin'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-500" />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-1 border border-gray-200 bg-white shadow-sm"
            >
              <LogOut className="w-4.5 h-4.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<Navigate to="companies" replace />} />
          <Route path="dashboard" element={<ComingSoon label="Dashboard" />} />
          <Route path="companies" element={<CompaniesListPage />} />
          <Route path="companies/:companyId" element={<CompanyDetailsPage />} />
          <Route path="users" element={<UsersListPage />} />
          <Route path="roles" element={<PlatformRolesTab />} />
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
