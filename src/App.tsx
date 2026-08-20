import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Settings, Users, Factory, Wallet, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProductionDetails } from './features/production/production-details';
import threadIcon from '@/assets/thread.png';

const navItems = [
  { to: '/production', label: 'Production details', icon: Factory },
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
              `w-full flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary bg-green-800 text-white font-semibold rounded-lg'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
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
        <aside className="hidden lg:flex w-64 shrink-0 border-r bg-green-50 flex-col">
          <div className="flex items-center gap-2 p-6">
            <img src={threadIcon} alt="" className="w-6 h-6" />
            <h2 className="text-xl font-bold text-gray-800">Anitha Knits</h2>
          </div>
          <NavLinks />
          <div className="p-4 border-t">
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              <Settings className="w-5 h-5 text-gray-400" />
              Settings
            </button>
          </div>
        </aside>

        {/* Tablet + mobile: top bar with hamburger trigger */}
        <header className="flex items-center justify-between border-b bg-green-50 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <img src={threadIcon} alt="" className="w-5 h-5" />
            <h2 className="text-lg font-bold text-gray-800">Anitha Knits</h2>
          </div>
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <SheetContent side="left" className="w-64 bg-green-50 p-0">
              <SheetHeader className="p-6">
                <SheetTitle className="flex items-center gap-2">
                  <img src={threadIcon} alt="" className="w-5 h-5" />
                  Anitha Knits
                </SheetTitle>
              </SheetHeader>
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
              <div className="p-4 border-t">
                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  <Settings className="w-5 h-5 text-gray-400" />
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
            <Route path="/employees" element={<ComingSoon />} />
            <Route path="/expenses" element={<ComingSoon />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
