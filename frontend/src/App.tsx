import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BusinessGate } from './components/BusinessGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ActivityPage } from './pages/ActivityPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BusinessSetupPage } from './pages/BusinessSetupPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProductsPage } from './pages/ProductsPage';
import { SalesNewPage } from './pages/SalesNewPage';
import { SalesPage } from './pages/SalesPage';
import { BillingPage } from './pages/BillingPage';
import { BusinessSettingsPage } from './pages/BusinessSettingsPage';
import { TeamPage } from './pages/TeamPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PwaUpdateBanner />
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Authenticated but may not have a business yet */}
            <Route element={<ProtectedRoute />}>
              <Route path="/business-setup" element={<BusinessSetupPage />} />
            </Route>

            {/* Authenticated + business exists */}
            <Route element={<BusinessGate />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales/new" element={<SalesNewPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/settings" element={<BusinessSettingsPage />} />
              <Route path="/activity" element={<ActivityPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
