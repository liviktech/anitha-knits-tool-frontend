import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Settings, Users, Factory, Wallet, Menu, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProductionDetails } from './features/production/production-details';
import { InventoryPage } from './features/inventory/inventory-page';
import logo from '@/assets/anitha-knits-logo.png';

const navItems = [
  { to: '/production', label: 'Production details', icon: Factory },
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
  return (
    <nav className="flex-1 px-4 space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
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
      <div className="flex h-screen w-full flex-col bg-gray-50/50 lg:flex-row">
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
              <Menu className="w-5 h-5" />
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
        <main className="flex-1 overflow-auto bg-[#fdfdfd]">
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
