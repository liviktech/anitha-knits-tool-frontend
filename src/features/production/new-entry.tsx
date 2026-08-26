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
import { useProductionHeader } from './production-details';

interface NewEntryProps {
  onClose: () => void;
  defaultDate?: string | null;
  /** View-only: shows the day's existing records with no editing controls. */
  readOnly?: boolean;
}

export function NewEntry({ onClose, defaultDate, readOnly = false }: NewEntryProps) {
  const { setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle } = useProductionHeader();
  const isCreateMode = !defaultDate && !readOnly;

  const extruderRef = useRef<SectionRef>(null);
  const loomRef = useRef<SectionRef>(null);
  const fabricRef = useRef<SectionRef>(null);
  const fabricDeliveredRef = useRef<SectionRef>(null);

  const [date, setDate] = useState<Date>(defaultDate ? parseISO(defaultDate) : new Date());
  const productionDate = format(date, 'yyyy-MM-dd');
  const [submitting] = useState(false);
  const [isInventoryMinimized, setIsInventoryMinimized] = useState(false);

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'extruder');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExtruderGroup, setEditingExtruderGroup] = useState<any>(null);
  const [editingLoomGroup, setEditingLoomGroup] = useState<any>(null);
  const [editingFabricGroup, setEditingFabricGroup] = useState<any>(null);
  const [editingDeliveredGroup, setEditingDeliveredGroup] = useState<any>(null);

  const { data: lookupsData } = useLookups();
  const lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  useEffect(() => {
    setHeaderTitle(isCreateMode ? 'Add New Daily Production Details' : 'Edit Daily Production Details');
    setShowBackButton(true);
    setOnBackClick(() => onClose);

    setHeaderRight(
      <div className="flex flex-wrap items-center gap-3">
        {!isCreateMode ? (
          <div className="flex items-center gap-2 mr-4">
            <CalendarIcon className="w-[18px] h-[18px] text-[#004D40]" />
            <span className="text-[15px] font-bold text-[#004D40]">{format(date, 'dd MMM, yyyy')}</span>
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={readOnly || submitting}
                className="flex items-center bg-white border border-gray-400 rounded-md px-4 py-2 h-auto shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 disabled:opacity-100"
              >
                <span className="text-sm font-semibold text-gray-700 mr-3">{format(date, 'dd MMM, yyyy')}</span>
                <CalendarIcon className="w-4 h-4 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(value) => value && setDate(value)}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    );

    return () => {
      setHeaderTitle(null);
      setHeaderRight(null);
      setShowBackButton(false);
      setOnBackClick(undefined);
    };
  }, [setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle, onClose, date, readOnly, submitting]);

  // Most recent entry before the selected date — used to carry forward
  // Data for calculating live stock balances in create mode
  const { data: allInvData } = useInventoryRecords('?limit=100', !readOnly);
  const { data: allExtruderData } = useExtruderProductions('?limit=100', !readOnly);
  const inventoryRecords = allInvData?.data ?? [];
  const extruderRecords = allExtruderData?.data ?? [];

  const getHDPEBalance = (name: string) => {
    const received = inventoryRecords.filter(r => r.type === 'HDPE' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);
    const consumed = extruderRecords.filter(r => r.extruder?.brand?.name === name).reduce((sum, r) => sum + (r.extruder?.rawMaterialKg ?? 0), 0);
    return (received - consumed).toFixed(2);
  };

  const getChemicalBalance = (name: string) => {
    const received = inventoryRecords.filter(r => r.type === 'CHEMICAL' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);
    const consumed = extruderRecords.filter(r => r.extruder?.chemical?.name === name).reduce((sum, r) => sum + (r.extruder?.chemicalKg ?? 0), 0);
    return (received - consumed).toFixed(2);
  };

  const getColorBalance = (name: string) => {
    const received = inventoryRecords.filter(r => r.type === 'COLOR' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);
    const consumed = extruderRecords.filter(r => r.color?.name === name).reduce((sum, r) => sum + (r.extruder?.colorConsumedKg ?? 0), 0);
    return (received - consumed).toFixed(2);
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
              className="bg-gray-50 border-b border-gray-200 px-4 py-3 rounded-t-xl flex justify-between items-center cursor-pointer select-none"
              onClick={() => setIsInventoryMinimized(!isInventoryMinimized)}
            >
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                Inventory Balances
              </h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-200 text-gray-500">
                {isInventoryMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
            <div className={`px-4 grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-gray-200 transition-all duration-500 ease-in-out ${isInventoryMinimized ? 'py-3 gap-2' : 'py-4 gap-4'}`}>
              <div className="flex flex-col sm:pr-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">HDPE Balance</label>
                  <span className={`text-[12px] font-bold text-gray-900 transition-opacity duration-300 ${isInventoryMinimized ? 'opacity-100' : 'opacity-0'}`}>
                    {totalRawMaterial} kg
                  </span>
                </div>
                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isInventoryMinimized ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1 pt-2">
                      {lookups.brands.map((b) => (
                        <div key={b.id} className="flex justify-between items-center text-[12.5px]">
                          <span className="text-gray-700">{b.name}</span>
                          <span className="font-semibold text-gray-900">{getHDPEBalance(b.name)} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:px-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Chemical Balance</label>
                  <span className={`text-[12px] font-bold text-gray-900 transition-opacity duration-300 ${isInventoryMinimized ? 'opacity-100' : 'opacity-0'}`}>
                    {totalChemical} kg
                  </span>
                </div>
                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isInventoryMinimized ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1 pt-2">
                      {lookups.chemicals.map((c) => (
                        <div key={c.id} className="flex justify-between items-center text-[12.5px]">
                          <span className="text-gray-700">{c.name}</span>
                          <span className="font-semibold text-gray-900">{getChemicalBalance(c.name)} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:pl-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Color Balance</label>
                  <span className={`text-[12px] font-bold text-gray-900 transition-opacity duration-300 ${isInventoryMinimized ? 'opacity-100' : 'opacity-0'}`}>
                    {totalColor} kg
                  </span>
                </div>
                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isInventoryMinimized ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1 pt-2">
                      {lookups.colors.map((c) => (
                        <div key={c.id} className="flex justify-between items-center text-[12.5px]">
                          <span className="text-gray-700">{c.name}</span>
                          <span className="font-semibold text-gray-900">{getColorBalance(c.name)} kg</span>
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
            <div className="flex justify-between items-end border-b border-gray-200">              <TabsList variant="folder" className="flex overflow-x-auto sm:overflow-visible">
                <TabsTrigger value="extruder" className="data-[state=active]:!bg-[#D6EEF7] data-[state=active]:!text-[#0B5566] data-[state=active]:!border-b-[#D6EEF7]">Extruder Production</TabsTrigger>
                <TabsTrigger value="looms" className="data-[state=active]:!bg-[#FFF6BF] data-[state=active]:!text-[#7A6A00] data-[state=active]:!border-b-[#FFF6BF]">Looms Production</TabsTrigger>
                <TabsTrigger value="fabric" className="data-[state=active]:!bg-[#DCEEDB] data-[state=active]:!text-[#2F6B2F] data-[state=active]:!border-b-[#DCEEDB]">Fabric Checking</TabsTrigger>
                <TabsTrigger value="delivered" className="data-[state=active]:!bg-[#f2caa0] data-[state=active]:!text-[#61401E] data-[state=active]:!border-b-[#f2caa0]">Fabric Delivered</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="extruder" className="flex flex-col gap-4 mt-0 pt-0">
              <ExtruderSection
                ref={extruderRef}
                productionDate={productionDate}
                autoAdd={!readOnly}
                readOnly={readOnly}
                hideExisting={false}
                hideBanner={true}
                onEditExtruderGroup={(group) => {
                  setEditingExtruderGroup(group);
                  setIsAddModalOpen(true);
                }}
              />
            </TabsContent>

            <TabsContent value="looms" className="flex flex-col gap-4 mt-0 pt-0">
              <LoomSection ref={loomRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} hideBanner={true} onEditLoomGroup={(g) => { setEditingLoomGroup(g); setIsAddModalOpen(true); }} />
            </TabsContent>

            <TabsContent value="fabric" className="flex flex-col gap-4 mt-0 pt-0">
              <FabricSection ref={fabricRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} hideBanner={true} onEditFabricGroup={(g) => { setEditingFabricGroup(g); setIsAddModalOpen(true); }} />
            </TabsContent>

            <TabsContent value="delivered" className="flex flex-col gap-4 mt-0 pt-0">
              <FabricDeliveredSection ref={fabricDeliveredRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} hideBanner={true} onEditDeliveredGroup={(g) => { setEditingDeliveredGroup(g); setIsAddModalOpen(true); }} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-4 mb-8 flex justify-between items-center">
          {!readOnly ? (
            <Button
              size="sm"
              className={`h-8 gap-1.5 shadow-sm transition-colors duration-200 ${activeTab === 'extruder' ? `${themes.extruder.iconBg} ${themes.extruder.iconColor} ${themes.extruder.iconHoverBg} ${themes.extruder.iconHoverColor}` :
                activeTab === 'looms' ? `${themes.looms.iconBg} ${themes.looms.iconColor} ${themes.looms.iconHoverBg} ${themes.looms.iconHoverColor}` :
                  activeTab === 'fabric' ? `${themes.fabric.iconBg} ${themes.fabric.iconColor} ${themes.fabric.iconHoverBg} ${themes.fabric.iconHoverColor}` :
                    `${themes.fabricDelivered.iconBg} ${themes.fabricDelivered.iconColor} ${themes.fabricDelivered.iconHoverBg} ${themes.fabricDelivered.iconHoverColor}`
                }`}
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 bg-white" disabled={submitting}>
              Close
            </Button>
            {/* {!readOnly && (
              <Button onClick={handleSaveAll} className="bg-[#004D40] hover:bg-[#00332A] text-white" disabled={submitting}>
                {submitting ? 'Saving All...' : 'Save'}
              </Button>
            )} */}
          </div>
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
