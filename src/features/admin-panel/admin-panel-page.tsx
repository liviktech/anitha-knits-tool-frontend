import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlaskConical, ListTree, Users } from 'lucide-react';
import { ProductionConfigTab } from './production-config-tab';
import { RawMaterialsTab } from './raw-materials-tab';

export const BAG_WEIGHT_STORAGE_KEY = 'extruder_default_bag_weight';

export function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<'production-config' | 'raw-materials' | 'bag-weight' | 'roles'>('production-config');
  const [bagWeight, setBagWeight] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedWeight = localStorage.getItem(BAG_WEIGHT_STORAGE_KEY);
    if (savedWeight) {
      setBagWeight(savedWeight);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(BAG_WEIGHT_STORAGE_KEY, bagWeight);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const tabs = [
    { id: 'production-config', label: 'Production Config', icon: FlaskConical },
    { id: 'raw-materials', label: 'Drop Down', icon: ListTree },
    { id: 'roles', label: 'Roles', icon: Users },
  ] as const;

  return (
    <div id="admin-panel-layout" className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      <style>{`
        #admin-panel-layout, #admin-panel-layout * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
        #admin-panel-layout .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
      `}</style>

      {/* Unified Header */}
      <div className="flex flex-col gap-4 px-4 pt-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-black leading-tight px-2">Admin Panel</h1>
            <p className="text-[12.5px] text-gray-500 font-medium px-2">Configure global settings for production</p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-8 px-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-2 whitespace-nowrap transition-colors ${isActive
                  ? 'text-[#004D40] font-bold border-b-2 border-[#004D40]'
                  : 'text-gray-500 font-medium hover:text-[#004D40]'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#004D40]' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        <div className="p-6 max-w-7xl flex-1">
          {activeTab === 'production-config' && <ProductionConfigTab />}

          {activeTab === 'raw-materials' && <RawMaterialsTab />}

          {activeTab === 'bag-weight' && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Extruder Production Settings</h2>

              <div className="flex flex-col gap-4 max-w-sm">
                <div className="space-y-2">
                  <label htmlFor="bagWeight" className="text-sm font-semibold text-gray-700">
                    Default Bag Weight (KG)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="bagWeight"
                      type="number"
                      placeholder="e.g. 25"
                      value={bagWeight}
                      onChange={(e) => setBagWeight(e.target.value)}
                      className="h-10 font-medium"
                    />
                    <Button
                      onClick={handleSave}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 px-6 rounded-lg shadow-sm transition-all whitespace-nowrap"
                    >
                      {isSaved ? 'Saved!' : 'Save'}
                    </Button>
                  </div>
                </div>
                <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                  This weight will be automatically filled in the <strong>Weight per Bag (Wt / Bag)</strong> field when entering extruder production details.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Roles & Permissions</h2>
              <p className="text-blue-600 font-semibold text-sm max-w-sm bg-blue-50 py-1.5 px-3 rounded-full mt-2">
                Coming Soon
              </p>
              <p className="text-gray-500 text-sm mt-4">
                Role management and permissions configuration will be available in a future update.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
