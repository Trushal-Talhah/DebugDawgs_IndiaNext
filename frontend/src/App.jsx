import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route, Outlet } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import PagePreloader from './components/shared/PagePreloader';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));

/* ── Protected route wrapper ── */
function PrivateRoute() {
  const { currentUser } = useAuth();
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
}

/* ── Redirect already-authenticated users away from auth pages ── */
function PublicRoute() {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <Routes>
        {/* Public landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth pages — redirect to dashboard if already logged in */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Protected app pages */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="analyze" element={<AnalyzePage />} />
            <Route path="incidents" element={<IncidentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      {/* Global page preloader — fires on every fresh page load */}
      <PagePreloader />
      <AppRoutes />
    </AuthProvider>
  );
}
