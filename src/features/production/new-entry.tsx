import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from '@/components/shared/loader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExtruderSection, LoomSection, FabricSection, FabricDeliveredSection } from './day-entry-sections';
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
  const [submitting, setSubmitting] = useState(false);
  const [isInventoryMinimized, setIsInventoryMinimized] = useState(false);

  const { data: lookupsData } = useLookups();
  const lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  useEffect(() => {
    setHeaderTitle('Add new Daily production details');
    setShowBackButton(true);
    setOnBackClick(() => onClose);

    setHeaderRight(
      <div className="flex flex-wrap items-center gap-3">
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

  const handleSaveDayEntry = async () => {
    setSubmitting(true);
    try {
      const results = await Promise.all([
        extruderRef.current?.saveDraft(),
        loomRef.current?.saveDraft(),
        fabricRef.current?.saveDraft(),
        fabricDeliveredRef.current?.saveDraft()
      ]);

      // If any returned false (i.e. validation failed or save failed), don't close.
      if (results.some(success => success === false)) {
        return;
      }

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

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
          <ExtruderSection
            ref={extruderRef}
            productionDate={productionDate}
            autoAdd={!readOnly}
            readOnly={readOnly}
            hideExisting={false}
          />
          <LoomSection ref={loomRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} />
          <FabricSection ref={fabricRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} />
          <FabricDeliveredSection ref={fabricDeliveredRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={false} />
        </div>

        {/* Footer */}
        <div className="mt-4 mb-8 flex justify-end">
          <div className="flex items-center gap-3">
            {readOnly ? (
              <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 bg-white">
                Close
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 bg-white font-semibold shadow-sm" disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#004D40] text-white hover:bg-[#00382e] font-semibold shadow-sm px-6"
                  onClick={handleSaveDayEntry}
                  disabled={submitting}
                >
                  {submitting && <Loader size="sm" className="mr-2" />}
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
