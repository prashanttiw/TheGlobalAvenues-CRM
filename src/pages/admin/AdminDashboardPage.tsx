import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileSearch,
  GraduationCap,
  Shield,
  UserCog,
  Users2,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useStore } from '../../hooks/useStore';
import {
  AdminApplicationDetail,
  AdminDashboardStats,
  AdminDocumentQueueItem,
  AdminPipelineItem,
  AdminProgramRecord,
  AdminUniversityRecord,
  AdminUserDetail,
  AdminUserSummary,
  AuditLogEntry,
  approveAdminAgent,
  createAdminProgram,
  createAdminUniversity,
  deleteAdminProgram,
  deleteAdminUniversity,
  fetchAdminAgents,
  fetchAdminApplicationDetail,
  fetchAdminAuditLog,
  fetchAdminDashboardStats,
  fetchAdminDocumentQueue,
  fetchAdminPipeline,
  fetchAdminPrograms,
  fetchAdminUniversities,
  fetchAdminUserDetail,
  fetchAdminUsers,
  reviewAdminDocument,
  updateAdminApplication,
  updateAdminProgram,
  updateAdminUniversity,
  updateAdminUser,
} from '../../lib/api';

type Section = 'overview' | 'pipeline' | 'users' | 'documents' | 'catalog' | 'audit';

const DEGREE_OPTIONS = ['certificate', 'diploma', 'bachelors', 'masters', 'phd', 'short_course'];

const STATUS_OPTIONS = [
  'inquiry',
  'profile_review',
  'applied',
  'documents_submitted',
  'under_review',
  'offer_received',
  'conditional_offer',
  'unconditional_offer',
  'enrolled',
  'cas_coe_issued',
  'visa_applied',
  'visa_approved',
  'visa_rejected',
  'pre_departure',
  'departed',
  'deferred',
  'withdrawn',
  'rejected',
];

const PRIORITY_OPTIONS = ['normal', 'high', 'urgent'];

function resolveSection(pathname: string): Section {
  if (pathname === '/portal/admin/applications') return 'pipeline';
  if (pathname === '/portal/admin/pipeline') return 'pipeline';
  if (pathname === '/portal/admin/users') return 'users';
  if (pathname === '/portal/admin/agents') return 'users';
  if (pathname === '/portal/admin/students') return 'users';
  if (pathname === '/portal/admin/roles') return 'users';
  if (pathname === '/portal/admin/documents') return 'documents';
  if (pathname === '/portal/admin/universities') return 'catalog';
  if (pathname === '/portal/admin/courses') return 'catalog';
  if (pathname === '/portal/admin/intakes') return 'catalog';
  if (pathname === '/portal/admin/logs') return 'audit';
  if (pathname === '/portal/admin/audit') return 'audit';
  return 'overview';
}

export function AdminDashboardPage() {
  const currentUser = useStore((state) => state.currentUser);
  const location = useLocation();
  const navigate = useNavigate();
  const section = resolveSection(location.pathname);

  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<AdminPipelineItem[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<AdminApplicationDetail | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentQueueItem[]>([]);
  const [universities, setUniversities] = useState<AdminUniversityRecord[]>([]);
  const [programs, setPrograms] = useState<AdminProgramRecord[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pipelineQuery, setPipelineQuery] = useState('');
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [documentStatus, setDocumentStatus] = useState('pending');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [selectedApplicationNote, setSelectedApplicationNote] = useState('');
  const [selectedApplicationStatus, setSelectedApplicationStatus] = useState('inquiry');
  const [selectedApplicationPriority, setSelectedApplicationPriority] = useState('normal');
  const [selectedApplicationAssignee, setSelectedApplicationAssignee] = useState<number | ''>('');
  const [selectedApplicationFlagged, setSelectedApplicationFlagged] = useState(false);
  const [selectedApplicationFlagReason, setSelectedApplicationFlagReason] = useState('');

  const [universityForm, setUniversityForm] = useState({
    name: '',
    short_name: '',
    country: '',
    city: '',
    partnership_type: 'non_exclusive' as 'exclusive' | 'non_exclusive',
  });
  const [programForm, setProgramForm] = useState({
    university_id: '',
    name: '',
    degree_level: 'masters',
    subject_area: '',
    tuition_fee: '',
    tuition_currency: 'EUR',
    intake_months: 'September, February',
  });

  useEffect(() => {
    void loadSectionData();
  }, [section]);

  useEffect(() => {
    if (!selectedApplication) {
      return;
    }

    setSelectedApplicationStatus(selectedApplication.status);
    setSelectedApplicationPriority(selectedApplication.priority);
    setSelectedApplicationAssignee(selectedApplication.assigned_to ?? '');
    setSelectedApplicationFlagged(Boolean(selectedApplication.is_flagged));
    setSelectedApplicationFlagReason(selectedApplication.flag_reason ?? '');
    setSelectedApplicationNote('');
  }, [selectedApplication]);

  async function loadSectionData() {
    setLoading(true);
    setError(null);

    try {
      const stats = await fetchAdminDashboardStats();
      setDashboard(stats);

      if (section === 'overview') {
        const [agentResult, documentResult] = await Promise.all([
          fetchAdminAgents({ status: 'pending', perPage: 6 }),
          fetchAdminDocumentQueue({ status: 'pending', perPage: 6 }),
        ]);
        setAgents(agentResult.agents);
        setDocuments(documentResult.documents);
      }

      if (section === 'pipeline') {
        const result = await fetchAdminPipeline({ q: pipelineQuery, status: pipelineStatus, perPage: 30 });
        setPipeline(result.applications);
      }

      if (section === 'users') {
        const [userResult, agentResult] = await Promise.all([
          fetchAdminUsers({ role: userRoleFilter, perPage: 30 }),
          fetchAdminAgents({ perPage: 20 }),
        ]);
        setUsers(userResult.users);
        setAgents(agentResult.agents);
      }

      if (section === 'documents') {
        const result = await fetchAdminDocumentQueue({ status: documentStatus, perPage: 30 });
        setDocuments(result.documents);
      }

      if (section === 'catalog') {
        const [universityResult, programResult] = await Promise.all([
          fetchAdminUniversities({ perPage: 40 }),
          fetchAdminPrograms({ perPage: 60 }),
        ]);
        setUniversities(universityResult.universities);
        setPrograms(programResult.programs);
      }

      if (section === 'audit') {
        const result = await fetchAdminAuditLog({ perPage: 30 });
        setAuditEntries(result.entries);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshDashboardOnly() {
    try {
      const stats = await fetchAdminDashboardStats();
      setDashboard(stats);
    } catch {
      toast.error('Failed to refresh dashboard counters.');
    }
  }

  async function openApplication(id: number) {
    try {
      const detail = await fetchAdminApplicationDetail(id);
      setSelectedApplication(detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load application detail.');
    }
  }

  async function submitApplicationUpdate() {
    if (!selectedApplication) {
      return;
    }

    setBusy(true);

    try {
      const updated = await updateAdminApplication({
        application_id: selectedApplication.id,
        status: selectedApplicationStatus,
        priority: selectedApplicationPriority,
        assigned_to: selectedApplicationAssignee === '' ? null : Number(selectedApplicationAssignee),
        note: selectedApplicationNote,
        is_flagged: selectedApplicationFlagged,
        flag_reason: selectedApplicationFlagReason,
      });
      setSelectedApplication(updated);
      toast.success('Application updated.');
      await loadSectionData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update application.');
    } finally {
      setBusy(false);
    }
  }

  async function inspectUser(id: number) {
    try {
      const detail = await fetchAdminUserDetail(id);
      setSelectedUser(detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load user detail.');
    }
  }

  async function changeUserStatus(userId: number, status: string) {
    setBusy(true);

    try {
      await updateAdminUser({ user_id: userId, status });
      toast.success('User updated.');
      await loadSectionData();
      if (selectedUser?.id === userId) {
        await inspectUser(userId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user.');
    } finally {
      setBusy(false);
    }
  }

  async function changeUserRole(userId: number, role: string) {
    setBusy(true);

    try {
      await updateAdminUser({ user_id: userId, role });
      toast.success('Internal role updated.');
      await loadSectionData();
      if (selectedUser?.id === userId) {
        await inspectUser(userId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setBusy(false);
    }
  }

  async function decideAgent(agentId: number, decision: 'approved' | 'rejected') {
    setBusy(true);

    try {
      const note = decision === 'rejected' ? window.prompt('Rejection note', 'Incomplete compliance details.') ?? '' : '';
      await approveAdminAgent({ agent_id: agentId, decision, note });
      toast.success(`Agent ${decision}.`);
      await loadSectionData();
      await refreshDashboardOnly();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to review agent.');
    } finally {
      setBusy(false);
    }
  }

  async function decideDocument(documentId: number, decision: 'verified' | 'rejected') {
    setBusy(true);

    try {
      const reason = decision === 'rejected' ? window.prompt('Rejection reason', 'Document quality or validity issue.') ?? '' : '';
      await reviewAdminDocument({ document_id: documentId, decision, reason });
      toast.success(`Document ${decision}.`);
      await loadSectionData();
      await refreshDashboardOnly();
      if (selectedApplication) {
        await openApplication(selectedApplication.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to review document.');
    } finally {
      setBusy(false);
    }
  }

  async function submitUniversity() {
    setBusy(true);

    try {
      await createAdminUniversity(universityForm);
      setUniversityForm({
        name: '',
        short_name: '',
        country: '',
        city: '',
        partnership_type: 'non_exclusive',
      });
      toast.success('University added to shared catalog.');
      await loadSectionData();
      await refreshDashboardOnly();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create university.');
    } finally {
      setBusy(false);
    }
  }

  async function quickEditUniversity(university: AdminUniversityRecord) {
    const name = window.prompt('University name', university.name);
    if (!name) return;

    try {
      await updateAdminUniversity({
        id: university.id,
        name,
        country: university.country,
        city: university.city ?? '',
        short_name: university.shortName ?? '',
        partnership_type: university.partnershipType,
        is_active: university.isActive,
      });
      toast.success('University updated.');
      await loadSectionData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update university.');
    }
  }

  async function disableUniversityRecord(universityId: number) {
    try {
      await deleteAdminUniversity(universityId);
      toast.success('University disabled.');
      await loadSectionData();
      await refreshDashboardOnly();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable university.');
    }
  }

  async function submitProgram() {
    setBusy(true);

    try {
      await createAdminProgram({
        university_id: Number(programForm.university_id),
        name: programForm.name,
        degree_level: programForm.degree_level,
        subject_area: programForm.subject_area,
        tuition_fee: programForm.tuition_fee ? Number(programForm.tuition_fee) : null,
        tuition_currency: programForm.tuition_currency,
        intake_months: programForm.intake_months.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setProgramForm({
        university_id: '',
        name: '',
        degree_level: 'masters',
        subject_area: '',
        tuition_fee: '',
        tuition_currency: 'EUR',
        intake_months: 'September, February',
      });
      toast.success('Program added to shared catalog.');
      await loadSectionData();
      await refreshDashboardOnly();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create program.');
    } finally {
      setBusy(false);
    }
  }

  async function quickEditProgram(program: AdminProgramRecord) {
    const name = window.prompt('Program name', program.name);
    if (!name) return;

    try {
      await updateAdminProgram({
        id: program.id,
        university_id: program.universityId,
        name,
        degree_level: program.degreeLevel,
        subject_area: program.subjectArea ?? '',
        tuition_fee: program.tuitionFee,
        tuition_currency: program.tuitionCurrency ?? 'EUR',
        intake_months: program.intakeMonths,
        is_active: program.isActive,
      });
      toast.success('Program updated.');
      await loadSectionData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update program.');
    }
  }

  async function disableProgramRecord(programId: number) {
    try {
      await deleteAdminProgram(programId);
      toast.success('Program disabled.');
      await loadSectionData();
      await refreshDashboardOnly();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable program.');
    }
  }

  if (!currentUser) {
    return null;
  }

  const permissions = dashboard?.permissions ?? null;
  const canUseSection =
    section === 'overview' ||
    section === 'pipeline' ||
    (section === 'users' && permissions?.canManageUsers !== false && currentUser.role !== 'visa_officer') ||
    (section === 'documents' && permissions?.canReviewDocuments === true) ||
    (section === 'catalog' && permissions?.canManageCatalog === true) ||
    (section === 'audit' && permissions?.canViewAuditLog === true);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-center" richColors />

      <div className="relative overflow-hidden rounded-[28px] border border-[#2D1B69]/10 bg-gradient-to-br from-[#0F0B1F] via-[#201255] to-[#2D1B69] p-7 text-white shadow-[0_28px_80px_rgba(15,11,31,0.28)]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at top right, #FFD700 0, transparent 28%)' }} />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/60 font-bold">Internal operations</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Role-based command portal</h2>
            <p className="mt-3 max-w-2xl text-sm text-white/72 leading-relaxed">
              Admissions, compliance, partner control, and shared catalog management now run from one live operational surface.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatChip label="Applications" value={dashboard?.totalApplications ?? '...'} />
            <StatChip label="Pending Agents" value={dashboard?.pendingAgentApprovals ?? '...'} />
            <StatChip label="Pending Docs" value={dashboard?.pendingDocumentReviews ?? '...'} />
            <StatChip label="Active Agents" value={dashboard?.activeAgents ?? '...'} />
          </div>
        </div>
      </div>

      {!canUseSection && !loading && (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-8">
          <div className="flex items-start gap-4">
            <Shield className="mt-1 w-6 h-6 text-amber-600" />
            <div>
              <h3 className="text-lg font-black text-amber-950">This section is not available for your role.</h3>
              <p className="mt-2 text-sm text-amber-800">
                Your current internal role can access the areas shown in the left menu. The backend is also enforcing the same rule.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-36 rounded-[24px] border border-gray-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {section === 'overview' && canUseSection && dashboard && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={FileSearch} label="Pipeline Cases" value={dashboard.totalApplications} tone="purple" detail="All applications in CRM" />
                <MetricCard icon={Users2} label="Student Accounts" value={dashboard.activeStudents} tone="gold" detail="Active student records" />
                <MetricCard icon={Building2} label="Shared Universities" value={dashboard.activeUniversities} tone="green" detail="Visible catalog institutions" />
                <MetricCard icon={BookOpenCheck} label="Shared Programs" value={dashboard.activePrograms} tone="blue" detail="Public + portal programs" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                <Panel
                  title="Recent stage movement"
                  subtitle="Latest operational movement across the application pipeline."
                >
                  <div className="space-y-3">
                    {dashboard.recentStageMovement.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-gray-100 bg-[#F8F7FF] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-black text-gray-900">{item.student_name}</div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 mt-1">
                              {item.reference_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-[#2D1B69]">{formatStage(item.to_status)}</div>
                            <div className="text-[11px] text-gray-400">{formatDate(item.created_at)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel
                  title="Pipeline weight"
                  subtitle="Current case distribution by stage."
                >
                  <div className="space-y-3">
                    {dashboard.applicationsByStage.map((item) => (
                      <div key={item.status} className="flex items-center justify-between rounded-2xl border border-gray-100 p-3">
                        <div className="text-sm font-bold text-gray-700">{formatStage(item.status)}</div>
                        <div className="rounded-full bg-[#EEE9FF] px-3 py-1 text-xs font-black text-[#2D1B69]">
                          {Number(item.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Pending agent approvals" subtitle="New partner agencies waiting for internal review.">
                  <div className="space-y-3">
                    {agents.length === 0 && <EmptyState label="No pending agent approvals." />}
                    {agents.map((agent) => (
                      <div key={agent.id} className="rounded-2xl border border-gray-100 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-black text-gray-900">{agent.agency_name}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {agent.agency_country} · {agent.email} · {agent.tier}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={busy || !permissions?.canApproveAgents}
                              onClick={() => void decideAgent(agent.id, 'approved')}
                              className="rounded-xl bg-[#2D1B69] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={busy || !permissions?.canApproveAgents}
                              onClick={() => void decideAgent(agent.id, 'rejected')}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Pending document review" subtitle="Latest uploads needing compliance review.">
                  <div className="space-y-3">
                    {documents.length === 0 && <EmptyState label="No pending documents." />}
                    {documents.map((document) => (
                      <div key={document.id} className="rounded-2xl border border-gray-100 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-black text-gray-900">{document.student_name}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {formatStage(document.document_type)} · {document.university_name}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={busy || !permissions?.canReviewDocuments}
                              onClick={() => void decideDocument(document.id, 'verified')}
                              className="rounded-xl bg-green-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                            >
                              Verify
                            </button>
                            <button
                              disabled={busy || !permissions?.canReviewDocuments}
                              onClick={() => void decideDocument(document.id, 'rejected')}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {section === 'pipeline' && canUseSection && (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
              <Panel title="Pipeline control" subtitle="Search, inspect, and transition live application records.">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                  <input
                    value={pipelineQuery}
                    onChange={(event) => setPipelineQuery(event.target.value)}
                    placeholder="Search student, university, program, reference"
                    className="flex-1 rounded-2xl border border-gray-200 bg-[#F8F7FF] px-4 py-3 text-sm outline-none focus:border-[#2D1B69]"
                  />
                  <select
                    value={pipelineStatus}
                    onChange={(event) => setPipelineStatus(event.target.value)}
                    className="rounded-2xl border border-gray-200 bg-[#F8F7FF] px-4 py-3 text-sm outline-none focus:border-[#2D1B69]"
                  >
                    <option value="">All stages</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatStage(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void loadSectionData()}
                    className="rounded-2xl bg-[#2D1B69] px-5 py-3 text-sm font-black text-white"
                  >
                    Refresh
                  </button>
                </div>

                <div className="space-y-3">
                  {pipeline.length === 0 && <EmptyState label="No applications matched this filter." />}
                  {pipeline.map((application) => (
                    <button
                      key={application.id}
                      onClick={() => void openApplication(application.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        selectedApplication?.id === application.id
                          ? 'border-[#2D1B69] bg-[#EEE9FF]'
                          : 'border-gray-100 bg-white hover:border-[#2D1B69]/20 hover:bg-[#F8F7FF]'
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-black text-gray-900">{application.student_name}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {application.university_name} · {application.program_name}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                            <span>{application.reference_number}</span>
                            <span>{formatStage(application.status)}</span>
                            <span>{application.document_count} docs</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {Boolean(application.is_flagged) && (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-700">
                              Flagged
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title="Application detail" subtitle="Live detail drawer with role-bound update controls.">
                {!selectedApplication && <EmptyState label="Select an application to inspect and update it." />}
                {selectedApplication && (
                  <div className="space-y-5">
                    <div className="rounded-[24px] bg-[#0F0B1F] p-5 text-white">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/60 font-bold">
                        {selectedApplication.reference_number}
                      </div>
                      <div className="mt-2 text-xl font-black">{selectedApplication.student_name}</div>
                      <div className="mt-2 text-sm text-white/70">
                        {selectedApplication.university_name} · {selectedApplication.program_name}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Stage">
                        <select
                          value={selectedApplicationStatus}
                          onChange={(event) => setSelectedApplicationStatus(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option
                              key={status}
                              value={status}
                              disabled={!dashboard?.permissions.allowedStages.includes(status)}
                            >
                              {formatStage(status)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Priority">
                        <select
                          value={selectedApplicationPriority}
                          onChange={(event) => setSelectedApplicationPriority(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                        >
                          {PRIORITY_OPTIONS.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Assignee">
                        <select
                          value={selectedApplicationAssignee}
                          onChange={(event) => setSelectedApplicationAssignee(event.target.value === '' ? '' : Number(event.target.value))}
                          className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                        >
                          <option value="">Unassigned</option>
                          {dashboard?.assignees.map((assignee) => (
                            <option key={assignee.id} value={assignee.id}>
                              {assignee.email} · {formatStage(assignee.role)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Flag case">
                        <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedApplicationFlagged}
                            onChange={(event) => setSelectedApplicationFlagged(event.target.checked)}
                          />
                          Mark for escalation
                        </label>
                      </Field>
                    </div>

                    <Field label="Flag reason">
                      <input
                        value={selectedApplicationFlagReason}
                        onChange={(event) => setSelectedApplicationFlagReason(event.target.value)}
                        placeholder="Why this case needs escalation"
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>

                    <Field label="Internal note">
                      <textarea
                        value={selectedApplicationNote}
                        onChange={(event) => setSelectedApplicationNote(event.target.value)}
                        rows={3}
                        placeholder="Add checklist context, handoff note, or escalation detail"
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>

                    <button
                      disabled={busy}
                      onClick={() => void submitApplicationUpdate()}
                      className="w-full rounded-2xl bg-gradient-to-r from-[#2D1B69] to-[#C94D1B] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      Save transition
                    </button>

                    <div className="space-y-3">
                      <h4 className="text-sm font-black text-gray-900">Documents</h4>
                      {selectedApplication.documents.map((document) => (
                        <div key={document.id} className="rounded-2xl border border-gray-100 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-gray-800">{formatStage(document.document_type)}</div>
                              <div className="text-xs text-gray-500">{document.file_name}</div>
                            </div>
                            <div className="flex gap-2">
                              <span className="rounded-full bg-[#EEE9FF] px-3 py-1 text-[11px] font-black text-[#2D1B69]">
                                {formatStage(document.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-black text-gray-900">Internal notes</h4>
                      {selectedApplication.notes.length === 0 && <EmptyState label="No internal notes yet." compact />}
                      {selectedApplication.notes.map((note) => (
                        <div key={note.id} className="rounded-2xl border border-gray-100 bg-[#F8F7FF] p-3">
                          <div className="text-xs font-bold text-gray-900">{note.author_email}</div>
                          <div className="mt-1 text-sm text-gray-700">{note.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {section === 'users' && canUseSection && (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr]">
              <Panel title="User directory" subtitle="Internal visibility across students, agents, and portal accounts.">
                <div className="mb-4 flex gap-3">
                  <select
                    value={userRoleFilter}
                    onChange={(event) => setUserRoleFilter(event.target.value)}
                    className="rounded-2xl border border-gray-200 bg-[#F8F7FF] px-4 py-3 text-sm outline-none"
                  >
                    <option value="">All roles</option>
                    <option value="student">Students</option>
                    <option value="agent">Agents</option>
                    <option value="counsellor">Counsellors</option>
                    <option value="visa_officer">Visa officers</option>
                    <option value="admin">Admins</option>
                    <option value="super_admin">Super admins</option>
                  </select>
                  <button onClick={() => void loadSectionData()} className="rounded-2xl bg-[#2D1B69] px-5 py-3 text-sm font-black text-white">
                    Refresh
                  </button>
                </div>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="rounded-[22px] border border-gray-100 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <button onClick={() => void inspectUser(user.id)} className="text-left">
                          <div className="text-sm font-black text-gray-900">
                            {user.firstName ?? 'Portal'} {user.lastName ?? 'User'}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">{user.email}</div>
                          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                            {formatStage(user.role)}
                          </div>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={user.status}
                            onChange={(event) => void changeUserStatus(user.id, event.target.value)}
                            disabled={busy || !permissions?.canManageUsers}
                            className="rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2 text-xs font-bold outline-none disabled:opacity-50"
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                            <option value="deleted">Deleted</option>
                          </select>
                          {permissions?.canChangeInternalRoles && ['counsellor', 'visa_officer', 'admin', 'super_admin'].includes(user.role) && (
                            <select
                              value={user.role}
                              onChange={(event) => void changeUserRole(user.id, event.target.value)}
                              disabled={busy}
                              className="rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2 text-xs font-bold outline-none disabled:opacity-50"
                            >
                              <option value="admin">Admin</option>
                              <option value="counsellor">Counsellor</option>
                              <option value="visa_officer">Visa Officer</option>
                              <option value="super_admin" disabled>
                                Super Admin
                              </option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <div className="space-y-6">
                <Panel title="User detail" subtitle="Context panel for the selected account.">
                  {!selectedUser && <EmptyState label="Select a user to inspect the linked profile." />}
                  {selectedUser && (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-[#F8F7FF] p-4">
                        <div className="text-sm font-black text-gray-900">{selectedUser.email}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatStage(selectedUser.role)} · {selectedUser.status}
                        </div>
                      </div>
                      <dl className="grid gap-3 text-sm">
                        <DetailRow label="Phone" value={selectedUser.phone ?? 'Not provided'} />
                        <DetailRow label="Email verified" value={selectedUser.emailVerified ? 'Yes' : 'No'} />
                        <DetailRow label="Last login" value={selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'No login yet'} />
                        <DetailRow label="Created" value={formatDate(selectedUser.createdAt)} />
                      </dl>
                      {selectedUser.role === 'agent' && selectedUser.profile && (
                        <div className="pt-2">
                          <button
                            onClick={() => navigate(`/portal/admin/agents/${selectedUser.profile.public_id || selectedUser.profile.publicId}/tree`)}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#2D1B69] text-white text-xs font-black py-2.5 hover:opacity-90 transition shadow-sm"
                          >
                            View Hierarchy Tree
                          </button>
                        </div>
                      )}
                      {selectedUser.profile && (
                        <pre className="overflow-x-auto rounded-2xl bg-[#0F0B1F] p-4 text-xs text-white/80">
                          {JSON.stringify(selectedUser.profile, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </Panel>

                <Panel title="Agent approvals" subtitle="Cross-check partner onboarding state.">
                  <div className="space-y-3">
                    {agents.filter((agent) => agent.status === 'pending').length === 0 && <EmptyState label="No pending partner approvals." compact />}
                    {agents
                      .filter((agent) => agent.status === 'pending')
                      .map((agent) => (
                        <div key={agent.id} className="rounded-2xl border border-gray-100 p-4">
                          <div className="text-sm font-black text-gray-900">{agent.agency_name}</div>
                          <div className="mt-1 text-xs text-gray-500">{agent.email}</div>
                          <div className="mt-3 flex gap-2">
                            <button
                              disabled={busy || !permissions?.canApproveAgents}
                              onClick={() => void decideAgent(agent.id, 'approved')}
                              className="rounded-xl bg-[#2D1B69] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={busy || !permissions?.canApproveAgents}
                              onClick={() => void decideAgent(agent.id, 'rejected')}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {section === 'documents' && canUseSection && (
            <Panel title="Document review queue" subtitle="Compliance review for passports, SOPs, financial proofs, and offer packs.">
              <div className="mb-4 flex gap-3">
                <select
                  value={documentStatus}
                  onChange={(event) => setDocumentStatus(event.target.value)}
                  className="rounded-2xl border border-gray-200 bg-[#F8F7FF] px-4 py-3 text-sm outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => void loadSectionData()} className="rounded-2xl bg-[#2D1B69] px-5 py-3 text-sm font-black text-white">
                  Refresh
                </button>
              </div>
              <div className="space-y-3">
                {documents.length === 0 && <EmptyState label="No documents in this queue." />}
                {documents.map((document) => (
                  <div key={document.id} className="rounded-[22px] border border-gray-100 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="text-sm font-black text-gray-900">{document.student_name}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatStage(document.document_type)} · {document.university_name} · {document.reference_number}
                        </div>
                        {document.rejection_reason && (
                          <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                            {document.rejection_reason}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#EEE9FF] px-3 py-1 text-[11px] font-black text-[#2D1B69]">
                          {formatStage(document.status)}
                        </span>
                        <button
                          disabled={busy || document.status === 'verified'}
                          onClick={() => void decideDocument(document.id, 'verified')}
                          className="rounded-xl bg-green-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => void decideDocument(document.id, 'rejected')}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {section === 'catalog' && canUseSection && permissions && (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="University manager" subtitle="Shared university data powers both the public site and the CRM catalog.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name">
                      <input
                        value={universityForm.name}
                        onChange={(event) => setUniversityForm({ ...universityForm, name: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                    <Field label="Short name">
                      <input
                        value={universityForm.short_name}
                        onChange={(event) => setUniversityForm({ ...universityForm, short_name: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                    <Field label="Country">
                      <input
                        value={universityForm.country}
                        onChange={(event) => setUniversityForm({ ...universityForm, country: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                    <Field label="City">
                      <input
                        value={universityForm.city}
                        onChange={(event) => setUniversityForm({ ...universityForm, city: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                  </div>
                  <Field label="Partnership type">
                    <select
                      value={universityForm.partnership_type}
                      onChange={(event) =>
                        setUniversityForm({
                          ...universityForm,
                          partnership_type: event.target.value as 'exclusive' | 'non_exclusive',
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                    >
                      <option value="non_exclusive">Non-exclusive</option>
                      <option value="exclusive">Exclusive</option>
                    </select>
                  </Field>
                  <button
                    disabled={busy || permissions.catalogReadOnly}
                    onClick={() => void submitUniversity()}
                    className="mt-4 rounded-2xl bg-[#2D1B69] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    Add university
                  </button>
                </Panel>

                <Panel title="Program manager" subtitle="Control degree level, tuition, and intake visibility for the shared catalog.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="University">
                      <select
                        value={programForm.university_id}
                        onChange={(event) => setProgramForm({ ...programForm, university_id: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      >
                        <option value="">Select university</option>
                        {universities.map((university) => (
                          <option key={university.id} value={university.id}>
                            {university.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Degree level">
                      <select
                        value={programForm.degree_level}
                        onChange={(event) => setProgramForm({ ...programForm, degree_level: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      >
                        {DEGREE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {formatStage(option)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Program name">
                      <input
                        value={programForm.name}
                        onChange={(event) => setProgramForm({ ...programForm, name: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                    <Field label="Subject area">
                      <input
                        value={programForm.subject_area}
                        onChange={(event) => setProgramForm({ ...programForm, subject_area: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                    <Field label="Tuition fee">
                      <input
                        value={programForm.tuition_fee}
                        onChange={(event) => setProgramForm({ ...programForm, tuition_fee: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                    <Field label="Currency">
                      <input
                        value={programForm.tuition_currency}
                        onChange={(event) => setProgramForm({ ...programForm, tuition_currency: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                  </div>
                  <Field label="Intake months">
                    <input
                      value={programForm.intake_months}
                      onChange={(event) => setProgramForm({ ...programForm, intake_months: event.target.value })}
                      placeholder="September, February"
                      className="w-full rounded-xl border border-gray-200 bg-[#F8F7FF] px-3 py-2.5 text-sm outline-none"
                    />
                  </Field>
                  <button
                    disabled={busy || permissions.catalogReadOnly}
                    onClick={() => void submitProgram()}
                    className="mt-4 rounded-2xl bg-[#2D1B69] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    Add program
                  </button>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
                <Panel title="Universities" subtitle="Edit or disable shared institutions.">
                  <div className="space-y-3">
                    {universities.map((university) => (
                      <div key={university.id} className="rounded-[22px] border border-gray-100 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-black text-gray-900">{university.name}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {university.country} · {university.city ?? 'No city'} · {university.programCount} programs
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={permissions.catalogReadOnly}
                              onClick={() => void quickEditUniversity(university)}
                              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              disabled={permissions.catalogReadOnly || !university.isActive}
                              onClick={() => void disableUniversityRecord(university.id)}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-50"
                            >
                              Disable
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Programs" subtitle="Fast control of shared degree listings.">
                  <div className="space-y-3">
                    {programs.map((program) => (
                      <div key={program.id} className="rounded-[22px] border border-gray-100 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-black text-gray-900">{program.name}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {program.universityName} · {formatStage(program.degreeLevel)} · {program.tuitionCurrency ?? ''} {program.tuitionFee ?? 'TBD'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={permissions.catalogReadOnly}
                              onClick={() => void quickEditProgram(program)}
                              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              disabled={permissions.catalogReadOnly || !program.isActive}
                              onClick={() => void disableProgramRecord(program.id)}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-50"
                            >
                              Disable
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {section === 'audit' && canUseSection && (
            <Panel title="Audit trail" subtitle="Trace sensitive admin activity across applications, users, and catalog edits.">
              <div className="space-y-3">
                {auditEntries.length === 0 && <EmptyState label="No audit entries available yet." />}
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="rounded-[22px] border border-gray-100 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-black text-gray-900">{entry.action}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {entry.actorEmail ?? 'System'} · {entry.entityType ?? 'entity'} #{entry.entityId ?? 'n/a'}
                        </div>
                      </div>
                      <div className="rounded-full bg-[#EEE9FF] px-3 py-1 text-[11px] font-black text-[#2D1B69]">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                    {(entry.newData || entry.oldData) && (
                      <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#0F0B1F] p-3 text-[11px] text-white/80">
                        {JSON.stringify({ oldData: entry.oldData, newData: entry.newData }, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Users2;
  label: string;
  value: number | string;
  detail: string;
  tone: 'purple' | 'gold' | 'green' | 'blue';
}) {
  const tones = {
    purple: 'bg-[#EEE9FF] text-[#2D1B69]',
    gold: 'bg-[#FFF6D9] text-[#A06C00]',
    green: 'bg-[#E8FFF3] text-[#1D9E75]',
    blue: 'bg-[#EAF4FF] text-[#378ADD]',
  };

  return (
    <div className="rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">{label}</div>
          <div className="mt-3 text-3xl font-black text-gray-950">{value}</div>
          <div className="mt-2 text-xs text-gray-500">{detail}</div>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-gray-950">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <ArrowUpRight className="w-5 h-5 text-gray-300" />
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-[#F8F7FF] px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">{label}</div>
      <div className="text-sm font-bold text-gray-800 text-right">{value}</div>
    </div>
  );
}

function EmptyState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`rounded-[22px] border border-dashed border-gray-200 bg-[#F8F7FF] text-center ${compact ? 'p-5' : 'p-10'}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
        <Clock3 className="w-5 h-5 text-gray-400" />
      </div>
      <div className="mt-4 text-sm font-bold text-gray-600">{label}</div>
    </div>
  );
}

function formatStage(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
