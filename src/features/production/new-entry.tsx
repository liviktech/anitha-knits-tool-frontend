import { useEffect, useMemo, useRef, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from '@/components/shared/loader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExtruderSection, LoomSection, FabricSection } from './day-entry-sections';
import type { SectionRef } from './day-entry-sections';
import { useExtruderProductions, useLookups, type ExtruderProductionItem } from '@/features/extruder/extruder-queries';

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

  const [rawMaterial, setRawMaterial] = useState('');
  const [chemical, setChemical] = useState('');
  const [color, setColor] = useState('');
  // Stops re-syncing to the previous day's values the moment the user picks
  // any of the three themselves, same convention as the per-row Inventory
  // sync in day-entry-sections.tsx.
  const [topFieldsManuallyEdited, setTopFieldsManuallyEdited] = useState(false);

  useEffect(() => {
    if (!isCreateMode || topFieldsManuallyEdited || !latestPreviousEntry) return;
    setRawMaterial(latestPreviousEntry.extruder?.brand?.name ?? '');
    setChemical(latestPreviousEntry.extruder?.chemical?.name ?? '');
    setColor(latestPreviousEntry.color?.name ?? '');
  }, [isCreateMode, topFieldsManuallyEdited, latestPreviousEntry]);

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl sm:max-w-6xl bg-[#f8f9fc] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex-col items-start gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
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
              <DialogTitle className="sr-only">
                {readOnly ? 'View' : defaultDate ? 'Edit' : 'Add'} production entry for {format(date, 'd MMM yyyy')}
              </DialogTitle>
              <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-2xs font-semibold text-green-700 uppercase tracking-wider">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                {readOnly ? 'View Only' : 'Day Closed'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Daily Production Overview</p>
          </div>
        </DialogHeader>

        {isCreateMode && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6 mt-4">
            <div className="flex flex-col gap-1 rounded-xl border bg-white p-3 shadow-sm">
              <label className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Raw Material</label>
              <Select
                value={rawMaterial || undefined}
                onValueChange={(value) => { setTopFieldsManuallyEdited(true); setRawMaterial(value); }}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Select raw material" /></SelectTrigger>
                <SelectContent>
                  {lookups.brands.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border bg-white p-3 shadow-sm">
              <label className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Chemical</label>
              <Select
                value={chemical || undefined}
                onValueChange={(value) => { setTopFieldsManuallyEdited(true); setChemical(value); }}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Select chemical" /></SelectTrigger>
                <SelectContent>
                  {lookups.chemicals.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border bg-white p-3 shadow-sm">
              <label className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Color</label>
              <Select
                value={color || undefined}
                onValueChange={(value) => { setTopFieldsManuallyEdited(true); setColor(value); }}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Select color" /></SelectTrigger>
                <SelectContent>
                  {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
            defaultColorName={color}
            defaultChemicalName={chemical}
            defaultBrandName={rawMaterial}
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
      </DialogContent>
    </Dialog>
  );
}
