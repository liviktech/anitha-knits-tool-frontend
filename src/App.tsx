import { useState, lazy, Suspense, type ReactNode } from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/hanken-grotesk';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage } from './features/auth/login-page';
import { useAuth, defaultRouteFor } from './features/auth/auth-context';
import type { AuthUser, CompanyUserProfile } from './features/auth/auth-service';
import { hasModuleAccess } from '@/lib/access';
import { Settings, User, Wallet, Menu, Package, LineChart, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader } from '@/components/shared/loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import threadIcon from '@/assets/thread.png';

// Route-level code splitting — each feature module becomes its own chunk,
// fetched on demand instead of bloating the single main bundle.
const DashboardModule = lazy(() => import('./features/dashboard/dashboard-module').then((m) => ({ default: m.DashboardModule })));
const ProductionDetails = lazy(() => import('./features/production/production-details').then((m) => ({ default: m.ProductionDetails })));
const InventoryPage = lazy(() => import('./features/inventory/inventory-page').then((m) => ({ default: m.InventoryPage })));
const LivikAdminShell = lazy(() => import('./features/admin/livik-admin-shell').then((m) => ({ default: m.LivikAdminShell })));
const EmpExpensesPage = lazy(() => import('./features/emp-expenses/emp-expenses-page').then((m) => ({ default: m.EmpExpensesPage })));
const EmployeePage = lazy(() => import('./features/employee/employee-page').then((m) => ({ default: m.EmployeePage })));
const AdminPanelPage = lazy(() => import('./features/admin-panel/admin-panel-page').then((m) => ({ default: m.AdminPanelPage })));

function PageLoader() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <Loader size="xl" className="text-[#004D40]" />
    </div>
  );
}

// moduleCode matches the seeded Module.moduleCode values (see defaultAccessCatalog.ts on the
// backend) — this is how a nav item is matched against a user's resolved RoleAccess grants.
const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, moduleCode: 'dashboard' },
  { to: '/production', label: 'Production Details', icon: LineChart, moduleCode: 'productiondetails' },
  { to: '/inventory', label: 'Inventory', icon: Package, moduleCode: 'inventory' },
  { to: '/employees', label: 'Employees', icon: User, moduleCode: 'employees' },
  { to: '/expenses', label: 'Expenses', icon: Wallet, moduleCode: 'expenses' },
  { to: '/admin-panel', label: 'Admin Panel', icon: Settings, moduleCode: 'admin_panel' },
];

function getNavItems(user: CompanyUserProfile | undefined) {
  if (!user) return [];
  if (!user.access) {
    // No RoleAccess assigned yet — fall back to the legacy SUPERVISOR default so existing
    // behavior doesn't change until an admin actively assigns this role rights.
    if (user.role === 'SUPERVISOR') return navItems.filter((item) => item.moduleCode === 'dashboard');
    return navItems;
  }
  return navItems.filter((item) => user.access!.moduleCodes.includes(item.moduleCode));
}

/** First nav item `user` actually has access to, or null if none (used as a safe redirect target). */
function firstAccessiblePath(user: AuthUser | null): string | null {
  if (!user || user.kind !== 'company-user') return null;
  const allowed = getNavItems(user);
  return allowed[0]?.to ?? null;
}

function RequireRole({ kind, children }: { kind: AuthUser['kind']; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user.kind !== kind) {
    return <Navigate to={defaultRouteFor(user)} replace />;
  }
  return <>{children}</>;
}

/** Route-level enforcement mirroring the nav's own filtering — blocks typing a hidden module's URL directly. */
function RequireModule({ moduleCode, children }: { moduleCode: string; children: ReactNode }) {
  const { user } = useAuth();

  if (hasModuleAccess(user, moduleCode)) return <>{children}</>;

  const fallback = firstAccessiblePath(user);
  if (fallback) return <Navigate to={fallback} replace />;

  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500">
      You don&apos;t have access to any module yet. Contact your admin to request access.
    </div>
  );
}


function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const currentNavItems = getNavItems(user?.kind === 'company-user' ? user : undefined);

  return (
    <nav className="flex-1 px-2 py-4 space-y-1 font-inter">
      {currentNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-1 py-3 text-[13.5px] font-semibold rounded-lg transition-colors ${isActive ? 'text-white font-semibold bg-white/10' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className={`w-[20px] h-[20px] shrink-0 ${location.pathname.startsWith(item.to) ? 'text-white' : 'text-white/70'}`} strokeWidth={1.75} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function UserFooter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = user.kind === 'company-user' ? (user.name ?? user.mobile) : user.name;
  const roleLabel = user.kind === 'company-user' ? user.role : 'Super Admin';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex items-center gap-3 border-t border-[#F4F1E8] pt-3">
      <div className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center font-inter font-bold text-sm shrink-0">
        {displayName.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[13.5px] font-inter font-bold text-[#F4F1E8] leading-tight truncate">{displayName}</span>
        <span className="text-[12px] font-inter font-medium text-white/60 truncate">{roleLabel}</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="pr-1 text-[#F4F1E8] hover:text-red-600 hover:bg-white/70 rounded-sm px-1 py-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-4.5 h-5" strokeWidth={1.25} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Log out</TooltipContent>
      </Tooltip>
    </div>
  );
}

function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col bg-[#004D40] font-['Hanken_Grotesk',sans-serif] lg:flex-row lg:p-1 lg:gap-2">
      {/* Laptop: persistent sidebar */}
      <aside className="hidden lg:flex w-50 shrink-0 flex-col overflow-y-auto">
        <Link to="/dashboard" className="flex items-center justify-center gap-2 py-4.5 px-4 cursor-pointer border-b border-[#F4F1E8]">
          <img src={threadIcon} alt="" className="h-8 w-8 shrink-0 object-contain brightness-0 invert" />
          <span className="text-xl font-inter font-bold text-white tracking-widest whitespace-nowrap">LK KNITS</span>
        </Link>
        <NavLinks />
        <div className="p-2">
          <UserFooter />
        </div>
      </aside>

      {/* Tablet + mobile: top bar with hamburger trigger */}
      <header className="flex items-center justify-between border-b bg-[#004D40] px-4 py-3 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
          <img src={threadIcon} alt="" className="h-5 w-5 shrink-0 object-contain brightness-0 invert" />
          <span className="text-[18px] font-['Hanken_Grotesk',sans-serif] font-bold text-white tracking-widest whitespace-nowrap">LK Knits</span>
        </Link>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white" onClick={() => setMobileNavOpen(true)}>
            <Menu className="w-5 h-5 text-white" />
          </Button>
          <SheetContent side="left" className="w-64 bg-[#004D40] border-r-0 p-0 flex flex-col">
            <SheetHeader className="py-6 px-4">
              <SheetTitle className="flex items-center justify-center gap-2">
                <img src={threadIcon} alt="" className="h-6 w-6 shrink-0 object-contain brightness-0 invert" />
                <span className="text-[20px] font-['Hanken_Grotesk',sans-serif] font-bold text-white tracking-widest whitespace-nowrap">LK Knits</span>
              </SheetTitle>
            </SheetHeader>
            <NavLinks onNavigate={() => setMobileNavOpen(false)} />
            <div className="p-4 mt-auto">
              <button className="w-full flex items-center gap-3 px-3 py-3 text-[13px] font-medium text-white/70 hover:bg-white/5 hover:text-white rounded-lg transition-colors mb-6">
                <Settings className="w-5 h-5 shrink-0 text-white/70" strokeWidth={1.75} />
                Settings
              </button>
              <div className="text-[10px] font-bold tracking-widest text-white/50 mb-3 px-3">USER ACCOUNT</div>
              <div className="px-3 pb-2">
                <UserFooter />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-white rounded-t-[24px] lg:rounded-[32px] shadow-xl relative z-10">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/*" element={<RequireModule moduleCode="dashboard"><DashboardModule /></RequireModule>} />
          <Route path="/production/*" element={<RequireModule moduleCode="productiondetails"><ProductionDetails /></RequireModule>} />
          <Route path="/inventory" element={<RequireModule moduleCode="inventory"><InventoryPage /></RequireModule>} />
          <Route path="/employees/*" element={<RequireModule moduleCode="employees"><EmployeePage /></RequireModule>} />
          <Route path="/expenses/*" element={<RequireModule moduleCode="expenses"><EmpExpensesPage /></RequireModule>} />
          <Route path="/admin-panel" element={<RequireModule moduleCode="admin_panel"><AdminPanelPage /></RequireModule>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Separate super-admin panel — its own shell/nav, deliberately not nested under AppShell.
              Super admin's job here is onboarding companies, so this is their default landing spot. */}
          <Route
            path="/admin/*"
            element={
              <RequireRole kind="platform-admin">
                <LivikAdminShell />
              </RequireRole>
            }
          />
          <Route
            path="/*"
            element={
              <RequireRole kind="company-user">
                <AppShell />
              </RequireRole>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
