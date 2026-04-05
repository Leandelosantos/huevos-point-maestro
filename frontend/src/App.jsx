import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

// Lazy load de páginas protegidas
const BusinessesPage = lazy(() => import('./pages/BusinessesPage'));
const BusinessDetailPage = lazy(() => import('./pages/BusinessDetailPage'));
const TenantDetailPage = lazy(() => import('./pages/TenantDetailPage'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', color: '#666' }}>Cargando...</div>
  </div>
);

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas protegidas con layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <BusinessesPage />
                  </Suspense>
                }
              />
              <Route
                path="/businesses/:businessId"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <BusinessDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/tenants/:tenantId"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <TenantDetailPage />
                  </Suspense>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}