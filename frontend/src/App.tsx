import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ContentRequestListPage } from './pages/content-requests/ContentRequestListPage';
import { ContentRequestCreatePage } from './pages/content-requests/ContentRequestCreatePage';
import { ContentRequestDetailPage } from './pages/content-requests/ContentRequestDetailPage';
import { CreativeListPage } from './pages/creatives/CreativeListPage';
import { ApprovalListPage } from './pages/approvals/ApprovalListPage';
import { PublishListPage } from './pages/publish/PublishListPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/forgot-password"
              element={
                <PlaceholderPage
                  title="Forgot Password"
                  description="Password reset will be available once the auth module is complete."
                />
              }
            />

            {/* Protected routes with layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Posters */}
              <Route path="/posters" element={<ContentRequestListPage />} />
              <Route path="/posters/new" element={<ContentRequestCreatePage />} />
              <Route path="/posters/:id" element={<ContentRequestDetailPage />} />

              {/* Creatives */}
              <Route path="/creatives" element={<CreativeListPage />} />
              <Route path="/creatives/:id" element={<PlaceholderPage title="Creative Detail" />} />

              {/* Approvals */}
              <Route path="/approvals" element={<ApprovalListPage />} />

              {/* Publishing */}
              <Route path="/publish" element={<PublishListPage />} />

              {/* Analytics */}
              <Route path="/analytics" element={<AnalyticsPage />} />

              {/* Admin */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              {/* Settings & Profile */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="*"
              element={
                <PlaceholderPage
                  title="404 - Not Found"
                  description="The page you're looking for doesn't exist."
                />
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
