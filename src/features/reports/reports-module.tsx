import { useState } from 'react';
import { BarChart3, CalendarCheck, CalendarDays, Layers, Package, Receipt, Trash2, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpenseReportView } from './expense-report-view';
import { InventoryReportView } from './inventory-report-view';
import { DashboardPdfView } from './dashboard-pdf-view';
import { EmployeePdfView } from './employee-pdf-view';
import { ProductionPdfView } from './production-pdf-view';
// import other report views here...

const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'production', label: 'Production Details' },
  { id: 'sample_production', label: 'Sample Production' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'employees', label: 'Employees' },
  { id: 'expenses', label: 'Expenses' },
];

const TABS: Record<string, { id: string; label: string; icon: LucideIcon }[]> = {
  dashboard: [
    { id: 'production_summary', label: 'Production summary', icon: BarChart3 },
    { id: 'wastage_summary', label: 'Wastage Summary', icon: Trash2 },
    { id: 'sample_production', label: 'Sample Production', icon: Layers },
  ],
  production: [
    { id: 'day_wise_report', label: 'Day Wise Report', icon: CalendarDays },
  ],
  sample_production: [
    { id: 'sample_production_report', label: 'Sample Production Report', icon: Layers },
  ],
  inventory: [
    { id: 'inventory_report', label: 'Inventory Report', icon: Package },
  ],
  employees: [
    { id: 'employee_directory', label: 'Employee Directory', icon: Users },
    { id: 'attendance_report', label: 'Attendance Report', icon: CalendarCheck },
    { id: 'payroll_report', label: 'Payroll Report', icon: Wallet },
  ],
  expenses: [
    { id: 'expense_report', label: 'Expense Report', icon: Receipt },
  ],
};

export function ReportsModule() {
  const [selectedModule, setSelectedModule] = useState<string>('dashboard');
  const [selectedTab, setSelectedTab] = useState<string>('production_summary');

  const handleModuleChange = (val: string) => {
    setSelectedModule(val);
    setSelectedTab(TABS[val][0].id);
  };

  const renderReportPreview = () => {
    switch (selectedTab) {
      case 'expense_report':
        return <ExpenseReportView />;
      case 'inventory_report':
        return <InventoryReportView />;
      case 'day_wise_report':
      case 'sample_production_report':
        return <ProductionPdfView tab={selectedTab} />;
      case 'production_summary':
      case 'wastage_summary':
      case 'sample_production':
        return <DashboardPdfView tab={selectedTab} />;
      case 'employee_directory':
      case 'attendance_report':
      case 'payroll_report':
        return <EmployeePdfView tab={selectedTab} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            Preview for {selectedTab} is not yet implemented or selected.
          </div>
        );
    }
  };

  const availableTabs = TABS[selectedModule] || [];

  return (
    <div className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      {/* Header Bar matching project module theme */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div>
          <h1 className="font-hanken text-[20px] font-bold text-black leading-tight px-2">Reports</h1>
          <p className="font-hanken text-[12.5px] text-gray-500 font-medium px-2">View and download comprehensive reports across all modules</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedModule} onValueChange={handleModuleChange}>
            <SelectTrigger className="w-[220px] border-[#004D40] bg-white h-9 font-hanken text-sm font-semibold text-gray-800">
              <SelectValue placeholder="Select Module" />
            </SelectTrigger>
            <SelectContent>
              {MODULES.map((m) => (
                <SelectItem key={m.id} value={m.id} className="font-hanken text-sm">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-1 gap-1 flex flex-col min-h-0">
        {availableTabs.length > 1 && (
          <div className="px-1 shrink-0">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList variant="notch-flip">
                {availableTabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    <span className="flex items-center gap-1 font-hanken">
                      <t.icon className="h-4 w-4" strokeWidth={1.75} />
                      {t.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
        
        {/* Content Area */}
        <div className={`mt-0 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 ease-in-out flex-1 flex flex-col min-h-0 ${availableTabs.length <= 1 ? 'pt-2 px-2' : ''}`}>
          {renderReportPreview()}
        </div>
      </div>
    </div>
  );
}
