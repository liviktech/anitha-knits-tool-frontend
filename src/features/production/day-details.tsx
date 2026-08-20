import { Button } from '@/components/ui/button';
import { useExtruderSummary } from '@/features/extruder/extruder-queries';
import { DaySummaryCards, ExtruderSection, LoomSection, FabricSection } from './day-entry-sections';

interface DayDetailsProps {
  onClose: () => void;
}

export function DayDetails({ onClose }: DayDetailsProps) {
  const { summary } = useExtruderSummary();
  const efficiency = summary.input > 0 ? (summary.output / summary.input) * 100 : 0;

  return (
    <div className="flex flex-col w-full mx-auto pb-10 bg-[#f8f9fc] min-h-screen p-6">
      {/* Header section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">1 Jul 2026</h1>
            <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-2xs font-semibold text-green-700 uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
              Day Closed
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Daily Production Overview</p>
        </div>
      </div>

      <DaySummaryCards
        dnPlusKg={summary.output.toFixed(2)}
        wasteKg={summary.wastage.toFixed(2)}
        efficiencyPct={efficiency.toFixed(2)}
        checkedKg="1,805.00"
      />

      {/* Forms Container */}
      <div className="flex flex-col gap-6">
        <ExtruderSection />
        <LoomSection />
        <FabricSection />
      </div>

      {/* Footer */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-100">
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
    </div>
  );
}
