import { useState } from 'react';
import { FlaskConical, ListTree, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { ProductionConfigTab } from './production-config-tab';
import { RawMaterialsTab } from './raw-materials-tab';
import { RolesTab } from './roles-tab';

export const BAG_WEIGHT_STORAGE_KEY = 'extruder_default_bag_weight';

type AdminPanelTab = 'production-config' | 'raw-materials' | 'bag-weight' | 'roles';

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
        <div className="pt-2 px-2">
          <TabsList>
            <TabsTrigger value="production-config" className="relative">
              {activeTab === 'production-config' && (
                <motion.div
                  layoutId="activeAdminTabPill"
                  className="absolute inset-0 bg-[#004D40] rounded-md z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <FlaskConical className="h-4 w-4" strokeWidth={1.75} />
                Production Config
              </span>
            </TabsTrigger>
            <TabsTrigger value="raw-materials" className="relative">
              {activeTab === 'raw-materials' && (
                <motion.div
                  layoutId="activeAdminTabPill"
                  className="absolute inset-0 bg-[#004D40] rounded-md z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <ListTree className="h-4 w-4" strokeWidth={1.75} />
                Drop Down
              </span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="relative">
              {activeTab === 'roles' && (
                <motion.div
                  layoutId="activeAdminTabPill"
                  className="absolute inset-0 bg-[#004D40] rounded-md z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <Users className="h-4 w-4" strokeWidth={1.75} />
                Roles
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="production-config" className="mt-0 animate-in fade-in-0 duration-300 p-6 max-w-7xl">
          <ProductionConfigTab />
        </TabsContent>

        <TabsContent value="raw-materials" className="mt-0 animate-in fade-in-0 duration-300 p-6 max-w-7xl">
          <RawMaterialsTab />
        </TabsContent>

        <TabsContent value="roles" className="mt-0 animate-in fade-in-0 duration-300 p-6 max-w-7xl">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
