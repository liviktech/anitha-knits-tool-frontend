import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardDesign } from './dashboard-design';

export function DashboardModule() {
  return (
    <Routes>
      <Route index element={<Navigate to="design" replace />} />
      <Route path="design" element={<DashboardDesign />} />
    </Routes>
  );
}
