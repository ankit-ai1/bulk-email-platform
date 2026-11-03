import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/shared/Layout'
import AccountGate from './components/shared/AccountGate'
import { ConfirmProvider, Empty } from './components/ui'
import LoginPage from './pages/LoginPage'
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

const FeaturesPage = lazy(() => import('./pages/FeaturesPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage'))
const ContactsPage = lazy(() => import('./pages/ContactsPage'))
const CrmPage = lazy(() => import('./pages/CrmPage'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const LogsPage = lazy(() => import('./pages/LogsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const AutomationsPage = lazy(() => import('./pages/AutomationsPage'))
const InboxPage = lazy(() => import('./pages/InboxPage'))
const named = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })))
const adminPages = () => import('./pages/admin/AdminPages')
const orgPages = () => import('./pages/OrganizationPages')
const supportPages = () => import('./pages/SupportPages')
const CompaniesPage = named(adminPages, 'CompaniesPage')
const CompanyDetailPage = named(adminPages, 'CompanyDetailPage')
const PlansPage = named(adminPages, 'PlansPage')
const RequestsPage = named(adminPages, 'RequestsPage')
const InvoicesPage = named(adminPages, 'InvoicesPage')
const ApplicationsPage = named(adminPages, 'ApplicationsPage')
const AuditPage = named(adminPages, 'AuditPage')
const EnquiriesPage = named(adminPages, 'EnquiriesPage')
const InfrastructurePage = named(orgPages, 'InfrastructurePage')
const TeamPage = named(orgPages, 'TeamPage')
const UsagePage = named(orgPages, 'UsagePage')
const OrganizationPage = named(orgPages, 'OrganizationPage')
const SupportPage = named(supportPages, 'SupportPage')
const TicketDetailPage = named(supportPages, 'TicketDetailPage')

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <LandingPage />
  return <AccountGate>{children}</AccountGate>
}

/** Hides pages a role can't use. The real enforcement is RLS and the worker. */
function Allow({ when, children }) {
  const auth = useAuth()
  if (!when(auth)) return <Empty title="You don't have access to this page" description="Ask your administrator if you need it." />
  return children
}
const isSuper = a => a.isSuperAdmin
const isAdmin = a => a.isClientAdmin
const perm = (p, feature) => a => a.can(p) && (!feature || a.hasFeature(feature))
const adminOrSuper = a => a.isClientAdmin || a.isSuperAdmin
const support = a => a.isSuperAdmin || a.can('support')

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="spinner" style={{ width: '28px', height: '28px' }} />
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
  const guarded = (when, element) => <Allow when={when}>{element}</Allow>
  return (
    <Suspense fallback={<LoadingScreen />}>
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
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />

          <Route path="campaigns" element={guarded(perm('campaigns'), <CampaignsPage />)} />
          <Route path="calendar" element={guarded(perm('campaigns'), <CalendarPage />)} />
          <Route path="campaigns/:id" element={guarded(perm('campaigns'), <CampaignDetailPage />)} />
          <Route path="contacts" element={guarded(perm('contacts'), <ContactsPage />)} />
          <Route path="crm" element={guarded(perm('contacts'), <CrmPage />)} />
          <Route path="templates" element={guarded(perm('templates'), <TemplatesPage />)} />
          <Route path="logs" element={guarded(perm('analytics'), <LogsPage />)} />
          <Route path="analytics" element={guarded(perm('analytics'), <AnalyticsPage />)} />
          <Route path="automations" element={guarded(perm('automation', 'automation'), <AutomationsPage />)} />
          <Route path="inbox" element={guarded(perm('inbox', 'inbox'), <InboxPage />)} />

          <Route path="infrastructure" element={guarded(isAdmin, <InfrastructurePage />)} />
          <Route path="team" element={guarded(isAdmin, <TeamPage />)} />
          <Route path="usage" element={guarded(isAdmin, <UsagePage />)} />
          <Route path="organization" element={guarded(isAdmin, <OrganizationPage />)} />
          <Route path="audit" element={guarded(adminOrSuper, <AuditPage />)} />
          <Route path="support" element={guarded(support, <SupportPage />)} />
          <Route path="support/:id" element={guarded(support, <TicketDetailPage />)} />

          <Route path="admin/companies" element={guarded(isSuper, <CompaniesPage />)} />
          <Route path="admin/companies/:id" element={guarded(isSuper, <CompanyDetailPage />)} />
          <Route path="admin/plans" element={guarded(isSuper, <PlansPage />)} />
          <Route path="admin/requests" element={guarded(isSuper, <RequestsPage />)} />
          <Route path="admin/invoices" element={guarded(isSuper, <InvoicesPage />)} />
          <Route path="admin/enquiries" element={guarded(isSuper, <EnquiriesPage />)} />
          <Route path="admin/applications" element={guarded(isSuper, <ApplicationsPage />)} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ConfirmProvider>
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
      </ConfirmProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
