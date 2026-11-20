import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Platform admin at admin.optimustesting.com. No CompanyProvider and no
// AuthProvider: there is no Supabase Auth session here at all, the single
// credential is the platform token typed at login (see platformToken.ts).
const PlatformLogin = lazy(() => import('@/pages/PlatformAdmin').then(m => ({ default: m.PlatformLogin })));
const PlatformDashboard = lazy(() => import('@/pages/PlatformAdmin').then(m => ({ default: m.PlatformDashboard })));

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/" element={<PlatformLogin />} />
      <Route path="/admin" element={<PlatformDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
