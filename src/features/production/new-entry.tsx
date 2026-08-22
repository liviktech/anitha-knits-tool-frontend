import { useEffect, useMemo, useRef, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from '@/components/shared/loader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExtruderSection, LoomSection, FabricSection } from './day-entry-sections';
import type { SectionRef } from './day-entry-sections';
import { useExtruderProductions, useLookups, type ExtruderProductionItem } from '@/features/extruder/extruder-queries';
import { useInventoryRecords } from '@/features/inventory/inventory-queries';

interface NewEntryProps {
  onClose: () => void;
  defaultDate?: string | null;
  /** View-only: shows the day's existing records with no editing controls. */
  readOnly?: boolean;
}

export function NewEntry({ onClose, defaultDate, readOnly = false }: NewEntryProps) {
  // Opened via "Add New Entry" (no date pre-selected) — a pure create flow that
  // always starts blank, even if the selected date already has records, as
  // opposed to Edit/View which load and display that day's existing data.
  const isCreateMode = !defaultDate && !readOnly;

  const extruderRef = useRef<SectionRef>(null);
  const loomRef = useRef<SectionRef>(null);
  const fabricRef = useRef<SectionRef>(null);

  const [date, setDate] = useState<Date>(defaultDate ? new Date(defaultDate) : new Date());
  const productionDate = format(date, 'yyyy-MM-dd');
  const [submitting, setSubmitting] = useState(false);

  const { data: lookupsData } = useLookups();
  const lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  // Most recent entry before the selected date — used to carry forward
  // Raw Material/Chemical/Color as defaults for a brand-new day, so the
  // user isn't re-picking the same batch info every time.
  const previousDayQuery = useMemo(
    () => `?date_to=${format(subDays(date, 1), 'yyyy-MM-dd')}&limit=100`,
    [date],
  );
  const { data: previousExtruderData } = useExtruderProductions(previousDayQuery, isCreateMode);
  const latestPreviousEntry = useMemo(() => {
    const items = previousExtruderData?.data ?? [];
    return items.reduce<ExtruderProductionItem | null>(
      (latest, item) => (!latest || item.productionDate > latest.productionDate ? item : latest),
      null,
    );
  }, [previousExtruderData]);

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
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Header Area */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-white rounded-full bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-[22px] font-bold text-black leading-tight px-2">Daily Production & Wastage</h1>
            <p className="text-[12.5px] text-gray-500 font-medium mt-1 px-2">Track daily production and wastage across all conversion processes</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex-col items-start gap-3 text-left sm:flex-row sm:flex sm:items-center sm:justify-between mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
            <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={readOnly || submitting}
                    className="h-auto gap-2 border-gray-200 px-3 py-1.5 text-2xl font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-100"
                  >
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    {format(date, 'd MMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(value) => value && setDate(value)}
                    autoFocus
                  />
                </PopoverContent>
            </Popover>
            <h2 className="sr-only">
              {readOnly ? 'View' : defaultDate ? 'Edit' : 'Add'} production entry for {format(date, 'd MMM yyyy')}
            </h2>
            <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-2xs font-semibold text-green-700 uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
              {readOnly ? 'View Only' : 'Day Closed'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Daily Production Overview</p>
        </div>
      </div>

        {isCreateMode && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6 mt-4">
            <div className="flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm">
              <label className="text-2xs font-semibold uppercase tracking-wide text-gray-500 border-b pb-2">Raw Material Balance</label>
              <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                {lookups.brands.map((b) => (
                  <div key={b.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{b.name}</span>
                    <span className="font-semibold text-gray-900">{getRawMaterialBalance(b.name)} kg</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm">
              <label className="text-2xs font-semibold uppercase tracking-wide text-gray-500 border-b pb-2">Chemical Balance</label>
              <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                {lookups.chemicals.map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{c.name}</span>
                    <span className="font-semibold text-gray-900">{getChemicalBalance(c.name)} kg</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm">
              <label className="text-2xs font-semibold uppercase tracking-wide text-gray-500 border-b pb-2">Color Balance</label>
              <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                {lookups.colors.map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{c.name}</span>
                    <span className="font-semibold text-gray-900">{getColorBalance(c.name)} kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Forms Container */}
        <div className="flex flex-col gap-6">
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
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-100">
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
