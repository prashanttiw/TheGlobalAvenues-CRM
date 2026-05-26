import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { AgentLayout } from '../layouts/AgentLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Public Pages
import { HomePage } from '../pages/HomePage';
import { DestinationsPage } from '../pages/DestinationsPage';
import { CountryDetailPage } from '../pages/CountryDetailPage';
import { CoursesPage } from '../pages/CoursesPage';
import { CourseCategoryPage } from '../pages/CourseCategoryPage';
import { PartnersPage } from '../pages/PartnersPage';
import { AboutPage } from '../pages/AboutPage';
import { ContactPage } from '../pages/ContactPage';
import { ApplyPage } from '../pages/ApplyPage';
import { ServicesPage } from '../pages/ServicesPage';
import { LoginPage } from '../pages/LoginPage';

// Dashboard Pages
import { StudentDashboardPage } from '../pages/StudentDashboardPage';
import { AgentDashboardPage } from '../pages/AgentDashboardPage';

// Admin Pages (Placeholder/Dynamic imports inside App.tsx / Router)
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';

export function AppRouter() {
  return (
    <Routes>
      {/* ── Public Marketing Pages ── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/destinations" element={<DestinationsPage />} />
        <Route path="/destinations/:slug" element={<CountryDetailPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:category" element={<CourseCategoryPage />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:service" element={<ServicesPage />} />
        
        {/* Auth Entrypoints */}
        <Route path="/portal/login" element={<LoginPage />} />
        <Route path="/portal/register" element={<ApplyPage />} />
        
        {/* Student B2C Portal (Nested under Public Header/Footer for cohesive flow) */}
        <Route path="/portal/student" element={<StudentDashboardPage />} />
      </Route>

      {/* ── B2B Agent Portal (Dashboard layout) ── */}
      <Route element={<AgentLayout />}>
        <Route path="/portal/agent" element={<AgentDashboardPage />} />
        {/* We will route subroutes directly to the AgentDashboardPage or custom pages */}
        <Route path="/portal/agent/leads" element={<AgentDashboardPage />} />
        <Route path="/portal/agent/pipeline" element={<AgentDashboardPage />} />
        <Route path="/portal/agent/commissions" element={<AgentDashboardPage />} />
      </Route>

      {/* ── CRM Admin Panel (Admin layout) ── */}
      <Route element={<AdminLayout />}>
        <Route path="/portal/admin" element={<AdminDashboardPage />} />
        <Route path="/portal/admin/pipeline" element={<AdminDashboardPage />} />
        <Route path="/portal/admin/users" element={<AdminDashboardPage />} />
        <Route path="/portal/admin/universities" element={<AdminDashboardPage />} />
      </Route>

      {/* 404 / Catch-all */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center pt-24 bg-[#FFFCF5]">
          <div className="text-center">
            <div className="text-8xl font-black text-[#FD7E14]/20 mb-4">404</div>
            <h1 className="text-3xl font-bold text-[#333] mb-2">Page Not Found</h1>
            <p className="text-[#666] mb-6">The page you're looking for doesn't exist.</p>
            <a href="/" className="px-6 py-3 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-lg">
              Go Home
            </a>
          </div>
        </div>
      } />
    </Routes>
  );
}
