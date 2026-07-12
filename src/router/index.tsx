import { Routes, Route } from 'react-router-dom';

// Public Layout
import { PublicLayout } from '../layouts/PublicLayout';

// Phase 3 Portal Layout & Guards
import { PortalWrapper } from '../shared/components/layout/PortalWrapper';
import { AuthGuard } from '../shared/components/layout/AuthGuard';
import { RoleGuard } from '../shared/components/layout/RoleGuard';
import { PageGuard } from '../shared/components/layout/PageGuard';
import { ForbiddenPage } from '../shared/components/ui/ForbiddenPage';
import { DashboardSkeleton } from '../shared/components/ui/DashboardSkeleton';

// Public Pages
import { HomePage } from '../pages/HomePage';
import { ContactPage } from '../pages/ContactPage';
import { ApplyPage } from '../pages/ApplyPage';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import AdminLoginPage from '../pages/admin/AdminLoginPage';

// Lazy load portal pages
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

// Student
const StudentOverviewPage = React.lazy(() => import('../pages/student/StudentOverviewPage'));
const StudentAgentPage = React.lazy(() => import('../pages/student/StudentAgentPage'));
const StudentNoticesPage = React.lazy(() => import('../pages/student/StudentNoticesPage'));
const StudentProfile = React.lazy(() => import('../pages/student/StudentProfile'));
const StudentApplications = React.lazy(() => import('../pages/student/StudentApplications'));
const StudentDocuments = React.lazy(() => import('../pages/student/StudentDocuments'));
const StudentUniversitiesPage = React.lazy(() => import('../pages/student/StudentUniversitiesPage'));
const StudentAdditionalInfoPage = React.lazy(() => import('../pages/student/StudentAdditionalInfoPage'));
const CompleteApplicationDetailsPage = React.lazy(() => import('../pages/student/CompleteApplicationDetailsPage'));

// Agent
const AgentDashboard = React.lazy(() => import('../pages/agent/AgentDashboard'));
const AgentStudents = React.lazy(() => import('../pages/agent/AgentStudents'));
const AgentStudentDetailPage = React.lazy(() => import('../pages/agent/AgentStudentDetailPage'));
const AgentTeamPage = React.lazy(() => import('../pages/agent/AgentTeamPage'));
const AgentCommissionsPage = React.lazy(() => import('../pages/agent/AgentCommissionsPage'));
const AgentApplicationsPage = React.lazy(() => import('../pages/agent/AgentApplicationsPage'));
const AgentUniversitiesPage = React.lazy(() => import('../pages/agent/AgentUniversitiesPage'));
const AgentNoticesPage = React.lazy(() => import('../pages/agent/AgentNoticesPage'));
const AgentProfilePage = React.lazy(() => import('../pages/agent/AgentProfilePage'));
const AgentCreateStudentPage = React.lazy(() => import('../pages/agent/AgentCreateStudentPage'));
const AgentCompleteApplicationDetailsPage = React.lazy(() => import('../pages/agent/AgentCompleteApplicationDetailsPage'));
const AgentOnboardingPage = React.lazy(() => import('../pages/agent/AgentOnboardingPage'));
const AgentInfoPage = React.lazy(() => import('../pages/agent/AgentInfoPage'));
const AgentPendingPage = React.lazy(() => import('../pages/agent/AgentPendingPage'));
const AgentRejectedPage = React.lazy(() => import('../pages/agent/AgentRejectedPage'));
const AgentLogsPage = React.lazy(() => import('../pages/agent/AgentLogsPage'));

// Admin
const AdminDashboardPage = React.lazy(() => import('../pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminAgentsPage = React.lazy(() => import('../pages/admin/AdminAgentsPage'));
const AdminNoticesPage = React.lazy(() => import('../pages/admin/AdminNoticesPage'));
const AdminAgentDetailPage = React.lazy(() => import('../pages/admin/AdminAgentDetailPage'));
const AdminCommissionsPage = React.lazy(() => import('../pages/admin/AdminCommissionsPage'));
const AdminReportsPage = React.lazy(() => import('../pages/admin/AdminReportsPage'));
const AdminUniversitiesPage = React.lazy(() => import('../pages/admin/AdminUniversitiesPage'));
const AdminUniversityDetailPage = React.lazy(() => import('../pages/admin/AdminUniversityDetailPage'));
const AdminCoursesPage = React.lazy(() => import('../pages/admin/AdminCoursesPage'));
const AdminIntakesPage = React.lazy(() => import('../pages/admin/AdminIntakesPage'));
const AdminApplicationsPage = React.lazy(() => import('../pages/admin/AdminApplicationsPage'));
const AdminUsersPage = React.lazy(() => import('../pages/admin/AdminUsers'));
const AdminStudentsPage = React.lazy(() => import('../pages/admin/AdminStudentsPage'));
const AdminStudentDetailPage = React.lazy(() => import('../pages/admin/AdminStudentDetailPage'));
const AdminSettingsPage = React.lazy(() => import('../pages/admin/AdminSettingsPage'));
const AdminLogsPage = React.lazy(() => import('../pages/admin/AdminLogsPage'));
const AdminSuperLogsPage = React.lazy(() => import('../pages/admin/AdminSuperLogsPage'));
const AdminLeadsPage = React.lazy(() => import('../pages/admin/AdminLeadsPage'));
const AdminReassignmentsPage = React.lazy(() => import('../pages/admin/AdminReassignmentsPage'));
const AdminSecurityPage = React.lazy(() => import('../pages/admin/AdminSecurityPage'));
const AdminProfilePage = React.lazy(() => import('../pages/admin/AdminProfilePage'));

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/portal/login" element={<LoginPage />} />
        <Route path="/portal/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/portal/register" element={<ApplyPage />} />
      </Route>

      <Route path="/portal/admin/login" element={<AdminLoginPage />} />

      <Route
        path="/portal"
        element={
          <AuthGuard>
            <PortalWrapper />
          </AuthGuard>
        }
      >
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
          <Route index element={<StudentOverviewPage />} />
          <Route path="applications" element={<StudentApplications />} />
          <Route path="documents" element={<StudentDocuments />} />
          <Route path="universities" element={<StudentUniversitiesPage />} />
          <Route path="agent" element={<StudentAgentPage />} />
          <Route path="notices" element={<StudentNoticesPage />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="profile/complete" element={<CompleteApplicationDetailsPage />} />
          <Route path="applications/:pid/complete" element={<CompleteApplicationDetailsPage />} />
          <Route path="additional-info" element={<StudentAdditionalInfoPage />} />
        </Route>

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
          <Route path="onboarding" element={<AgentOnboardingPage />} />
          <Route path="info" element={<AgentInfoPage />} />
          <Route path="pending" element={<AgentPendingPage />} />
          <Route path="rejected" element={<AgentRejectedPage />} />
          <Route path="team" element={<AgentTeamPage />} />
          <Route path="students" element={<AgentStudents />} />
          <Route path="students/new" element={<AgentCreateStudentPage />} />
          <Route path="students/:studentPid/applications/:applicationPid/complete" element={<AgentCompleteApplicationDetailsPage />} />
          <Route path="students/:pid" element={<AgentStudentDetailPage />} />
          <Route path="applications" element={<AgentApplicationsPage />} />
          <Route path="universities" element={<AgentUniversitiesPage />} />
          <Route path="commissions" element={<AgentCommissionsPage />} />
          <Route path="notices" element={<AgentNoticesPage />} />
          <Route path="activity-logs" element={<AgentLogsPage />} />
          <Route path="profile" element={<AgentProfilePage />} />
        </Route>

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
          <Route path="universities" element={<PageGuard permission="universities.view"><AdminUniversitiesPage /></PageGuard>} />
          <Route path="universities/:pid" element={<PageGuard permission="universities.view"><AdminUniversityDetailPage /></PageGuard>} />
          <Route path="courses" element={<PageGuard permission="courses.view"><AdminCoursesPage /></PageGuard>} />
          <Route path="intakes" element={<PageGuard permission="intakes.view"><AdminIntakesPage /></PageGuard>} />
          <Route path="students" element={<PageGuard permission="students.view"><AdminStudentsPage /></PageGuard>} />
          <Route path="students/:pid" element={<PageGuard permission="students.view"><AdminStudentDetailPage /></PageGuard>} />
          <Route path="reassignments" element={<PageGuard permission="students.approve"><AdminReassignmentsPage /></PageGuard>} />
          <Route path="agents" element={<PageGuard permission="agents.view"><AdminAgentsPage /></PageGuard>} />
          <Route path="agents/:pid/tree" element={<PageGuard permission="agents.view"><AdminAgentDetailPage /></PageGuard>} />
          <Route path="applications" element={<PageGuard permission="applications.view"><AdminApplicationsPage /></PageGuard>} />
          <Route path="commissions" element={<PageGuard permission="commissions.view"><AdminCommissionsPage /></PageGuard>} />
          <Route path="leads" element={<PageGuard permission="leads.view"><AdminLeadsPage /></PageGuard>} />
          <Route path="notices" element={<PageGuard permission="notices.view"><AdminNoticesPage /></PageGuard>} />
          <Route path="reports" element={<PageGuard permission="reports.view"><AdminReportsPage /></PageGuard>} />
          <Route path="users" element={<PageGuard permission="user_management.view"><AdminUsersPage /></PageGuard>} />
          <Route path="settings" element={<PageGuard permission="system_settings.view"><AdminSettingsPage /></PageGuard>} />
          <Route path="profile" element={<PageGuard><AdminProfilePage /></PageGuard>} />
          <Route path="logs" element={<PageGuard><AdminLogsPage /></PageGuard>} />
          <Route path="super-logs" element={<PageGuard permission="activity_logs.view_all"><AdminSuperLogsPage /></PageGuard>} />
          <Route path="security" element={<PageGuard permission="security_events.view"><AdminSecurityPage /></PageGuard>} />
        </Route>

        <Route path="403" element={<ForbiddenPage />} />
      </Route>

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
