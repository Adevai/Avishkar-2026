import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// ── Route-level code splitting ──────────────────────────────────────────────
// Each page is its own chunk: the public landing page loads fast, and heavy
// dashboard code is only downloaded when a user actually signs in.
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const AuthLayout = lazy(() => import('./layouts/AuthLayout').then(m => ({ default: m.AuthLayout })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const DatabaseAdmin = lazy(() => import('./pages/DatabaseAdmin').then(m => ({ default: m.DatabaseAdmin })));

/** Minimal full-screen fallback while a chunk downloads. */
const RouteFallback: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
    <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
    <p className="text-xs font-semibold text-slate-500">Loading module…</p>
  </div>
);

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
            {/* Auth Routes mapped to AuthLayout */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Outflow / Onboarding */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Main Dashboard */}
            <Route path="/dashboard/*" element={<Dashboard />} />

            {/* Web Database Administration GUI (Like Django Admin) */}
            <Route path="/admin" element={<DatabaseAdmin />} />
            <Route path="/database" element={<DatabaseAdmin />} />

            {/* Public marketing site */}
            <Route path="/" element={<Landing />} />

            {/* Fallback: unknown routes go to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
