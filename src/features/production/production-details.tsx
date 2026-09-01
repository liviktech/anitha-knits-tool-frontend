import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useNavigate, useSearchParams, useLocation, Routes, Route, Outlet } from 'react-router-dom';
import { ExtruderEntry } from '@/features/extruder/extruder-entry';
import { LoomEntry } from '@/features/looms/loom-entry';
import { FabricEntry } from '@/features/fabric/fabric-entry';
import { DayDetails } from './day-details';
import { ProductionDesign2 } from './production-design-2';
import { NewEntry } from './new-entry';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductionHeaderContext } from './production-context';

function ProductionLayout() {
  const navigate = useNavigate();
  const [headerRight, setHeaderRight] = useState<ReactNode>(null);
  const [showBackButton, setShowBackButton] = useState(false);
  const [onBackClick, setOnBackClick] = useState<(() => void) | undefined>(undefined);
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      sessionStorage.removeItem('productionMonthFilter');
    };
  }, []);

  const ctxValue = useMemo(() => ({ setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle }), [setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle]);

  return (
    <ProductionHeaderContext.Provider value={ctxValue}>
      <div id="production-layout" className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
        <style>{`
          #production-layout, #production-layout * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
          #production-layout .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
        `}</style>

        {/* Unified Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (onBackClick ? onBackClick() : navigate('/production'))}
                className="h-8 w-8 text-gray-900 bg-white rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-[20px] font-bold text-black leading-tight px-2">{headerTitle || 'Daily Production & Wastage'}</h1>
              <p className="text-[12.5px] text-gray-500 font-medium px-2">Track daily production and wastage across all conversion processes</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {headerRight}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative flex flex-col">
          <Outlet />
        </div>
      </div>
    </ProductionHeaderContext.Provider>
  );
}

function ExtruderRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6 h-full overflow-y-auto">
      <ExtruderEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function LoomRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6 h-full overflow-y-auto">
      <LoomEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function FabricRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6 h-full overflow-y-auto">
      <FabricEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function DayDetailsRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6 h-full overflow-y-auto">
      <DayDetails onClose={() => navigate('/production')} />
    </div>
  );
}

function NewEntryRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || location.state?.editDate;
  const from = searchParams.get('from') || (location.state?.editDate ? 'details' : null);

  return (
    <div className="h-full overflow-y-auto">
      <NewEntry
        onClose={() => {
          if (date && from === 'details') {
            navigate('/production', { state: { selectedDate: date } });
          } else {
            navigate('/production');
          }
        }}
        defaultDate={date}
      />
    </div>
  );
}

export function ProductionDetails() {
  return (
    <Routes>
      <Route element={<ProductionLayout />}>
        <Route index element={<ProductionDesign2 />} />
        <Route path="extruder" element={<ExtruderRoute />} />
        <Route path="loom" element={<LoomRoute />} />
        <Route path="fabric" element={<FabricRoute />} />
        <Route path="day-details" element={<DayDetailsRoute />} />
        <Route path="new-entry" element={<NewEntryRoute />} />
      </Route>
    </Routes>
  );
}
