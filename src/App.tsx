import { useState, type ReactNode } from 'react';
import '@fontsource-variable/inter';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage } from './features/auth/login-page';
import { useAuth, defaultRouteFor } from './features/auth/auth-context';
import type { AuthUser, CompanyUserRole } from './features/auth/auth-service';
import { Settings, User, Wallet, Menu, Package, LineChart, LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DashboardModule } from './features/dashboard/dashboard-module';
import { ProductionDetails } from './features/production/production-details';
import { InventoryPage } from './features/inventory/inventory-page';
import { LivikAdminShell } from './features/admin/livik-admin-shell';
import { EmpExpensesPage } from './features/emp-expenses/emp-expenses-page';
import { EmployeePage } from './features/employee/employee-page';
import threadIcon from '@/assets/thread.png';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/production', label: 'Production details', icon: LineChart },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/employees', label: 'Employees', icon: User },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
];

function getNavItems(role?: CompanyUserRole) {
  if (role === 'SUPERVISOR') {
    return navItems.filter(item => item.to === '/dashboard');
  }

  return navItems;
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


function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.kind === 'company-user' ? user.role : undefined;
  const currentNavItems = getNavItems(role);

  return (
    <nav className="flex-1 px-2 py-4 space-y-1 font-['Inter',sans-serif]">
      {currentNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-3 text-[13px] font-medium rounded-lg transition-colors ${isActive ? 'text-white font-semibold bg-white/10' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className={`w-5 h-5 shrink-0 ${location.pathname.startsWith(item.to) ? 'text-white' : 'text-white/70'}`} strokeWidth={1.75} />
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
    <div className="flex items-center gap-3 px-1">
      <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm shrink-0">
        {displayName.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[13.5px] font-bold text-white leading-tight truncate">{displayName}</span>
        <span className="text-[11px] font-medium text-white/60 truncate">{roleLabel}</span>
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
  );
}

function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col bg-[#004D40] font-['Hanken_Grotesk',sans-serif] lg:flex-row lg:p-1 lg:gap-2">
      {/* Laptop: persistent sidebar */}
      <aside className="hidden lg:flex w-58 shrink-0 flex-col overflow-y-auto">
        <Link to="/dashboard" className="flex items-center justify-center gap-2 py-6 px-4 cursor-pointer">
          <img src={threadIcon} alt="" className="h-6 w-6 shrink-0 object-contain brightness-0 invert" />
          <span className="text-[20px] font-serif font-bold text-white tracking-widest uppercase whitespace-nowrap">ANITHA KNITS</span>
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
          <span className="text-[18px] font-serif font-bold text-white tracking-widest uppercase whitespace-nowrap">ANITHA KNITS</span>
        </Link>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white" onClick={() => setMobileNavOpen(true)}>
            <Menu className="w-5 h-5 text-white" />
          </Button>
          <SheetContent side="left" className="w-64 bg-[#004D40] border-r-0 p-0 flex flex-col">
            <SheetHeader className="py-6 px-4">
              <SheetTitle className="flex items-center justify-center gap-2">
                <img src={threadIcon} alt="" className="h-6 w-6 shrink-0 object-contain brightness-0 invert" />
                <span className="text-[20px] font-serif font-bold text-white tracking-widest uppercase whitespace-nowrap">ANITHA KNITS</span>
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
          <Route path="/dashboard/*" element={<DashboardModule />} />
          <Route path="/production/*" element={<ProductionDetails />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/employees/*" element={<EmployeePage />} />
          <Route path="/expenses/*" element={<EmpExpensesPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
