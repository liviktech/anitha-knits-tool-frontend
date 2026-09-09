import { useState } from 'react';
import { BarChart3, CalendarCheck, CalendarDays, Layers, Package, Receipt, Trash2, Users, Wallet, type LucideIcon } from 'lucide-react';
import { ExpenseReportView } from './expense-report-view';
import { InventoryReportView } from './inventory-report-view';
import { DashboardPdfView } from './dashboard-pdf-view';
import { EmployeePdfView } from './employee-pdf-view';
import { ProductionPdfView } from './production-pdf-view';
// import other report views here...

const TABS: Record<string, { id: string; label: string; icon: LucideIcon }[]> = {
  dashboard: [
    { id: 'production_summary', label: 'Production summary', icon: BarChart3 },
    { id: 'wastage_summary', label: 'Wastage Summary', icon: Trash2 },
    { id: 'sample_production', label: 'Sample production summary', icon: Layers },
    { id: 'sample_wastage_summary', label: 'Sample Wastage Summary', icon: Trash2 },
  ],
  production: [
    { id: 'day_wise_report', label: 'Production details report', icon: CalendarDays },
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

export const ALL_REPORTS = Object.entries(TABS).flatMap(([moduleId, tabs]) =>
  tabs.map((t) => ({ id: t.id, label: t.label, moduleId }))
);

export function ReportsModule() {
  const [selectedTab, setSelectedTab] = useState<string>('production_summary');

  const renderReportPreview = () => {
    const commonProps = {
      allReports: ALL_REPORTS,
      selectedReport: selectedTab,
      onReportChange: (tabId: string) => {
        setSelectedTab(tabId);
      },
    };

    switch (selectedTab) {
      case 'expense_report':
        return <ExpenseReportView {...commonProps} />;
      case 'inventory_report':
        return <InventoryReportView {...commonProps} />;
      case 'day_wise_report':
      case 'sample_production_report':
        return <ProductionPdfView tab={selectedTab} {...commonProps} />;
      case 'production_summary':
      case 'wastage_summary':
      case 'sample_production':
      case 'sample_wastage_summary':
        return <DashboardPdfView tab={selectedTab} {...commonProps} />;
      case 'employee_directory':
      case 'attendance_report':
      case 'payroll_report':
        return <EmployeePdfView tab={selectedTab} {...commonProps} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            Preview for {selectedTab} is not yet implemented or selected.
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      {/* Header Bar matching project module theme */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div>
          <h1 className="font-hanken text-[20px] font-bold text-black leading-tight px-2">Reports</h1>
          <p className="font-hanken text-[12.5px] text-gray-500 font-medium px-2">View and download comprehensive reports across all modules</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Removed module dropdown */}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Content Area */}
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 ease-in-out flex-1 flex flex-col min-h-0">
          {renderReportPreview()}
        </div>
      </div>
    </div>
  );
}
