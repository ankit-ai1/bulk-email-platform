import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/shared/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CampaignsPage from './pages/CampaignsPage'
import ContactsPage from './pages/ContactsPage'
import TemplatesPage from './pages/TemplatesPage'
import LogsPage from './pages/LogsPage'
import SettingsPage from './pages/SettingsPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import AntiSpamPolicyPage from './pages/AntiSpamPolicyPage'
import AcceptableUsePolicyPage from './pages/AcceptableUsePolicyPage'
import ContactPage from './pages/ContactPage'
import AboutPage from './pages/AboutPage'
import LandingPage from './pages/LandingPage'
import PricingPage from './pages/PricingPage'
import ApplyPage from './pages/ApplyPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <LandingPage />
  return children
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary)', flexDirection: 'column', gap: '16px'
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px',
        background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', animation: 'pulse 1.5s ease infinite'
      }}>✉</div>
      <div className="spinner" style={{ width: '24px', height: '24px' }} />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/confirm-email" element={<ConfirmEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/anti-spam-policy" element={<AntiSpamPolicyPage />} />
      <Route path="/acceptable-use-policy" element={<AcceptableUsePolicyPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              borderRadius: '10px',
            },
            success: { iconTheme: { primary: '#43e97b', secondary: 'white' } },
            error: { iconTheme: { primary: '#ff6584', secondary: 'white' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}
