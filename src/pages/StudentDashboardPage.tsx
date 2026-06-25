import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Compass,
  FileText,
  GraduationCap,
  LoaderCircle,
  MapPin,
  Plane,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { useStore } from '../hooks/useStore';
import {
  createApplication,
  deleteApplicationDocument,
  fetchApplicationDetail,
  fetchPrograms,
  fetchStudentApplications,
  fetchStudentDashboard,
  fetchStudentProfile,
  uploadApplicationDocument,
  type ApplicationDetailResponse,
  type CatalogProgram,
  type StudentApplicationSummary,
  type StudentDashboardStats,
  type StudentProfileResponse,
} from '../lib/api';
import { deriveIntakeMonth, formatMoney } from '../lib/catalog';

type DashboardTab = 'dashboard' | 'quiz' | 'documents' | 'visa';

const JOURNEY_STAGES = [
  { key: 'inquiry', label: 'Inquiry', description: 'Your student record is inside the TGA pipeline.' },
  { key: 'profile_review', label: 'Profile Review', description: 'Counsellors are validating academics, goals, and budget.' },
  { key: 'applied', label: 'Applied', description: 'Applications are submitted to selected institutions.' },
  { key: 'documents_submitted', label: 'Documents', description: 'Supporting file set is under compliance review.' },
  { key: 'under_review', label: 'Under Review', description: 'The university is assessing the full application file.' },
  { key: 'offer_received', label: 'Offer', description: 'An offer is on the table and next-step planning begins.' },
  { key: 'enrolled', label: 'Enrolled', description: 'Seat is confirmed and institution-side enrollment is complete.' },
  { key: 'visa_applied', label: 'Visa Filed', description: 'Embassy or VFS filing has been initiated.' },
  { key: 'visa_approved', label: 'Visa Approved', description: 'Visa outcome is successful and departure prep starts.' },
  { key: 'departed', label: 'Departed', description: 'You are through the gate and your study journey begins.' },
] as const;

const VISA_CHECKLISTS: Record<string, string[]> = {
  Austria: [
    'Admission letter and tuition payment confirmation',
    'Blocked-account or sponsor-backed proof of funds',
    'Schengen-compliant insurance cover',
    'Accommodation proof and biometric appointment receipt',
  ],
  France: [
    'Campus France / EEF steps completed',
    'Offer letter and passport-validity check',
    'Accommodation and monthly means-of-support proof',
    'Visa appointment file with financial and academic set',
  ],
  Estonia: [
    'Admission package and residence-permit application set',
    'Insurance and monthly subsistence proof',
    'Passport, photo set, and study-purpose evidence',
    'Arrival plan and housing documents',
  ],
  Cyprus: [
    'Admission, fee receipt, and financial documents',
    'Accommodation and health insurance proof',
    'Police clearance and medical compliance set',
    'Embassy interview preparation checklist',
  ],
  USA: [
    'I-20 / institutional immigration set',
    'SEVIS payment and visa appointment receipt',
    'Financial support and sponsor documentation',
    'Interview positioning and travel-readiness prep',
  ],
  Grenada: [
    'Admission package and tuition confirmation',
    'Housing and sponsor-fund documentation',
    'Medical pathway compliance file',
    'Travel and passport-validity checks',
  ],
};

const SUBJECT_OPTIONS = [
  'IT & Game Design',
  'Business & Management',
  'Medicine & Health',
  'Engineering',
  'Design & Creative Arts',
  'Hospitality',
];

const COUNTRY_OPTIONS = ['Austria', 'Estonia', 'France', 'Cyprus', 'USA', 'Grenada'];

const BUDGET_OPTIONS = [
  { label: 'Up to EUR 8,000', max: 8000 },
  { label: 'Up to EUR 15,000', max: 15000 },
  { label: 'Up to EUR 30,000', max: 30000 },
  { label: 'Open to premium options', max: 50000 },
];

const DOCUMENT_OPTIONS = [
  { value: 'passport', label: 'Passport' },
  { value: 'academic_transcript', label: 'Academic Transcript' },
  { value: 'english_test_result', label: 'English Test Result' },
  { value: 'sop', label: 'Statement of Purpose' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'financial_sponsorship', label: 'Financial Sponsorship' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other Supporting Document' },
];

export function StudentDashboardPage() {
  const currentUser = useStore((state) => state.currentUser);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/documents')) {
      setActiveTab('documents');
    } else if (path.endsWith('/quiz')) {
      setActiveTab('quiz');
    } else if (path.endsWith('/visa')) {
      setActiveTab('visa');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  const handleTabClick = (tabId: DashboardTab) => {
    setActiveTab(tabId);
    if (tabId === 'dashboard') {
      navigate('/portal/student');
    } else {
      navigate(`/portal/student/${tabId}`);
    }
  };

  const [dashboard, setDashboard] = useState<StudentDashboardStats | null>(null);
  const [profile, setProfile] = useState<StudentProfileResponse | null>(null);
  const [applications, setApplications] = useState<StudentApplicationSummary[]>([]);
  const [applicationDetail, setApplicationDetail] = useState<ApplicationDetailResponse | null>(null);
  const [catalogPrograms, setCatalogPrograms] = useState<CatalogProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingProgramId, setApplyingProgramId] = useState<number | null>(null);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(0);
  const [quizStep, setQuizStep] = useState(1);
  const [quizCountry, setQuizCountry] = useState('Austria');
  const [quizSubject, setQuizSubject] = useState('IT & Game Design');
  const [quizBudget, setQuizBudget] = useState(BUDGET_OPTIONS[1]);
  const [matches, setMatches] = useState<Array<CatalogProgram & { matchScore: number; reasons: string[] }>>([]);
  const [visaCountry, setVisaCountry] = useState('Austria');
  const [selectedDocumentType, setSelectedDocumentType] = useState('passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPortal = async (showRefreshState = false) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [dashboardResponse, profileResponse, applicationsResponse, programsResponse] = await Promise.all([
        fetchStudentDashboard(),
        fetchStudentProfile(),
        fetchStudentApplications(),
        fetchPrograms({ page: 1, perPage: 100 }),
      ]);

      setDashboard(dashboardResponse);
      setProfile(profileResponse);
      setApplications(applicationsResponse);
      setCatalogPrograms(programsResponse.programs);
      setError(null);

      if (applicationsResponse.length > 0) {
        const detail = await fetchApplicationDetail(applicationsResponse[0].id);
        setApplicationDetail(detail);
      } else {
        setApplicationDetail(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the student portal.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      setLoading(false);
      return;
    }

    void loadPortal();
  }, [currentUser]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (profile.desired_country) {
      setQuizCountry(profile.desired_country);
      setVisaCountry(profile.desired_country);
    }

    if (profile.desired_subject) {
      setQuizSubject(profile.desired_subject);
    }
  }, [profile]);

  useEffect(() => {
    if (!applicationDetail) {
      setSelectedTimelineIndex(0);
      return;
    }

    const activeIndex = JOURNEY_STAGES.findIndex((stage) => stage.key === applicationDetail.status);
    setSelectedTimelineIndex(activeIndex >= 0 ? activeIndex : 0);
    setVisaCountry(inferCountryFromPrograms(catalogPrograms, applicationDetail.university_id));
  }, [applicationDetail, catalogPrograms]);

  const currentStageIndex = useMemo(() => {
    if (!applicationDetail) {
      return 0;
    }

    const index = JOURNEY_STAGES.findIndex((stage) => stage.key === applicationDetail.status);

    return index >= 0 ? index : 0;
  }, [applicationDetail]);

  const activeCountry = visaCountry;
  const visaChecklist = VISA_CHECKLISTS[visaCountry] ?? VISA_CHECKLISTS.Austria;

  const completionTone = (dashboard?.profileCompletion ?? 0) >= 90
    ? 'text-[#1D9E75] border-[#1D9E75]/20 bg-[#1D9E75]/8'
    : (dashboard?.profileCompletion ?? 0) >= 70
      ? 'text-[#EF9F27] border-[#EF9F27]/20 bg-[#EF9F27]/8'
      : 'text-[#E24B4A] border-[#E24B4A]/20 bg-[#E24B4A]/8';

  const earnedBadges = [
    { id: 'explorer', name: 'Explorer', active: (dashboard?.profileCompletion ?? 0) >= 50, icon: '01', detail: 'Profile foundation complete' },
    { id: 'first-step', name: 'First Step', active: (dashboard?.applicationCount ?? 0) > 0, icon: '02', detail: 'First live application submitted' },
    { id: 'offer', name: 'Offer Track', active: currentStageIndex >= 5, icon: '03', detail: 'Reached decision-stage momentum' },
    { id: 'visa', name: 'Visa Ready', active: currentStageIndex >= 7, icon: '04', detail: 'Embassy flow is in motion' },
  ];

  const runQuiz = () => {
    const filteredPrograms = catalogPrograms
      .filter((program) => (quizCountry ? program.university.country === quizCountry : true))
      .filter((program) => (quizSubject ? program.subjectArea === quizSubject : true))
      .filter((program) => (program.tuitionFee ?? 0) <= quizBudget.max)
      .map((program) => {
        let score = 72;
        const reasons: string[] = [];

        if (program.university.country === quizCountry) {
          score += 12;
          reasons.push(`Matches your target country: ${quizCountry}`);
        }

        if (program.subjectArea === quizSubject) {
          score += 10;
          reasons.push(`Aligned with ${quizSubject}`);
        }

        if ((program.tuitionFee ?? 0) <= quizBudget.max) {
          score += 6;
          reasons.push(`Within your budget band: ${quizBudget.label}`);
        }

        if (program.university.isExclusive) {
          score += 4;
          reasons.push('Exclusive TGA partner with smoother application routing');
        }

        return {
          ...program,
          matchScore: Math.min(score, 99),
          reasons,
        };
      })
      .sort((left, right) => right.matchScore - left.matchScore)
      .slice(0, 6);

    setMatches(filteredPrograms);
    setQuizStep(4);

    if (filteredPrograms.length === 0) {
      toast.info('No direct match hit the current filters. Broaden the budget or country and try again.');
      return;
    }

    toast.success('Live catalog matches generated from the backend inventory.');
  };

  const handleApply = async (program: CatalogProgram) => {
    try {
      setApplyingProgramId(program.id);

      await createApplication({
        programId: program.id,
        universityId: program.university.id,
        intakeMonth: deriveIntakeMonth(program),
        intakeYear: new Date().getFullYear(),
        source: 'website',
      });

      toast.success(`Application created for ${program.name}.`);
      await loadPortal(true);
      setActiveTab('dashboard');
    } catch (applyError) {
      toast.error(applyError instanceof Error ? applyError.message : 'Application creation failed.');
    } finally {
      setApplyingProgramId(null);
    }
  };

  const handleUploadDocument = async () => {
    if (!applicationDetail) {
      toast.error('Create an application first before uploading documents.');
      return;
    }

    if (!selectedFile) {
      toast.error('Choose a file before uploading.');
      return;
    }

    try {
      setUploadingDocument(true);
      await uploadApplicationDocument({
        applicationId: applicationDetail.id,
        documentType: selectedDocumentType,
        file: selectedFile,
      });
      toast.success('Document uploaded to the secure vault.');
      setSelectedFile(null);
      await loadPortal(true);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      setDeletingDocumentId(documentId);
      await deleteApplicationDocument(documentId);
      toast.success('Document removed successfully.');
      await loadPortal(true);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Document deletion failed.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  if (!currentUser || currentUser.role !== 'student') {
    return (
      <div className="min-h-screen bg-[#F8F7FF] pt-32 text-center px-6">
        <h1 className="text-3xl font-black text-[#0F0B1F]">Student sign-in required</h1>
        <p className="text-sm text-[#5C5675] mt-3">Use the live student login to access the application portal.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] pt-24 flex items-center justify-center">
        <div className="rounded-[32px] border border-[#2D1B69]/10 bg-white px-8 py-10 text-center shadow-sm">
          <LoaderCircle className="w-9 h-9 text-[#2D1B69] animate-spin mx-auto" />
          <p className="text-sm text-[#5C5675] mt-4">Loading your live TGA journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] pt-24 flex items-center justify-center px-6">
        <div className="max-w-lg rounded-[32px] border border-red-200 bg-white px-8 py-10 text-center shadow-sm">
          <AlertCircle className="w-9 h-9 text-[#E24B4A] mx-auto" />
          <h1 className="text-2xl font-black text-[#0F0B1F] mt-5">Portal temporarily unavailable</h1>
          <p className="text-sm text-[#5C5675] mt-3">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF] pt-24 pb-12">
      <Toaster position="top-center" richColors />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <header className="overflow-hidden rounded-[32px] border border-[#2D1B69]/10 bg-[#0F0B1F] text-white shadow-[0_24px_70px_rgba(15,11,31,0.22)]">
          <div className="grid lg:grid-cols-[1.4fr_0.8fr]">
            <div className="p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#FFD700]">
                <Compass className="w-3.5 h-3.5" />
                Student Journey Console
              </div>
              <h1 className="text-4xl font-black tracking-tight mt-6">
                {profile?.first_name ?? currentUser.firstName}, your next move is visible.
              </h1>
              <p className="text-sm text-white/66 mt-4 max-w-2xl leading-6">
                This view is now reading live profile, application, and catalog data from the CRM. What you see here is what the TGA team is actually working with.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                <MetricCard label="Profile completion" value={`${dashboard?.profileCompletion ?? 0}%`} tone={completionTone} />
                <MetricCard label="Journey points" value={`${dashboard?.points ?? 0}`} tone="text-[#FFD700] border-[#FFD700]/20 bg-[#FFD700]/8" />
                <MetricCard label="Applications" value={`${dashboard?.applicationCount ?? 0}`} tone="text-[#378ADD] border-[#378ADD]/20 bg-[#378ADD]/8" />
              </div>
            </div>

            <div className="border-t lg:border-t-0 lg:border-l border-white/8 bg-white/[0.04] p-8 sm:p-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/46">Live status</div>
                  <div className="text-2xl font-black mt-2">{formatStatus(applicationDetail?.status ?? 'profile_review')}</div>
                </div>
                <button
                  onClick={() => void loadPortal(true)}
                  disabled={refreshing}
                  className="rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div className="mt-8 space-y-4">
                <ActionLine title="Current destination" value={activeCountry} />
                <ActionLine title="Preferred subject" value={profile?.desired_subject ?? quizSubject} />
                <ActionLine title="Unread notifications" value={`${dashboard?.unreadNotifications ?? 0}`} />
                <ActionLine title="Latest file count" value={`${applicationDetail?.documents.length ?? 0} uploaded`} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-[#2D1B69]/8 bg-white p-2 shadow-sm">
          {[
            { id: 'dashboard', label: 'Journey', icon: Compass },
            { id: 'quiz', label: 'Course finder', icon: Sparkles },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'visa', label: 'Visa prep', icon: Plane },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as DashboardTab)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  active
                    ? 'bg-[#2D1B69] text-white shadow-[0_16px_30px_rgba(45,27,105,0.18)]'
                    : 'text-[#5C5675] hover:bg-[#F8F7FF]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'dashboard' && (
          <section className="space-y-6">
            <div className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Application timeline</div>
                  <h2 className="text-2xl font-black text-[#0F0B1F] mt-3">Your live journey map</h2>
                </div>
                {applicationDetail && (
                  <div className="rounded-2xl border border-[#FFD700]/30 bg-[#FFD700]/10 px-4 py-3 text-sm font-bold text-[#8A6A00]">
                    Ref: {applicationDetail.reference_number}
                  </div>
                )}
              </div>

              {applicationDetail ? (
                <>
                  <div className="relative mt-8 overflow-x-auto pb-3">
                    <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-[#E8E4F6]" />
                    <div
                      className="absolute left-0 top-5 h-1 rounded-full bg-gradient-to-r from-[#2D1B69] to-[#FFD700]"
                      style={{ width: `${(currentStageIndex / Math.max(1, JOURNEY_STAGES.length - 1)) * 100}%` }}
                    />
                    <div className="relative flex min-w-[900px] justify-between gap-4">
                      {JOURNEY_STAGES.map((stage, index) => {
                        const completed = index <= currentStageIndex;
                        const selected = index === selectedTimelineIndex;

                        return (
                          <button
                            key={stage.key}
                            onClick={() => setSelectedTimelineIndex(index)}
                            className="flex w-20 flex-col items-center"
                          >
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black transition-all ${
                              completed
                                ? 'border-[#FFD700]/20 bg-[#FFD700] text-[#2D1B69] shadow-[0_10px_24px_rgba(255,215,0,0.32)]'
                                : 'border-[#D9D2EC] bg-white text-[#7B7496]'
                            }`}>
                              {index < currentStageIndex ? 'OK' : `${index + 1}`}
                            </div>
                            <div className={`mt-3 text-center text-[11px] font-bold ${selected ? 'text-[#2D1B69]' : 'text-[#7B7496]'}`}>
                              {stage.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 rounded-[24px] border border-[#2D1B69]/8 bg-[#F8F7FF] p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">
                      Step {selectedTimelineIndex + 1}
                    </div>
                    <h3 className="text-xl font-black text-[#0F0B1F] mt-2">{JOURNEY_STAGES[selectedTimelineIndex].label}</h3>
                    <p className="text-sm text-[#5C5675] mt-3 leading-6">{JOURNEY_STAGES[selectedTimelineIndex].description}</p>
                  </div>
                </>
              ) : (
                <div className="mt-8 rounded-[24px] border border-dashed border-[#2D1B69]/20 bg-[#F8F7FF] p-10 text-center">
                  <h3 className="text-xl font-black text-[#0F0B1F]">No live applications yet</h3>
                  <p className="text-sm text-[#5C5675] mt-3">Run the course finder and create the first inquiry directly into the CRM.</p>
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-6">
              <div className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Live applications</div>
                    <h2 className="text-2xl font-black text-[#0F0B1F] mt-2">Recent pipeline entries</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#2D1B69]/12 px-4 py-2 text-sm font-bold text-[#2D1B69]"
                  >
                    Find more matches
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 mt-6">
                  {applications.map((application) => (
                    <article key={application.id} className="rounded-[22px] border border-[#2D1B69]/8 bg-[#F8F7FF] p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-[#0F0B1F]">{application.program_name}</h3>
                          <p className="text-sm text-[#5C5675] mt-1">{application.university_name}</p>
                          <p className="text-xs text-[#7B7496] mt-2">
                            Intake {application.intake_month}/{application.intake_year} · {application.reference_number}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${statusTone(application.status)}`}>
                          {formatStatus(application.status)}
                        </span>
                      </div>
                    </article>
                  ))}

                  {applications.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-[#2D1B69]/20 bg-white p-8 text-center">
                      <p className="text-sm text-[#5C5675]">The pipeline is empty. Your first application will appear here as soon as you create it.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Badges</div>
                  <h2 className="text-2xl font-black text-[#0F0B1F] mt-2">Milestone cabinet</h2>
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    {earnedBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`rounded-[22px] border p-4 text-center transition-all ${
                          badge.active
                            ? 'border-[#FFD700]/35 bg-[#FFD700]/10 shadow-[0_12px_28px_rgba(255,215,0,0.15)]'
                            : 'border-[#2D1B69]/8 bg-[#F8F7FF] opacity-60'
                        }`}
                      >
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">{badge.icon}</div>
                        <div className="text-sm font-black text-[#0F0B1F] mt-3">{badge.name}</div>
                        <div className="text-xs text-[#5C5675] mt-2">{badge.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#2D1B69]/10 bg-[#2D1B69] p-6 text-white shadow-[0_18px_48px_rgba(45,27,105,0.20)]">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/52">
                    <Trophy className="w-3.5 h-3.5" />
                    Next best action
                  </div>
                  <h3 className="text-xl font-black mt-4">
                    {(dashboard?.applicationCount ?? 0) === 0 ? 'Create your first application' : 'Move one stage further this week'}
                  </h3>
                  <p className="text-sm text-white/72 mt-3 leading-6">
                    {(dashboard?.applicationCount ?? 0) === 0
                      ? 'Use the live course finder to push your first inquiry into the CRM. That unlocks the rest of the journey map.'
                      : 'Keep the document set tight and the visa checklist current so there is no dead time between stages.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'quiz' && (
          <section className="max-w-5xl mx-auto rounded-[32px] border border-[#2D1B69]/10 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2D1B69]/8 pb-5">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Live course finder</div>
                <h2 className="text-3xl font-black text-[#0F0B1F] mt-2">Match against backend inventory</h2>
              </div>
              <div className="text-sm font-bold text-[#5C5675]">Step {Math.min(quizStep, 3)} of 3</div>
            </div>

            {quizStep < 4 && (
              <div className="mt-6 h-1.5 rounded-full bg-[#E8E4F6] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2D1B69] to-[#FFD700]" style={{ width: `${(quizStep / 3) * 100}%` }} />
              </div>
            )}

            {quizStep === 1 && (
              <div className="mt-8">
                <h3 className="text-2xl font-black text-[#0F0B1F]">Choose the destination that matters most.</h3>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  {COUNTRY_OPTIONS.map((country) => (
                    <button
                      key={country}
                      onClick={() => setQuizCountry(country)}
                      className={`rounded-[24px] border p-5 text-left transition-all ${
                        quizCountry === country
                          ? 'border-[#2D1B69] bg-[#F8F7FF] shadow-[0_16px_36px_rgba(45,27,105,0.12)]'
                          : 'border-[#2D1B69]/10 bg-white hover:border-[#2D1B69]/30'
                      }`}
                    >
                      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Country</div>
                      <div className="text-lg font-black text-[#0F0B1F] mt-3">{country}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end mt-8">
                  <button onClick={() => setQuizStep(2)} className="rounded-xl bg-[#2D1B69] px-6 py-3 text-sm font-bold text-white">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {quizStep === 2 && (
              <div className="mt-8">
                <h3 className="text-2xl font-black text-[#0F0B1F]">What subject should lead the shortlist?</h3>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {SUBJECT_OPTIONS.map((subject) => (
                    <button
                      key={subject}
                      onClick={() => setQuizSubject(subject)}
                      className={`rounded-[24px] border p-5 text-left transition-all ${
                        quizSubject === subject
                          ? 'border-[#2D1B69] bg-[#F8F7FF] shadow-[0_16px_36px_rgba(45,27,105,0.12)]'
                          : 'border-[#2D1B69]/10 bg-white hover:border-[#2D1B69]/30'
                      }`}
                    >
                      <div className="text-lg font-black text-[#0F0B1F]">{subject}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-8">
                  <button onClick={() => setQuizStep(1)} className="rounded-xl border border-[#2D1B69]/12 px-5 py-3 text-sm font-bold text-[#2D1B69]">
                    Back
                  </button>
                  <button onClick={() => setQuizStep(3)} className="rounded-xl bg-[#2D1B69] px-6 py-3 text-sm font-bold text-white">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {quizStep === 3 && (
              <div className="mt-8">
                <h3 className="text-2xl font-black text-[#0F0B1F]">Set a tuition ceiling that feels realistic.</h3>
                <div className="space-y-3 mt-6">
                  {BUDGET_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setQuizBudget(option)}
                      className={`w-full rounded-[22px] border px-5 py-4 text-left transition-all ${
                        quizBudget.label === option.label
                          ? 'border-[#2D1B69] bg-[#F8F7FF] shadow-[0_16px_36px_rgba(45,27,105,0.12)]'
                          : 'border-[#2D1B69]/10 bg-white hover:border-[#2D1B69]/30'
                      }`}
                    >
                      <div className="text-lg font-black text-[#0F0B1F]">{option.label}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-8">
                  <button onClick={() => setQuizStep(2)} className="rounded-xl border border-[#2D1B69]/12 px-5 py-3 text-sm font-bold text-[#2D1B69]">
                    Back
                  </button>
                  <button onClick={runQuiz} className="rounded-xl bg-[#2D1B69] px-6 py-3 text-sm font-bold text-white">
                    Generate live matches
                  </button>
                </div>
              </div>
            )}

            {quizStep === 4 && (
              <div className="mt-8 space-y-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Result set</div>
                    <h3 className="text-2xl font-black text-[#0F0B1F] mt-2">Best-fit programs from the live backend</h3>
                  </div>
                  <button onClick={() => { setQuizStep(1); setMatches([]); }} className="rounded-xl border border-[#2D1B69]/12 px-5 py-3 text-sm font-bold text-[#2D1B69]">
                    Retake quiz
                  </button>
                </div>

                {matches.map((program) => (
                  <article key={program.id} className="rounded-[24px] border border-[#2D1B69]/10 bg-[#F8F7FF] p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="rounded-full border border-[#1D9E75]/18 bg-[#1D9E75]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#1D9E75]">
                            {program.matchScore}% Match
                          </span>
                          <span className="rounded-full border border-[#2D1B69]/10 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#2D1B69]">
                            {program.degreeLevel}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-[#0F0B1F] mt-4">{program.name}</h3>
                        <p className="text-sm text-[#5C5675] mt-2">
                          {program.university.name} · {program.university.country}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {program.reasons.map((reason) => (
                            <span key={reason} className="rounded-full border border-[#2D1B69]/10 bg-white px-3 py-1 text-xs font-semibold text-[#2D1B69]">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="w-full lg:w-[220px] space-y-3">
                        <div className="rounded-[20px] border border-[#2D1B69]/10 bg-white p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7B7496]">Tuition</div>
                          <div className="text-lg font-black text-[#0F0B1F] mt-2">{formatMoney(program.tuitionFee, program.tuitionCurrency)}</div>
                        </div>
                        <div className="rounded-[20px] border border-[#2D1B69]/10 bg-white p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7B7496]">Intakes</div>
                          <div className="text-lg font-black text-[#0F0B1F] mt-2">{program.intakeMonths.join(', ')}</div>
                        </div>
                        <button
                          onClick={() => void handleApply(program)}
                          disabled={applyingProgramId === program.id}
                          className="w-full rounded-xl bg-[#2D1B69] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {applyingProgramId === program.id ? 'Creating...' : 'One-click apply'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {matches.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-[#2D1B69]/20 bg-white p-10 text-center">
                    <p className="text-sm text-[#5C5675]">No programs matched the current filters. Try widening the budget or subject range.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'documents' && (
          <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Document ledger</div>
              <h2 className="text-2xl font-black text-[#0F0B1F] mt-2">Application file set now lives in the backend</h2>
              <div className="space-y-4 mt-6">
                {(applicationDetail?.documents ?? []).map((document) => (
                  <article key={document.id} className="rounded-[22px] border border-[#2D1B69]/8 bg-[#F8F7FF] p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black text-[#0F0B1F]">{formatStatus(document.document_type)}</h3>
                        <p className="text-sm text-[#5C5675] mt-1">{document.file_name}</p>
                        <p className="text-xs text-[#7B7496] mt-2">
                          {document.mime_type ?? 'Unknown type'}
                          {document.file_size ? ` · ${formatFileSize(document.file_size)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${statusTone(document.status)}`}>
                          {formatStatus(document.status)}
                        </span>
                        {['pending', 'rejected'].includes(document.status) && (
                          <button
                            onClick={() => void handleDeleteDocument(document.id)}
                            disabled={deletingDocumentId === document.id}
                            className="rounded-xl border border-[#E24B4A]/15 px-3 py-2 text-xs font-bold text-[#B92E2E] disabled:opacity-60"
                          >
                            {deletingDocumentId === document.id ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                {(applicationDetail?.documents.length ?? 0) === 0 && (
                  <div className="rounded-[22px] border border-dashed border-[#2D1B69]/20 bg-[#F8F7FF] p-8 text-center">
                    <p className="text-sm text-[#5C5675]">No documents have been uploaded to this application yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Secure upload roadmap
                </div>
                <h3 className="text-xl font-black text-[#0F0B1F] mt-3">Secure upload is live for your current application.</h3>
                <p className="text-sm text-[#5C5675] mt-3 leading-6">
                  Files are server-validated by MIME type, renamed to UUIDs, and stored behind blocked direct access. Uploads only succeed after the backend accepts them.
                </p>

                <div className="space-y-4 mt-6">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#7B7496] mb-2">Document type</label>
                    <select
                      value={selectedDocumentType}
                      onChange={(event) => setSelectedDocumentType(event.target.value)}
                      disabled={!applicationDetail}
                      className="w-full rounded-xl border border-[#2D1B69]/10 bg-[#F8F7FF] px-4 py-3 text-sm font-semibold text-[#0F0B1F] outline-none disabled:opacity-60"
                    >
                      {DOCUMENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#7B7496] mb-2">Choose file</label>
                    <input
                      type="file"
                      disabled={!applicationDetail || uploadingDocument}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                      className="block w-full rounded-xl border border-[#2D1B69]/10 bg-[#F8F7FF] px-4 py-3 text-sm text-[#0F0B1F] file:mr-4 file:rounded-lg file:border-0 file:bg-[#2D1B69] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                    />
                    <p className="text-xs text-[#7B7496] mt-2">
                      PDF is accepted for most documents. Passport and some identity files also accept JPG or PNG. Images are capped more tightly than PDFs.
                    </p>
                  </div>

                  <button
                    onClick={() => void handleUploadDocument()}
                    disabled={!applicationDetail || !selectedFile || uploadingDocument}
                    className="w-full rounded-xl bg-[#2D1B69] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {uploadingDocument ? 'Uploading securely...' : 'Upload to document vault'}
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#2D1B69]/10 bg-[#0F0B1F] p-6 text-white shadow-[0_18px_48px_rgba(15,11,31,0.18)]">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">What to keep ready</div>
                <ul className="space-y-3 mt-4 text-sm text-white/76">
                  <li>Passport copy with valid expiry window</li>
                  <li>Academic transcripts and certificates</li>
                  <li>English test score report</li>
                  <li>SOP and financial proof set</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'visa' && (
          <section className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
            <div className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Destination focus</div>
              <h2 className="text-2xl font-black text-[#0F0B1F] mt-2">{activeCountry} visa readiness</h2>
              <p className="text-sm text-[#5C5675] mt-3 leading-6">
                This panel tracks the destination implied by your current application and applies the relevant checklist language for the next visa-prep conversation.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                {Object.keys(VISA_CHECKLISTS).map((country) => (
                  <button
                    key={country}
                    onClick={() => setVisaCountry(country)}
                    className={`rounded-[20px] border px-4 py-4 text-left text-sm font-bold transition-all ${
                      activeCountry === country
                        ? 'border-[#2D1B69] bg-[#F8F7FF] text-[#2D1B69]'
                        : 'border-[#2D1B69]/10 bg-white text-[#5C5675]'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Checklist</div>
              <h2 className="text-2xl font-black text-[#0F0B1F] mt-2">Embassy-side readiness items</h2>
              <div className="space-y-4 mt-6">
                {visaChecklist.map((item, index) => (
                  <div key={item} className="flex gap-4 rounded-[22px] border border-[#2D1B69]/8 bg-[#F8F7FF] p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2D1B69] text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-semibold text-[#0F0B1F] leading-6">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function inferCountryFromPrograms(programs: CatalogProgram[], universityId: number): string {
  const match = programs.find((program) => program.university.id === universityId);

  return match?.university.country ?? 'Austria';
}

function formatStatus(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusTone(status: string): string {
  switch (status) {
    case 'offer_received':
      return 'border-[#2D1B69]/18 bg-[#2D1B69]/8 text-[#2D1B69]';
    case 'visa_approved':
    case 'verified':
      return 'border-[#1D9E75]/18 bg-[#1D9E75]/10 text-[#1D9E75]';
    case 'documents_submitted':
    case 'under_review':
    case 'pending':
      return 'border-[#EF9F27]/18 bg-[#EF9F27]/10 text-[#9D6500]';
    case 'rejected':
    case 'visa_rejected':
      return 'border-[#E24B4A]/18 bg-[#E24B4A]/10 text-[#B92E2E]';
    default:
      return 'border-[#378ADD]/18 bg-[#378ADD]/10 text-[#1D5FA8]';
  }
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${tone}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="text-2xl font-black mt-2">{value}</div>
    </div>
  );
}

function ActionLine({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/6 px-4 py-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">{title}</div>
      <div className="text-lg font-black text-white mt-2">{value}</div>
    </div>
  );
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}
