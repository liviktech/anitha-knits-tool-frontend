import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Settings, User, Wallet, Menu, Package, ChevronDown, LineChart, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DashboardModule } from './features/dashboard/dashboard-module';
import { ProductionDetails } from './features/production/production-details';
import { InventoryPage } from './features/inventory/inventory-page';
import logo from '@/assets/anitha-knits-logo.png';

const navItems = [
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

function ComingSoon() {
  return (
    <div className="h-full flex items-center justify-center">
      <h2 className="text-2xl font-semibold text-gray-400">upcoming message</h2>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      navItems
        .filter((item) => item.children)
        .map((item) => [item.to, item.children!.some((child) => location.pathname.startsWith(child.to))]),
    ),
  );

  return (
    <nav className="flex-1 px-3 py-2 space-y-1">
      {navItems.map((item) => {
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

function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-full flex-col bg-white lg:flex-row font-['Hanken_Grotesk',sans-serif]">
        {/* Laptop: persistent sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-gray-100 bg-white flex-col">
          <div className="flex items-center justify-center py-5 px-4 bg-[#004D40]">
            <span className="text-[20px] font-serif font-bold text-white tracking-widest uppercase">ANITHA KNITS</span>
          </div>
          <NavLinks />
          <div className="p-4 mt-auto">
            <button className="w-full flex items-center gap-3 px-3 py-3 text-[13px] font-medium text-[#1F3B33] hover:bg-[#F4F8F5] rounded-lg transition-colors mb-2">
              <Settings className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              Settings
            </button>
            <div className="pt-4 border-t border-gray-100 flex items-center gap-3 px-3">
              <div className="w-9 h-9 rounded-full bg-[#004D40] text-white flex items-center justify-center font-bold text-sm">
                AK
              </div>
              <div className="flex flex-col">
                <span className="text-[13.5px] font-bold text-gray-900 leading-tight">Admin User</span>
                <span className="text-[11px] font-medium text-gray-500">Production Manager</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Tablet + mobile: top bar with hamburger trigger */}
        <header className="flex items-center justify-between border-b bg-[#004D40] px-4 py-3 lg:hidden">
          <div className="flex items-center">
            <span className="text-[18px] font-serif font-bold text-white tracking-widest uppercase">ANITHA KNITS</span>
          </div>
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
                <div className="pt-4 border-t border-gray-100 flex items-center gap-3 px-3">
                  <div className="w-9 h-9 rounded-full bg-[#004D40] text-white flex items-center justify-center font-bold text-sm">
                    AK
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-bold text-gray-900 leading-tight">Admin User</span>
                    <span className="text-[11px] font-medium text-gray-500">Production Manager</span>
                  </div>
                </div>
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
    </BrowserRouter>
  );
}

export default App;
