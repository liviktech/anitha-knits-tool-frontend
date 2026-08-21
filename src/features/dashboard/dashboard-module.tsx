import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardDesign2 } from './dashboard-design-2';

export function DashboardModule() {
  return (
    <Routes>
      <Route index element={<Navigate to="design-2" replace />} />
      <Route path="design-2" element={<DashboardDesign2 />} />
    </Routes>
  );
}
