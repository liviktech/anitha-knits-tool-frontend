import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from '@/components/shared/loader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExtruderSection, LoomSection, FabricSection } from './day-entry-sections';
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
  const { setHeaderRight, setShowBackButton, setOnBackClick } = useProductionHeader();
  const isCreateMode = !defaultDate && !readOnly;

  const extruderRef = useRef<SectionRef>(null);
  const loomRef = useRef<SectionRef>(null);
  const fabricRef = useRef<SectionRef>(null);

  const [date, setDate] = useState<Date>(defaultDate ? parseISO(defaultDate) : new Date());
  const productionDate = format(date, 'yyyy-MM-dd');
  const [submitting, setSubmitting] = useState(false);

  const { data: lookupsData } = useLookups();
  const lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  useEffect(() => {
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
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );

    return () => {
      setHeaderRight(null);
      setShowBackButton(false);
      setOnBackClick(undefined);
    };
  }, [setHeaderRight, setShowBackButton, setOnBackClick, onClose, date, readOnly, submitting]);

  // Most recent entry before the selected date — used to carry forward
  // Data for calculating live stock balances in create mode
  const { data: allInvData } = useInventoryRecords('?limit=1000', isCreateMode);
  const { data: allExtruderData } = useExtruderProductions('?limit=1000', isCreateMode);
  const inventoryRecords = allInvData?.data ?? [];
  const extruderRecords = allExtruderData?.data ?? [];

  const getRawMaterialBalance = (name: string) => {
    const received = inventoryRecords.filter(r => r.type === 'RAW_MATERIAL' && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);
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


  const handleSaveDayEntry = async () => {
    setSubmitting(true);
    try {
      const results = await Promise.all([
        extruderRef.current?.saveDraft(),
        loomRef.current?.saveDraft(),
        fabricRef.current?.saveDraft()
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

        {isCreateMode && (
          <div className="rounded-xl border border-gray-400 bg-white shadow-sm mb-3">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 rounded-t-xl">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                Inventory Balances
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:divide-x divide-gray-200">
              <div className="flex flex-col gap-2 sm:pr-4">
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 border-b pb-2">Raw Material Balance</label>
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {lookups.brands.map((b) => (
                    <div key={b.id} className="flex justify-between items-center text-[12.5px]">
                      <span className="text-gray-700">{b.name}</span>
                      <span className="font-semibold text-gray-900">{getRawMaterialBalance(b.name)} kg</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:px-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 border-b pb-2">Chemical Balance</label>
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {lookups.chemicals.map((c) => (
                    <div key={c.id} className="flex justify-between items-center text-[12.5px]">
                      <span className="text-gray-700">{c.name}</span>
                      <span className="font-semibold text-gray-900">{getChemicalBalance(c.name)} kg</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:pl-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 border-b pb-2">Color Balance</label>
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
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
        )}

        {/* Forms Container */}
        <div className="flex flex-col gap-2.5">
          <ExtruderSection
            ref={extruderRef}
            productionDate={productionDate}
            autoAdd={!readOnly}
            readOnly={readOnly}
            hideExisting={isCreateMode}
          />
          <LoomSection ref={loomRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={isCreateMode} />
          <FabricSection ref={fabricRef} productionDate={productionDate} autoAdd={!readOnly} readOnly={readOnly} hideExisting={isCreateMode} />
        </div>

        {/* Footer */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-400">
          <p className="text-xs text-gray-500">All weights are in Kilograms (kg)</p>
          <div className="flex items-center gap-3">
            {readOnly ? (
              <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-700">
                Close
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-700" disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-500 text-white hover:bg-emerald-600 shadow"
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
