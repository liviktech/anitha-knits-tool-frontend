import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { ProductionDetails } from './components/dashboard/production-details';
import { Settings, Users, Factory, Wallet } from 'lucide-react';

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

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-full bg-gray-50/50">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-white flex flex-col">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800">Anitha Knits  </h2>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              <Settings className="w-5 h-5 text-gray-400" />
              Settings
            </button>
          </div>
        </aside>

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
