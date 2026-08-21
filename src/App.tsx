import { useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage } from './features/auth/login-page';
import { defaultRouteFor, useAuth } from './features/auth/auth-context';
import { Settings, User, Wallet, Menu, Package, ChevronDown, LineChart, LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DashboardModule } from './features/dashboard/dashboard-module';
import { ProductionDetails } from './features/production/production-details';
import { InventoryPage } from './features/inventory/inventory-page';
import { LivikAdminShell } from './features/livik-admin/livik-admin-shell';
import logo from '@/assets/anitha-knits-logo.png';

/** Blocks unauthenticated access; sends anyone logged in under the wrong role to their own home instead of showing a 404-ish empty shell. */
function RequireRole({ kind, children }: { kind: 'platform-admin' | 'company-user'; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.kind !== kind) return <Navigate to={defaultRouteFor(user)} replace />;
  return <>{children}</>;
}

function getNavItems(role?: string) {
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      to: '/production',
      label: 'Production details',
      icon: LineChart,
      children: [
        { to: '/production/design-2', label: 'Production Design 2' },
      ],
    },
    { to: '/inventory', label: 'Inventory', icon: Package },
    { to: '/employees', label: 'Employees', icon: User },
    { to: '/expenses', label: 'Expenses', icon: Wallet },
  ];

  if (role === 'SUPERVISOR') {
    return items.filter(item => item.to === '/dashboard');
  }
  
  return items;
}
function ComingSoon() {
  return (
    <div className="h-full flex items-center justify-center">
      <h2 className="text-2xl font-semibold text-gray-400">upcoming message</h2>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.kind === 'company-user' ? user.role : undefined;
  const currentNavItems = getNavItems(role);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      currentNavItems
        .filter((item) => item.children)
        .map((item) => [item.to, item.children!.some((child) => location.pathname.startsWith(child.to))]),
    ),
  );

  return (
    <nav className="flex-1 px-3 py-2 space-y-1">
      {currentNavItems.map((item) => {
        const Icon = item.icon;
        const isGroupActive = location.pathname.startsWith(item.to);
        const isOpen = openGroups[item.to] ?? false;

        if (item.children) {
          return (
            <Collapsible key={item.to} open={isOpen} onOpenChange={(next) => setOpenGroups((g) => ({ ...g, [item.to]: next }))}>
              <div
                className={`w-full flex items-center text-[13px] font-medium transition-colors rounded-lg ${isGroupActive ? 'text-[#004D40] font-semibold bg-[#eaf5de]' : 'text-[#1F3B33] hover:bg-[#F4F8F5]'
                  }`}
              >
                <NavLink
                  to={item.to}
                  onClick={() => {
                    setOpenGroups((g) => ({ ...g, [item.to]: true }));
                    onNavigate?.();
                  }}
                  className="flex-1 flex items-center gap-3 px-3 py-3"
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isGroupActive ? 'text-[#004D40]' : 'text-[#1F3B33]'}`} strokeWidth={1.75} />
                  {item.label}
                </NavLink>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Toggle ${item.label} sub-menu`}
                    className="p-2.5 pr-3"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isGroupActive ? 'text-[#004D40]' : 'text-gray-400'} ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-1 pl-11 pt-1">
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `block px-3 py-2 text-[12px] rounded-md transition-colors ${isActive
                        ? 'text-[#004D40] font-bold bg-[#eaf5de]'
                        : 'text-gray-500 hover:bg-[#F4F8F5] hover:text-gray-900 font-medium'
                      }`
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-3 text-[13px] font-medium rounded-lg transition-colors ${isActive ? 'text-[#004D40] font-semibold bg-[#eaf5de]' : 'text-[#1F3B33] hover:bg-[#F4F8F5]'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
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
    <div className="pt-4 border-t border-gray-100 flex items-center gap-3 px-3">
      <div className="w-9 h-9 rounded-full bg-[#004D40] text-white flex items-center justify-center font-bold text-sm">
        {displayName.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[13.5px] font-bold text-gray-900 leading-tight truncate">{displayName}</span>
        <span className="text-[11px] font-medium text-gray-500">{roleLabel}</span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        aria-label="Log out"
        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-[#F4F8F5] rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col bg-white lg:flex-row font-['Hanken_Grotesk',sans-serif]">
        {/* Laptop: persistent sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-gray-100 bg-white flex-col">
          <Link to="/dashboard" className="flex items-center justify-center py-5 px-4 bg-[#004D40] cursor-pointer">
            <span className="text-[20px] font-serif font-bold text-white tracking-widest uppercase">ANITHA KNITS</span>
          </Link>
          <NavLinks />
          <div className="p-4 mt-auto">
            <button className="w-full flex items-center gap-3 px-3 py-3 text-[13px] font-medium text-[#1F3B33] hover:bg-[#F4F8F5] rounded-lg transition-colors mb-2">
              <Settings className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              Settings
            </button>
            <UserFooter />
          </div>
        </aside>

        {/* Tablet + mobile: top bar with hamburger trigger */}
        <header className="flex items-center justify-between border-b bg-[#004D40] px-4 py-3 lg:hidden">
          <Link to="/dashboard" className="flex items-center cursor-pointer">
            <span className="text-[18px] font-serif font-bold text-white tracking-widest uppercase">ANITHA KNITS</span>
          </Link>
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white" onClick={() => setMobileNavOpen(true)}>
              <Menu className="w-5 h-5 text-white" />
            </Button>
            <SheetContent side="left" className="w-60 bg-white p-0">
              <SheetHeader className="py-3 px-4 border-b border-gray-100">
                <SheetTitle className="flex items-center">
                  <img src={logo} alt="Anitha Knits" className="w-full h-auto object-contain" />
                </SheetTitle>
              </SheetHeader>
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
              <div className="p-4 mt-auto">
                <button className="w-full flex items-center gap-3 px-3 py-3 text-[13px] font-medium text-[#1F3B33] hover:bg-[#F4F8F5] rounded-lg transition-colors mb-2">
                  <Settings className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                  Settings
                </button>
                <UserFooter />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-white">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/*" element={<DashboardModule />} />
            <Route path="/production/*" element={<ProductionDetails />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/employees" element={<ComingSoon />} />
            <Route path="/expenses" element={<ComingSoon />} />
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
          path="/livik-admin/*"
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
