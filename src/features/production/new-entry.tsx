import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExtruderSection, LoomSection, FabricSection, FabricDeliveredSection, themes } from './day-entry-sections';
import { TabAddModal } from './tab-add-modal';
import type { SectionRef } from './day-entry-sections';
import { useExtruderProductions, useLookups } from '@/features/extruder/extruder-queries';

import { useInventoryRecords } from '@/features/inventory/inventory-queries';
import { useOpeningBalanceRawMaterials } from '@/features/admin-panel/opening-balance-queries';
import { useProductionHeader } from './production-context';
import { useAuth } from '@/features/auth/auth-context';
import { canCreateProductionRecord } from '@/lib/production-permissions';

interface NewEntryProps {
  onClose: () => void;
  defaultDate?: string | null;
  /** View-only: shows the day's existing records with no editing controls. */
  readOnly?: boolean;
}

export function NewEntry({ onClose, defaultDate, readOnly: propsReadOnly = false }: NewEntryProps) {
  const { user } = useAuth();
  const [sessionStartTime] = useState(() => Date.now());
  const canAddRow = canCreateProductionRecord(user);
  const readOnly = propsReadOnly || !canAddRow;
  const { setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle } = useProductionHeader();
  const isCreateMode = !defaultDate && !readOnly;

  const extruderRef = useRef<SectionRef>(null);
  const loomRef = useRef<SectionRef>(null);
  const fabricRef = useRef<SectionRef>(null);
  const fabricDeliveredRef = useRef<SectionRef>(null);

  const [date, setDate] = useState<Date>(() => {
    if (defaultDate) return parseISO(defaultDate);
    const saved = sessionStorage.getItem('productionMonthFilter');
    if (saved) {
      const savedDate = parseISO(`${saved}-01`);
      const today = new Date();
      if (savedDate.getFullYear() === today.getFullYear() && savedDate.getMonth() === today.getMonth()) {
        return today;
      }
      return savedDate;
    }
    return new Date();
  });
  const productionDate = format(date, 'yyyy-MM-dd');
  const [submitting] = useState(false);
  const [isInventoryMinimized, setIsInventoryMinimized] = useState(true);

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'extruder');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingExtruderGroup, setEditingExtruderGroup] = useState<any>(null);
  const [editingLoomGroup, setEditingLoomGroup] = useState<any>(null);
  const [editingFabricGroup, setEditingFabricGroup] = useState<any>(null);
  const [editingDeliveredGroup, setEditingDeliveredGroup] = useState<any>(null);

  const { data: lookupsData } = useLookups();
  const lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  const { data: allExtruderData } = useExtruderProductions('?limit=100', !readOnly);
  const completedDateStrings = new Set(
    (allExtruderData?.data ?? []).map(r => r.productionDate?.split('T')[0]).filter(Boolean) as string[]
  );

  useEffect(() => {
    setHeaderTitle(isCreateMode ? 'Add New Daily Production Details' : 'Edit Daily Production Details');
    setShowBackButton(true);
    setOnBackClick(() => onClose);

    setHeaderRight(
      <div className="flex flex-wrap items-center gap-3">
        {isCreateMode ? (
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={readOnly || submitting}
                className="flex items-center bg-white border border-gray-400 rounded-md px-4 py-2 h-auto shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 disabled:opacity-100 cursor-pointer"
              >
                <span className="text-sm font-semibold text-gray-800 mr-3">{format(date, 'dd MMM, yyyy')}</span>
                <CalendarIcon className="w-4 h-4 text-gray-800" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(value) => {
                  if (value) {
                    setDate(value);
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={(d) => d > new Date() || (completedDateStrings.has(format(d, 'yyyy-MM-dd')) && format(d, 'yyyy-MM-dd') !== defaultDate)}
                defaultMonth={date}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        ) : !readOnly ? (
          // Editing an existing day — the date is fixed to whichever day was opened, so show
          // it as a plain, non-interactive label instead of a clickable picker.
          <Button
            variant="outline"
            disabled
            className="flex items-center bg-white border border-gray-400 rounded-md px-4 py-2 h-auto shadow-[0_1px_2px_rgba(0,0,0,0.05)] disabled:opacity-100 cursor-not-allowed"
          >
            <span className="text-sm font-semibold text-gray-800 mr-3">{format(date, 'dd MMM, yyyy')}</span>
            <CalendarIcon className="w-4 h-4 text-gray-800" />
          </Button>
        ) : null}
      </div>
    );

    return () => {
      setHeaderTitle(null);
      setHeaderRight(null);
      setShowBackButton(false);
      setOnBackClick(undefined);
    };
  }, [setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle, onClose, date, readOnly, submitting, activeTab, isCreateMode, canAddRow, isCalendarOpen]);

  // Most recent entry before the selected date — used to carry forward
  // Data for calculating live stock balances in create mode
  const { data: allInvData } = useInventoryRecords('?limit=100', !readOnly);
  const inventoryRecords = allInvData?.data ?? [];
  const extruderRecords = allExtruderData?.data ?? [];

  const { data: rawMaterialsOBData } = useOpeningBalanceRawMaterials('?limit=100', !readOnly);
  const rawMaterialsOBRecords = rawMaterialsOBData?.data ?? [];

  // Balances shown here are stock levels, not ledgers — they never display
  // below 0.00 even if consumption momentarily outpaces recorded receipts.
  const getHDPEBalance = (name: string) => {
    const obReceived = rawMaterialsOBRecords.filter(r => r.type === 'HDPE' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);
    const received = inventoryRecords.filter(r => r.type === 'HDPE' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0) + obReceived;
    const consumed = extruderRecords.filter(r => r.extruder?.brand?.name === name).reduce((sum, r) => sum + (r.extruder?.rawMaterialKg ?? 0), 0);
    return Math.max(0, received - consumed).toFixed(2);
  };

  const getChemicalBalance = (name: string) => {
    const obReceived = rawMaterialsOBRecords.filter(r => r.type === 'CHEMICAL' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);
    const received = inventoryRecords.filter(r => r.type === 'CHEMICAL' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0) + obReceived;
    const consumed = extruderRecords.filter(r => r.extruder?.chemical?.name === name).reduce((sum, r) => sum + (r.extruder?.chemicalKg ?? 0), 0);
    return Math.max(0, received - consumed).toFixed(2);
  };

  const getColorBalance = (name: string) => {
    const obReceived = rawMaterialsOBRecords.filter(r => r.type === 'COLOR' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);
    const received = inventoryRecords.filter(r => r.type === 'COLOR' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0) + obReceived;
    const consumed = extruderRecords.filter(r => r.color?.name === name).reduce((sum, r) => sum + (r.extruder?.colorConsumedKg ?? 0), 0);
    return Math.max(0, received - consumed).toFixed(2);
  };

  const totalRawMaterial = lookups.brands.reduce((sum, b) => sum + parseFloat(getHDPEBalance(b.name) || '0'), 0).toFixed(2);
  const totalChemical = lookups.chemicals.reduce((sum, c) => sum + parseFloat(getChemicalBalance(c.name) || '0'), 0).toFixed(2);
  const totalColor = lookups.colors.reduce((sum, c) => sum + parseFloat(getColorBalance(c.name) || '0'), 0).toFixed(2);

  return (
    <div className="flex flex-col h-full bg-[#004D40]/5">
      <div className="flex-1 p-2 md:p-2 overflow-y-auto ">

        {!readOnly && (
          <div className="rounded-xl border border-gray-400 bg-white shadow-sm mb-3 transition-all duration-500">
            <div
              className="bg-violet-100 border-b border-violet-200 px-4 py-3 rounded-t-xl flex justify-between items-center cursor-pointer select-none"
              onClick={() => setIsInventoryMinimized(!isInventoryMinimized)}
            >
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-violet-900 flex items-center gap-2">
                Inventory Balances
              </h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-violet-200 text-violet-700">
                {isInventoryMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
            <div className={`px-4 grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-gray-200 transition-all duration-500 ease-in-out ${isInventoryMinimized ? 'py-3 gap-2' : 'py-3 gap-3'}`}>
              <div className="flex flex-col sm:pr-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                  <label className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-gray-500">
                    <img src="/hdpe-in.png" alt="" className="h-9 w-9 object-contain" />
                    HDPE
                  </label>
                  <span className={`text-[13px] font-bold text-gray-900 transition-opacity duration-300 ${isInventoryMinimized ? 'opacity-100' : 'opacity-0'}`}>
                    {totalRawMaterial} kg
                  </span>
                </div>
                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isInventoryMinimized ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 pr-1 pt-2">
                      {lookups.brands.map((b) => (
                        <div key={b.id} className="flex justify-between items-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-[12.5px]">
                          <span className="text-gray-700">{b.name}</span>
                          <span className="font-bold text-gray-900">{getHDPEBalance(b.name)} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:px-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <label className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-gray-500">
                    <img src="/chemical-in.png" alt="" className="h-8 w-8 object-contain" />
                    Chemical
                  </label>
                  <span className={`text-[13px] font-bold text-gray-900 transition-opacity duration-300 ${isInventoryMinimized ? 'opacity-100' : 'opacity-0'}`}>
                    {totalChemical} kg
                  </span>
                </div>
                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isInventoryMinimized ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 pr-1 pt-2">
                      {lookups.chemicals.map((c) => (
                        <div key={c.id} className="flex justify-between items-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-[12.5px]">
                          <span className="text-gray-700">{c.name}</span>
                          <span className="font-bold text-gray-900">{getChemicalBalance(c.name)} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:pl-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <label className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-wide text-gray-500">
                    <img src="/color-in.png" alt="" className="h-8 w-8 object-contain" />
                    Color
                  </label>
                  <span className={`text-[13px] font-bold text-gray-900 transition-opacity duration-300 ${isInventoryMinimized ? 'opacity-100' : 'opacity-0'}`}>
                    {totalColor} kg
                  </span>
                </div>
                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isInventoryMinimized ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 pr-1 pt-2">
                      {lookups.colors.map((c) => (
                        <div key={c.id} className="flex justify-between items-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-[12.5px]">
                          <span className="text-gray-700">{c.name}</span>
                          <span className="font-bold text-gray-900">{getColorBalance(c.name)} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forms Container */}
        <div className="flex flex-col gap-2.5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col gap-0">
            <div className="flex justify-between items-end border-b border-gray-200 w-full">
              <TabsList variant="folder" className="flex overflow-x-auto sm:overflow-visible p-0 m-0">
                <TabsTrigger value="extruder" className="data-[state=active]:!bg-[#D6EEF7] data-[state=active]:!text-[#0B5566] data-[state=active]:!border-b-[#D6EEF7]">Extruder Production</TabsTrigger>
                <TabsTrigger value="looms" className="data-[state=active]:!bg-[#FFF6BF] data-[state=active]:!text-[#7A6A00] data-[state=active]:!border-b-[#FFF6BF]">Looms Production</TabsTrigger>
                <TabsTrigger value="fabric" className="data-[state=active]:!bg-[#DCEEDB] data-[state=active]:!text-[#2F6B2F] data-[state=active]:!border-b-[#DCEEDB]">Fabric Checking</TabsTrigger>
                <TabsTrigger value="delivered" className="data-[state=active]:!bg-[#f2caa0] data-[state=active]:!text-[#61401E] data-[state=active]:!border-b-[#f2caa0]">Fabric Delivered</TabsTrigger>
              </TabsList>

              {!readOnly && canAddRow && (
                <Button
                  className={`flex items-center gap-2 rounded-md px-3 py-2 h-auto mb-1 text-[12px] cursor-pointer font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)] transition-colors duration-200 ${activeTab === 'extruder' ? `${themes.extruder.iconBg} ${themes.extruder.iconColor} ${themes.extruder.iconHoverBg} ${themes.extruder.iconHoverColor}` :
                    activeTab === 'looms' ? `${themes.looms.iconBg} ${themes.looms.iconColor} ${themes.looms.iconHoverBg} ${themes.looms.iconHoverColor}` :
                      activeTab === 'fabric' ? `${themes.fabric.iconBg} ${themes.fabric.iconColor} ${themes.fabric.iconHoverBg} ${themes.fabric.iconHoverColor}` :
                        `${themes.fabricDelivered.iconBg} ${themes.fabricDelivered.iconColor} ${themes.fabricDelivered.iconHoverBg} ${themes.fabricDelivered.iconHoverColor}`
                    }`}
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Plus className="w-3 h-3" />
                  ADD ROW
                </Button>
              )}
            </div>

            <TabsContent value="extruder" className="flex flex-col gap-4 mt-0 pt-0">
              <ExtruderSection
                ref={extruderRef}
                productionDate={productionDate}
                autoAdd={!readOnly}
                readOnly={readOnly}
                hideExisting={false}
                sessionStartTime={isCreateMode ? sessionStartTime : undefined}
                hideBanner={true}
                onEditExtruderGroup={(group) => {
                  setEditingExtruderGroup(group);
                  setIsAddModalOpen(true);
                }}
              />
            </TabsContent>

            <TabsContent value="looms" className="flex flex-col gap-4 mt-0 pt-0">
              <LoomSection ref={loomRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} sessionStartTime={isCreateMode ? sessionStartTime : undefined} hideBanner={true} onEditLoomGroup={(g) => { setEditingLoomGroup(g); setIsAddModalOpen(true); }} />
            </TabsContent>

            <TabsContent value="fabric" className="flex flex-col gap-4 mt-0 pt-0">
              <FabricSection ref={fabricRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} sessionStartTime={isCreateMode ? sessionStartTime : undefined} hideBanner={true} onEditFabricGroup={(g) => { setEditingFabricGroup(g); setIsAddModalOpen(true); }} />
            </TabsContent>

            <TabsContent value="delivered" className="flex flex-col gap-4 mt-0 pt-0">
              <FabricDeliveredSection ref={fabricDeliveredRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} sessionStartTime={isCreateMode ? sessionStartTime : undefined} hideBanner={true} onEditDeliveredGroup={(g) => { setEditingDeliveredGroup(g); setIsAddModalOpen(true); }} />
            </TabsContent>
          </Tabs>
        </div>

      </div>

      <TabAddModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setTimeout(() => {
            setEditingExtruderGroup(null);
            setEditingLoomGroup(null);
            setEditingFabricGroup(null);
            setEditingDeliveredGroup(null);
          }, 300); // clear after animation
        }}
        activeTab={activeTab}
        productionDate={productionDate}
        initialExtruderData={editingExtruderGroup}
        initialLoomData={editingLoomGroup}
        initialFabricData={editingFabricGroup}
        initialDeliveredData={editingDeliveredGroup}
        isEditMode={!!editingExtruderGroup || !!editingLoomGroup || !!editingFabricGroup || !!editingDeliveredGroup}
      />
    </div>
  );
}
