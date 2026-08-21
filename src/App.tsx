import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink ,useLocation} from 'react-router-dom';
import { Settings, Users, Wallet, Menu, Package, ChevronDown, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProductionDetails } from './features/production/production-details';
import { InventoryPage } from './features/inventory/inventory-page';
import logo from '@/assets/anitha-knits-logo.png';

const navItems = [
  {
    to: '/production',
    label: 'Production details',
    icon: BarChart2,
    children: [
      { to: '/production/design-2', label: 'Production Design 2' },
      { to: '/production/design-3', label: 'Production Design 3' },
    ],
  },
  { to: '/inventory', label: 'Inventory', icon: Package }, 
  { to: '/employees', label: 'Employees', icon: Users },
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

  return (
    <nav className="flex-1 px-3 space-y-1 mt-2 font-['Hanken_Grotesk',sans-serif]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const hasActiveChild = item.children?.some((child) => location.pathname.startsWith(child.to)) ?? false;
        const isGroupActive = location.pathname.startsWith(item.to);

        if (item.children) {
          return (
            <Collapsible key={item.to} defaultOpen={hasActiveChild}>
              <div
                className={`w-full flex items-center text-sm font-medium transition-colors rounded-md ${
                  isGroupActive
                    ? 'text-[#004D40] font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className="flex-1 flex items-center gap-3 px-3 py-2.5"
                >
                  <Icon className={`w-5 h-5 ${isGroupActive ? 'text-[#004D40]' : 'text-gray-500'}`} />
                  {item.label}
                </NavLink>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Toggle ${item.label} sub-menu`}
                    className="p-2.5 pr-3"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isGroupActive ? 'text-[#004D40]' : 'text-gray-400'} ${hasActiveChild ? 'rotate-180' : ''}`} />
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
                      `block px-3 py-2 text-[13px] rounded-md transition-colors ${
                        isActive
                          ? 'text-[#004D40] font-bold bg-[#f2f8f6]'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
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
              `w-full flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg ${
                isActive
                  ? 'border-green-400 bg-green-800 text-white font-semibold'
                  : 'border-transparent text-green-100 hover:bg-green-800/50 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'text-green-400' : 'text-green-200'}`} />
                {item.label}
              </>
            )}
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
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-green-800 bg-green-900 flex-col">
          <div className="flex items-center py-4 bg-white m-4 rounded-xl px-2">
            <img src={logo} alt="Anitha Knits" className="w-full h-auto object-contain" />
          </div>
          <NavLinks />
          <div className="p-4 border-t border-green-800 mt-auto">
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-100 hover:text-white hover:bg-green-800/50 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-green-200" />
              Settings
            </button>
          </div>
        </aside>

        {/* Tablet + mobile: top bar with hamburger trigger */}
        <header className="flex items-center justify-between border-b bg-green-50 px-4 py-3 lg:hidden">
          <div className="flex items-center">
            <img src={logo} alt="Anitha Knits" className="h-9 w-auto object-contain" />
          </div>
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)}>
              <Menu className="w-5 h-5 text-[#004D40]" />
            </Button>
            <SheetContent side="left" className="w-64 bg-green-900 p-0 border-r-green-800">
              <SheetHeader className="py-4 bg-white m-4 rounded-xl px-2">
                <SheetTitle className="flex items-center">
                  <img src={logo} alt="Anitha Knits" className="w-full h-auto object-contain" />
                </SheetTitle>
              </SheetHeader>
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
              <div className="p-4 border-t border-green-800 mt-auto">
                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-100 hover:text-white hover:bg-green-800/50 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-green-200" />
                  Settings
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-white">
          <Routes>
            <Route path="/" element={<Navigate to="/production" replace />} />
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
