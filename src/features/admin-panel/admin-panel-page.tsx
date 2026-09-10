import { useEffect, useState } from 'react';
import { FlaskConical, ListTree, Users, Scale } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductionConfigTab } from './production-config-tab';
import { RawMaterialsTab } from './raw-materials-tab';
import { RolesTab } from './roles-tab';
import { OpeningBalanceTab } from './opening-balance-tab';
import { useAuth } from '@/features/auth/auth-context';
import { hasTabAccess } from '@/lib/access';

export const BAG_WEIGHT_STORAGE_KEY = 'extruder_default_bag_weight';

type AdminPanelTab = 'production-config' | 'raw-materials' | 'bag-weight' | 'roles' | 'opening-balance';

export function AdminPanelPage() {
  const { user } = useAuth();
  const isAdmin = user?.kind === 'company-user' && user.role === 'ADMIN';
  const canSeeProductionConfig = hasTabAccess(user, 'admin_panel', 'production-config');
  const canSeeOpeningBalance = hasTabAccess(user, 'admin_panel', 'opening-balance');
  const canSeeRawMaterials = hasTabAccess(user, 'admin_panel', 'raw-materials');
  // Roles & Rights manages the permission system itself — never exposed to Manager/Supervisor
  // regardless of any right granted, only real ADMIN.
  const canSeeRoles = isAdmin;

  const visibleTabs: AdminPanelTab[] = [
    ...(canSeeProductionConfig ? (['production-config'] as const) : []),
    ...(canSeeOpeningBalance ? (['opening-balance'] as const) : []),
    ...(canSeeRawMaterials ? (['raw-materials'] as const) : []),
    ...(canSeeRoles ? (['roles'] as const) : []),
  ];

  const [activeTab, setActiveTab] = useState<AdminPanelTab>(visibleTabs[0] ?? 'production-config');

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs.join(','), activeTab]);

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-sm text-gray-500">
        You do not have access to any Admin Panel section.
      </div>
    );
  }

  return (
    <div id="admin-panel-layout" className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      <style>{`
        #admin-panel-layout, #admin-panel-layout * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
        #admin-panel-layout .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
      `}</style>

      {/* Unified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div>
          <h1 className="text-[20px] font-bold text-black leading-tight px-2">Admin Panel</h1>
          <p className="text-[12.5px] text-gray-500 font-medium px-2">Configure global settings for production</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AdminPanelTab)}
        className="flex-1 flex flex-col min-h-0 overflow-hidden px-2 pb-1 gap-1"
      >
        <div>
          <TabsList variant="notch-flip">
            {canSeeProductionConfig && (
              <TabsTrigger value="production-config">
                <span className="flex items-center gap-1">
                  <FlaskConical className="h-4 w-4" strokeWidth={1.75} />
                  Production Config
                </span>
              </TabsTrigger>
            )}
            {canSeeOpeningBalance && (
              <TabsTrigger value="opening-balance">
                <span className="flex items-center gap-1">
                  <Scale className="h-4 w-4" strokeWidth={1.75} />
                  Opening Balance
                </span>
              </TabsTrigger>
            )}
            {canSeeRawMaterials && (
              <TabsTrigger value="raw-materials">
                <span className="flex items-center gap-1">
                  <ListTree className="h-4 w-4" strokeWidth={1.75} />
                  Drop Down
                </span>
              </TabsTrigger>
            )}
            {canSeeRoles && (
              <TabsTrigger value="roles">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" strokeWidth={1.75} />
                  Roles
                </span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {canSeeProductionConfig && (
          <TabsContent value="production-config" className="mt-0 animate-in fade-in-0 duration-300 py-6 max-w-full overflow-y-auto flex-1">
            <ProductionConfigTab />
          </TabsContent>
        )}

        {canSeeOpeningBalance && (
          <TabsContent value="opening-balance" className="mt-0 animate-in fade-in-0 duration-300 py-6 max-w-full overflow-y-auto flex-1">
            <OpeningBalanceTab />
          </TabsContent>
        )}

        {canSeeRawMaterials && (
          <TabsContent value="raw-materials" className="mt-0 animate-in fade-in-0 duration-300 py-6 max-w-full overflow-y-auto flex-1">
            <RawMaterialsTab />
          </TabsContent>
        )}

        {canSeeRoles && (
          <TabsContent value="roles" className="mt-0 animate-in fade-in-0 duration-300 py-2 max-w-full flex-1 flex flex-col min-h-0">
            <RolesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
