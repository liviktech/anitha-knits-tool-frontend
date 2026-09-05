import { useState } from 'react';
import { FlaskConical, ListTree, Users, Scale } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductionConfigTab } from './production-config-tab';
import { RawMaterialsTab } from './raw-materials-tab';
import { RolesTab } from './roles-tab';
import { OpeningBalanceTab } from './opening-balance-tab';

export const BAG_WEIGHT_STORAGE_KEY = 'extruder_default_bag_weight';

type AdminPanelTab = 'production-config' | 'raw-materials' | 'bag-weight' | 'roles' | 'opening-balance';

export function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<AdminPanelTab>('production-config');

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
        className="flex-1 overflow-y-auto px-2 pb-1 gap-1"
      >
        <div >
          <TabsList variant="notch-flip">
            <TabsTrigger value="production-config">
              <span className="flex items-center gap-1">
                <FlaskConical className="h-4 w-4" strokeWidth={1.75} />
                Production Config
              </span>
            </TabsTrigger>
            <TabsTrigger value="opening-balance">
              <span className="flex items-center gap-1">
                <Scale className="h-4 w-4" strokeWidth={1.75} />
                Opening Balance
              </span>
            </TabsTrigger>
            <TabsTrigger value="raw-materials">
              <span className="flex items-center gap-1">
                <ListTree className="h-4 w-4" strokeWidth={1.75} />
                Drop Down
              </span>
            </TabsTrigger>
            <TabsTrigger value="roles">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" strokeWidth={1.75} />
                Roles
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="production-config" className="mt-0 animate-in fade-in-0 duration-300 py-6 max-w-full">
          <ProductionConfigTab />
        </TabsContent>

        <TabsContent value="opening-balance" className="mt-0 animate-in fade-in-0 duration-300 py-6 max-w-full">
          <OpeningBalanceTab />
        </TabsContent>

        <TabsContent value="raw-materials" className="mt-0 animate-in fade-in-0 duration-300 py-6 max-w-full">
          <RawMaterialsTab />
        </TabsContent>

        <TabsContent value="roles" className="mt-0 animate-in fade-in-0 duration-300 py-6 max-w-full">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
