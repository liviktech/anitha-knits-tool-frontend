import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useExtruderSummary } from '@/features/extruder/extruder-queries';
import { DaySummaryCards, ExtruderSection, LoomSection, FabricSection } from './day-entry-sections';

interface NewEntryProps {
  onClose: () => void;
}

export function NewEntry({ onClose }: NewEntryProps) {
  const { summary } = useExtruderSummary();
  const efficiency = summary.input > 0 ? (summary.output / summary.input) * 100 : 0;

  const [date, setDate] = useState<Date>(new Date());
  const productionDate = format(date, 'yyyy-MM-dd');

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
                    className="h-auto gap-2 border-gray-200 px-3 py-1.5 text-2xl font-bold text-gray-900 hover:bg-gray-50"
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
              <DialogTitle className="sr-only">Add production entry for {format(date, 'd MMM yyyy')}</DialogTitle>
              <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-2xs font-semibold text-green-700 uppercase tracking-wider">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                Day Closed
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Daily Production Overview</p>
          </div>
        </DialogHeader>

        <DaySummaryCards
          dnPlusKg={summary.output.toFixed(2)}
          wasteKg={summary.wastage.toFixed(2)}
          efficiencyPct={efficiency.toFixed(2)}
          checkedKg="1,805.00"
        />

        {/* Forms Container */}
        <div className="flex flex-col gap-6">
          <ExtruderSection productionDate={productionDate} />
          <LoomSection productionDate={productionDate} />
          <FabricSection productionDate={productionDate} />
        </div>

        {/* Footer */}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">All weights are in Kilograms (kg)</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button className="bg-emerald-500 text-white hover:bg-emerald-600 shadow">
              Save day entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
