import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import NotFound from '@/pages/NotFound';

// The tenant workspace. Served on the canonical app host, on a company
// subdomain alias, on a customer's own domain, and on localhost — all
// equivalent, because the company always comes from the signed-in user's
// profile and never from the URL (see CompanyContext).
const StartTrial = lazy(() => import('@/pages/StartTrial'));
const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/pages/Auth'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const SuperadminDashboard = lazy(() => import('@/pages/dashboards/SuperadminDashboard'));
const GMDashboard = lazy(() => import('@/pages/dashboards/GMDashboard'));
const SupervisorDashboard = lazy(() => import('@/pages/dashboards/SupervisorDashboard'));
const EngineerDashboard = lazy(() => import('@/pages/dashboards/EngineerDashboard'));
const EngineerProjectDetail = lazy(() => import('@/pages/engineer/EngineerProjectDetail'));
const NewProject = lazy(() => import('@/pages/projects/NewProject'));
const ProjectDetail = lazy(() => import('@/pages/projects/ProjectDetail'));
const EditProject = lazy(() => import('@/pages/projects/EditProject'));
const Profile = lazy(() => import('@/pages/Profile'));
const BillingSettingsPage = lazy(() => import('@/pages/settings/BillingSettingsPage'));
const WorkspaceSettingsPage = lazy(() => import('@/pages/settings/WorkspaceSettingsPage'));
const ReportsList = lazy(() => import('@/pages/reports/ReportsList'));
const ReportProjectDetail = lazy(() => import('@/pages/reports/ReportProjectDetail'));

export default function TenantApp() {
  return (
    <CompanyProvider>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* Signup lives on the app host, not the marketing site: the session
              it creates (especially via Google OAuth) has to be on the same
              origin as the workspace the user lands in. */}
          <Route path="/start-trial" element={<StartTrial />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/superadmin" element={<ProtectedRoute requiredRole="SUPERADMIN"><SuperadminDashboard /></ProtectedRoute>} />
          <Route path="/gm" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN']}><GMDashboard /></ProtectedRoute>} />
          <Route path="/projects/new" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN']}><NewProject /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
          <Route path="/projects/:id/edit" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN']}><EditProject /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings/billing" element={<ProtectedRoute requiredRole="SUPERADMIN"><BillingSettingsPage /></ProtectedRoute>} />
          <Route path="/settings/workspace" element={<ProtectedRoute requiredRole="SUPERADMIN"><WorkspaceSettingsPage /></ProtectedRoute>} />
          <Route path="/supervisor" element={<ProtectedRoute requiredRole="SUPERVISOR"><SupervisorDashboard /></ProtectedRoute>} />
          <Route path="/engineer" element={<ProtectedRoute requiredRole="ENGINEER"><EngineerDashboard /></ProtectedRoute>} />
          <Route path="/engineer/projects/:id" element={<ProtectedRoute requiredRole="ENGINEER"><EngineerProjectDetail /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN', 'SUPERVISOR']}><ReportsList /></ProtectedRoute>} />
          <Route path="/reports/:id" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN', 'SUPERVISOR']}><ReportProjectDetail /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </CompanyProvider>
  );
}
