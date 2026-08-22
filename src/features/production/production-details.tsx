import { useNavigate, Routes, Route } from 'react-router-dom';
import { ExtruderEntry } from '@/features/extruder/extruder-entry';
import { LoomEntry } from '@/features/looms/loom-entry';
import { FabricEntry } from '@/features/fabric/fabric-entry';
import { DayDetails } from './day-details';
import { ProductionDesign2 } from './production-design-2';

function ExtruderRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <ExtruderEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function LoomRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <LoomEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function FabricRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <FabricEntry onClose={() => navigate('/production')} />
    </div>
  );
}

function DayDetailsRoute() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <DayDetails onClose={() => navigate('/production')} />
    </div>
  );
}

export function ProductionDetails() {
  return (
    <Routes>
      <Route index element={<ProductionDesign2 />} />
      <Route path="extruder" element={<ExtruderRoute />} />
      <Route path="loom" element={<LoomRoute />} />
      <Route path="fabric" element={<FabricRoute />} />
      <Route path="day-details" element={<DayDetailsRoute />} />
    </Routes>
  );
}
