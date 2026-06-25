import { Routes, Route, Navigate } from 'react-router-dom';

// Public Layout
import { PublicLayout } from '../layouts/PublicLayout';

// Phase 3 Portal Layout & Guards
import { PortalWrapper } from '../shared/components/layout/PortalWrapper';
import { AuthGuard } from '../shared/components/layout/AuthGuard';
import { RoleGuard } from '../shared/components/layout/RoleGuard';
import { ForbiddenPage } from '../shared/components/ui/ForbiddenPage';
import { NotFoundPage } from '../shared/components/ui/NotFoundPage';
import { DashboardSkeleton } from '../shared/components/ui/DashboardSkeleton';

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

// Lazy load portal pages
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

// Student
const StudentDashboardPage = React.lazy(() => import('../pages/StudentDashboardPage').then(m => ({ default: m.StudentDashboardPage })));
const StudentAgentPage = React.lazy(() => import('../pages/student/StudentAgentPage'));
const StudentNoticesPage = React.lazy(() => import('../pages/student/StudentNoticesPage'));
const StudentProfile = React.lazy(() => import('../pages/student/StudentProfile'));

// Agent
const AgentDashboardPage = React.lazy(() => import('../pages/AgentDashboardPage').then(m => ({ default: m.AgentDashboardPage })));
const AgentDashboard = React.lazy(() => import('../pages/agent/AgentDashboard'));
const AgentStudents = React.lazy(() => import('../pages/agent/AgentStudents'));
const AgentTeamPage = React.lazy(() => import('../pages/agent/AgentTeamPage'));
const AgentCommissionsPage = React.lazy(() => import('../pages/agent/AgentCommissionsPage'));
const AgentApplicationsPage = React.lazy(() => import('../pages/agent/AgentApplicationsPage'));
const AgentNoticesPage = React.lazy(() => import('../pages/agent/AgentNoticesPage'));
const AgentProfilePage = React.lazy(() => import('../pages/agent/AgentProfilePage'));

// Admin
const AdminDashboardPage = React.lazy(() => import('../pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminNoticesPage = React.lazy(() => import('../pages/admin/AdminNoticesPage'));
const AdminAgentDetailPage = React.lazy(() => import('../pages/admin/AdminAgentDetailPage'));
const AdminCommissionsPage = React.lazy(() => import('../pages/admin/AdminCommissionsPage'));

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
      </Route>
        
      {/* ── Phase 3 CRM Portals ── */}
      <Route
        path="/portal"
        element={
          <AuthGuard>
            <PortalWrapper />
          </AuthGuard>
        }
      >
        {/* Student Portal */}
        <Route
          path="student"
          element={
            <RoleGuard allowedRoles={['student']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <Outlet />
              </Suspense>
            </RoleGuard>
          }
        >
          <Route index element={<StudentDashboardPage />} />
          <Route path="applications" element={<StudentDashboardPage />} />
          <Route path="documents" element={<StudentDashboardPage />} />
          <Route path="quiz" element={<StudentDashboardPage />} />
          <Route path="visa" element={<StudentDashboardPage />} />
          <Route path="agent" element={<StudentAgentPage />} />
          <Route path="notices" element={<StudentNoticesPage />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* Agent Portal */}
        <Route
          path="agent"
          element={
            <RoleGuard allowedRoles={['agent']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <Outlet />
              </Suspense>
            </RoleGuard>
          }
        >
          <Route index element={<AgentDashboard />} />
          <Route path="team" element={<AgentTeamPage />} />
          <Route path="students" element={<AgentStudents />} />
          <Route path="applications" element={<AgentApplicationsPage />} />
          <Route path="commissions" element={<AgentCommissionsPage />} />
          <Route path="notices" element={<AgentNoticesPage />} />
          <Route path="profile" element={<AgentProfilePage />} />
        </Route>

        {/* Admin Portal */}
        <Route
          path="admin"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <Outlet />
              </Suspense>
            </RoleGuard>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="universities" element={<AdminDashboardPage />} />
          <Route path="courses" element={<AdminDashboardPage />} />
          <Route path="intakes" element={<AdminDashboardPage />} />
          <Route path="students" element={<AdminDashboardPage />} />
          <Route path="agents" element={<AdminDashboardPage />} />
          <Route path="agents/:pid/tree" element={<AdminAgentDetailPage />} />
          <Route path="applications" element={<AdminDashboardPage />} />
          <Route path="commissions" element={<AdminCommissionsPage />} />
          <Route path="leads" element={<AdminDashboardPage />} />
          <Route path="notices" element={<AdminNoticesPage />} />
          <Route path="reports" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminDashboardPage />} />
          <Route path="roles" element={<AdminDashboardPage />} />
          <Route path="settings" element={<AdminDashboardPage />} />
          <Route path="logs" element={<AdminDashboardPage />} />
          <Route path="security" element={<AdminDashboardPage />} />
        </Route>

        {/* 403 Forbidden */}
        <Route path="403" element={<ForbiddenPage />} />
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
