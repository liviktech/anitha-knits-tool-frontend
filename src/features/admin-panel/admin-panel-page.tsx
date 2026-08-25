import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Scale, ListTree, Users } from 'lucide-react';

export const BAG_WEIGHT_STORAGE_KEY = 'extruder_default_bag_weight';

export function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<'bag-weight' | 'lookups' | 'roles'>('bag-weight');
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
    { id: 'bag-weight', label: 'Bag Weight', icon: Scale },
    { id: 'lookups', label: 'Lookups', icon: ListTree },
    { id: 'roles', label: 'Roles', icon: Users },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-20 flex-shrink-0 border-b border-gray-200 bg-white shadow-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Settings className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Panel</h1>
            <p className="text-sm font-medium text-gray-500">Configure global settings for production</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-6 mt-6 border-b border-gray-100">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                  isActive 
                    ? 'border-blue-600 text-blue-700 font-semibold' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl flex-1 overflow-auto">
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

        {activeTab === 'lookups' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <ListTree className="w-6 h-6 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Lookups Management</h2>
            <p className="text-gray-500 text-sm max-w-sm">
              Manage master data like brands, colors, chemicals, and sizes here. (Feature coming soon)
            </p>
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
  );
}
