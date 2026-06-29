import { useState, useMemo, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { ApplicationStatus, Application, StudentProfile } from '../types';
import { 
  TrendingUp, Plus, Search, Award, Sparkles, DollarSign, 
  CheckCircle2, Calendar, ArrowUpRight, FileText, ChevronRight, 
  GraduationCap, Users, Settings, Briefcase, Grid, Send, 
  Download, CreditCard, ArrowRight, BookOpen, Clock, AlertCircle, FilePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CountUp from 'react-countup';
import { ActivityFeedWidget } from '../shared/components/ui/ActivityFeedWidget';

export function AgentDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Zustand Store hooks
  const currentUser = useStore((state) => state.currentUser);
  const agents = useStore((state) => state.agents);
  const applications = useStore((state) => state.applications);
  const students = useStore((state) => state.students);
  const commissionClaims = useStore((state) => state.commissionClaims);
  const programs = useStore((state) => state.programs);
  
  const submitLead = useStore((state) => state.submitLead);
  const claimCommission = useStore((state) => state.claimCommission);
  const updateApplicationStatus = useStore((state) => state.updateApplicationStatus);

  // Active agent context
  const agentData = useMemo(() => {
    return agents.find((a) => a.userId === currentUser?.id) || agents[0];
  }, [agents, currentUser]);

  const agentId = agentData?.id || 'agent-1';

  // Filter applications & students tied to this B2B Agent
  const myApplications = useMemo(() => {
    return applications.filter((app) => app.agentId === agentId);
  }, [applications, agentId]);

  const myStudentIds = useMemo(() => {
    return new Set(myApplications.map((app) => app.studentId));
  }, [myApplications]);

  const myStudents = useMemo(() => {
    return students.filter((s) => myStudentIds.has(s.id));
  }, [students, myStudentIds]);

  const myCommissions = useMemo(() => {
    return commissionClaims.filter((c) => c.agentId === agentId);
  }, [commissionClaims, agentId]);

  // ───────────────────────────────────────────────────────────────────────────
  // STATE DEFINITIONS FOR DYNAMIC SUB-PAGES
  // ───────────────────────────────────────────────────────────────────────────
  
  // 1. Leads Tab State
  const [leadsSearch, setLeadsSearch] = useState('');
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadStep, setLeadStep] = useState(1);
  const [leadForm, setLeadForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    educationLevel: 'Bachelor Completed',
    gpa: '',
    englishScore: 'IELTS 6.5',
    desiredCountry: 'Austria',
    desiredSubject: 'IT & Game Design',
    budgetRange: '€5,000–€10,000/year'
  });

  // 2. Kanban Board State
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 3. Commissions Tab State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedAppForClaim, setSelectedAppForClaim] = useState<string>('');
  const [claimAmount, setClaimAmount] = useState<number>(1500);
  const [claimCurrency, setClaimCurrency] = useState<string>('EUR');
  const [invoicePreview, setInvoicePreview] = useState(false);

  // Computed metrics
  const totalCommissionEarned = useMemo(() => {
    return myCommissions
      .filter((c) => c.status === 'paid' || c.status === 'approved')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [myCommissions]);

  const pendingCommission = useMemo(() => {
    return myCommissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [myCommissions]);

  // ───────────────────────────────────────────────────────────────────────────
  // LEAD WIZARD SUBMIT HANDLER
  // ───────────────────────────────────────────────────────────────────────────
  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitLead({
      firstName: leadForm.firstName,
      lastName: leadForm.lastName,
      phone: leadForm.phone,
      email: leadForm.email,
      desiredCountry: leadForm.desiredCountry,
      desiredSubject: leadForm.desiredSubject,
      gpa: leadForm.gpa,
      englishScore: leadForm.englishScore
    });
    
    // Reset Modal
    setIsLeadModalOpen(false);
    setLeadStep(1);
    setLeadForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      educationLevel: 'Bachelor Completed',
      gpa: '',
      englishScore: 'IELTS 6.5',
      desiredCountry: 'Austria',
      desiredSubject: 'IT & Game Design',
      budgetRange: '€5,000–€10,000/year'
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // KANBAN DRAG & DROP HANDLERS
  // ───────────────────────────────────────────────────────────────────────────
  const kanbanStages: { status: ApplicationStatus; label: string; bg: string; text: string }[] = [
    { status: 'inquiry', label: 'Inquiries', bg: 'bg-slate-100', text: 'text-slate-700' },
    { status: 'applied', label: 'Applied', bg: 'bg-blue-50', text: 'text-blue-700' },
    { status: 'documents_submitted', label: 'Docs Uploaded', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    { status: 'offer_received', label: 'Offer Letter', bg: 'bg-purple-50', text: 'text-purple-700' },
    { status: 'visa_applied', label: 'Visa Filed', bg: 'bg-orange-50', text: 'text-orange-700' },
    { status: 'visa_approved', label: 'Visa Stamped', bg: 'bg-green-50', text: 'text-green-700' }
  ];

  const handleDragStart = (appId: string) => {
    setDraggedAppId(appId);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: ApplicationStatus) => {
    if (draggedAppId) {
      updateApplicationStatus(draggedAppId, status, currentUser?.id || 'staff-admin-1');
    }
    setDraggedAppId(null);
    setIsDragging(false);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // COMMISSION CLAIM HANDLER
  // ───────────────────────────────────────────────────────────────────────────
  const handleCommissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForClaim) return;
    claimCommission({
      agentId,
      applicationId: selectedAppForClaim,
      amount: claimAmount,
      currency: claimCurrency
    });
    setIsClaimModalOpen(false);
    setSelectedAppForClaim('');
    setInvoicePreview(false);
  };

  const eligibleForClaimApps = useMemo(() => {
    // Student applications that are at least 'offer_received', 'visa_approved', etc.
    return myApplications.filter(
      (app) => app.status === 'offer_received' || app.status === 'visa_approved' || app.status === 'enrolled'
    );
  }, [myApplications]);

  // ───────────────────────────────────────────────────────────────────────────
  // DETAILED SUB-VIEW RENDERER
  // ───────────────────────────────────────────────────────────────────────────
  const activePath = location.pathname;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* ── SUB-PAGE 1: LEADS MANAGEMENT WORKSPACE ── */}
      {activePath === '/portal/agent/students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Student Leads Directory</h2>
              <p className="text-xs text-gray-500">Track and manage student applications registered under your partner agency account.</p>
            </div>
            <button 
              onClick={() => setIsLeadModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#2D1B69] to-[#FD7E14] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Register Student Lead
            </button>
          </div>

          {/* Search bar and Filters */}
          <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search leads by name, email, or country preference..." 
              value={leadsSearch}
              onChange={(e) => setLeadsSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400"
            />
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6">Qualifications</th>
                    <th className="py-4 px-6">Desired Path</th>
                    <th className="py-4 px-6">Profile Build</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                  {myStudents
                    .filter((s) => {
                      const fullStr = `${s.firstName} ${s.lastName} ${s.desiredCountry} ${s.desiredSubject}`.toLowerCase();
                      return fullStr.includes(leadsSearch.toLowerCase());
                    })
                    .map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#2D1B69]/10 border border-[#2D1B69]/25 flex items-center justify-center font-extrabold text-[#2D1B69]">
                              {student.firstName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{student.firstName} {student.lastName}</div>
                              <div className="text-[10px] text-gray-400">ID: {student.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-gray-800">{student.educationLevel}</div>
                            <div className="text-[10px] text-gray-400">GPA: {student.gpa} | {student.englishScore}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full font-bold uppercase text-[9px] tracking-wider inline-block mb-1">
                              {student.desiredCountry}
                            </span>
                            <div className="text-gray-400 text-[10px] font-bold">{student.desiredSubject}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-400 to-[#2D1B69] rounded-full" 
                                style={{ width: `${student.profileCompletionPct}%` }}
                              />
                            </div>
                            <span className="font-bold text-gray-900">{student.profileCompletionPct}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link 
                            to="/portal/agent/applications"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-[#2D1B69] font-bold shadow-sm"
                          >
                            Track Applications <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  {myStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 text-sm font-semibold">
                        No registered student leads found. Let's register one!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-PAGE 2: INTERACTIVE KANBAN BOARD ── */}
      {activePath === '/portal/agent/applications' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Application Kanban Board</h2>
              <p className="text-xs text-gray-500">Drag & drop application cards across columns to coordinate stages dynamically.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-200/50 rounded-xl text-xs font-bold shadow-sm">
              <Clock className="w-4 h-4" /> Live State Sync Active
            </div>
          </div>

          {/* Kanban workspace */}
          <div className="flex flex-nowrap gap-4 items-start overflow-x-auto pb-6 snap-x">
            {kanbanStages.map((column) => {
              const stageApps = myApplications.filter((app) => app.status === column.status);
              
              return (
                <div 
                  key={column.status}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(column.status)}
                  className={`bg-gray-50 p-3 rounded-2xl border border-gray-150 flex flex-col gap-3 min-w-[200px] lg:min-h-[500px] transition-all duration-300 ${
                    isDragging ? 'hover:border-[#2D1B69]/30 hover:bg-purple-50/20' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex justify-between items-center px-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider ${column.text}`}>
                      {column.label}
                    </span>
                    <span className="px-2 py-0.5 bg-white text-gray-400 rounded-full font-bold text-[10px] shadow-sm border border-gray-150">
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="flex flex-col gap-3.5">
                    {stageApps.map((app) => (
                      <motion.div
                        layout
                        key={app.id}
                        draggable
                        onDragStart={() => handleDragStart(app.id)}
                        onDragEnd={() => { setIsDragging(false); setDraggedAppId(null); }}
                        className={`bg-white p-4 rounded-xl border border-gray-150 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all ${
                          draggedAppId === app.id ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 bg-[#2D1B69]/10 text-[#2D1B69] rounded-full font-bold text-[8px] uppercase tracking-wide">
                            {UNIVERSITIES.find((u) => u.id === app.universityId)?.country || 'Europe'}
                          </span>
                          <span className="text-[8px] font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">
                            96% Match
                          </span>
                        </div>
                        
                        <div className="font-extrabold text-xs text-gray-900 mb-1 leading-tight">{app.studentName}</div>
                        <div className="text-[10px] text-gray-600 font-semibold truncate">{app.programName}</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1 truncate">{app.universityName}</div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[9px] text-gray-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(app.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                      </motion.div>
                    ))}
                    
                    {stageApps.length === 0 && (
                      <div className="py-10 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center px-4">
                        <Grid className="w-5 h-5 text-gray-300 mb-1" />
                        <span className="text-[10px] text-gray-400 font-bold">Drop Lead Here</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUB-PAGE 3: B2B COMMISSIONS WORKSPACE ── */}
      {activePath === '/portal/agent/commissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Commissions & Invoices</h2>
              <p className="text-xs text-gray-500">Submit and track placement commission claims and B2B statements.</p>
            </div>
            <button 
              onClick={() => setIsClaimModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[#2D1B69] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Claim Commission
            </button>
          </div>

          {/* Odometer stat blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Earned</span>
                <div className="text-3xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
                  <span>€</span>
                  <CountUp end={totalCommissionEarned} duration={2} separator="," />
                </div>
                <span className="text-[10px] text-green-500 font-bold block mt-2">↑ Safe paid standard</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Payout</span>
                <div className="text-3xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
                  <span>€</span>
                  <CountUp end={pendingCommission} duration={2} separator="," />
                </div>
                <span className="text-[10px] text-gray-400 font-bold block mt-2">Awaiting partner audit</span>
              </div>
            </div>

            <div className="bg-[#2D1B69] p-6 rounded-3xl border border-white/5 text-white shadow-xl flex items-start gap-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
              <div className="p-3 bg-white/10 text-[#FFD700] rounded-2xl relative z-10">
                <Award className="w-6 h-6" />
              </div>
              <div className="relative z-10">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Agency Commission Tier</span>
                <div className="text-3xl font-black text-white mt-1 capitalize">{agentData.tier} Partner</div>
                <span className="text-[10px] text-[#FFD700] font-bold block mt-2">12% standard placement payout rate</span>
              </div>
            </div>
          </div>

          {/* Invoice Claims List */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-150">
              <h3 className="font-extrabold text-sm text-gray-900">Placement Invoicing History</h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Invoice ID</th>
                    <th className="py-4 px-6">Student Placment</th>
                    <th className="py-4 px-6">Claim Value</th>
                    <th className="py-4 px-6">Audit Status</th>
                    <th className="py-4 px-6 text-right">PDF Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                  {myCommissions.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-[#2D1B69]">
                        {claim.invoiceNumber}
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-bold text-gray-900">{claim.studentName}</div>
                          <div className="text-[10px] text-gray-400">{claim.universityName}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-extrabold text-gray-900">
                        {claim.currency} {claim.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                          claim.status === 'paid' 
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : claim.status === 'approved'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button className="p-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-500 shadow-sm inline-flex items-center gap-1 font-bold">
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                  {myCommissions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 text-sm font-semibold">
                        No placement commission claims filed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-PAGE 4: OVERVIEW DASHBOARD PANEL (DEFAULT) ── */}
      {activePath === '/portal/agent' && (
        <div className="space-y-8">
          {/* Welcome Agent Tier Banner */}
          <div className="bg-gradient-to-br from-[#2D1B69] via-[#3B2B85] to-[#1A0A00] p-8 rounded-[32px] border border-white/5 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
              backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} />
            
            <div className="space-y-3 relative z-10 max-w-xl">
              <span className="px-3 py-1 bg-gradient-to-r from-[#FFD700] to-amber-500 text-[#2D1B69] rounded-full font-black uppercase text-[10px] tracking-wider shadow-md">
                Verified Global Partner
              </span>
              <h2 className="text-3xl font-black tracking-tight leading-tight">Welcome, {currentUser?.firstName}</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Connect your students with partner institutions across Europe & Austria. Complete visual documents compliance checks to trigger offer letters in 48 hours.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 relative z-10 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
              <div className="w-12 h-12 rounded-xl bg-[#FFD700]/15 flex items-center justify-center font-black text-[#FFD700] text-xl">
                {agentData.tier.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Partnership Tier</div>
                <div className="text-base font-black text-white capitalize">{agentData.tier} Status</div>
              </div>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Total Leads Registered', value: myStudents.length, label: '+2 new this week', icon: Users, color: 'text-purple-600 bg-purple-50' },
              { title: 'Active Applications', value: myApplications.length, label: 'Safe status trackers', icon: GraduationCap, color: 'text-blue-600 bg-blue-50' },
              { title: 'Offer Letters Issued', value: myApplications.filter(a => a.status === 'offer_received').length, label: '98% Visas approved', icon: Briefcase, color: 'text-orange-600 bg-orange-50' },
              { title: 'Pending Commissions', value: `€${pendingCommission.toLocaleString()}`, label: 'Estimated pay in 15 days', icon: DollarSign, color: 'text-green-600 bg-green-50' },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.title} className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${metric.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{metric.title}</span>
                    <div className="text-2xl font-black text-gray-900 mt-1">{metric.value}</div>
                    <span className="text-[10px] text-gray-400 font-bold block mt-2">{metric.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.1fr] gap-6">
            
            {/* Quick Applications Track Table */}
            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-6 border-b border-gray-150 flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900">Recent Applications Pipeline</h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-1">Status changes of leads submitted by your agency.</p>
                  </div>
                  <Link to="/portal/agent/applications" className="text-xs font-bold text-[#2D1B69] hover:underline flex items-center gap-1">
                    Open Kanban <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Student</th>
                        <th className="py-3.5 px-6">Course / University</th>
                        <th className="py-3.5 px-6">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                      {myApplications.slice(0, 3).map((app) => (
                        <tr key={app.id}>
                          <td className="py-4 px-6 font-bold text-gray-900">{app.studentName}</td>
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-bold text-gray-800">{app.programName}</div>
                              <div className="text-[9px] text-gray-400">{app.universityName}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                              {app.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {myApplications.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-400 font-semibold">
                            No student applications submitted yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border-t border-gray-150 text-center bg-gray-50/50">
                <Link to="/portal/agent/students" className="text-xs font-extrabold text-gray-600 hover:text-[#2D1B69] flex items-center justify-center gap-1">
                  View All Student Leads <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* B2B Partner Resources */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 mb-1">Partner Resource Center</h3>
                <p className="text-[10px] text-gray-400 font-semibold mb-4">Official marketing resources and checklists certified by ICEF and TGA.</p>
                
                <div className="space-y-3">
                  {[
                    { title: 'TGA Austria Study Guide 2026', type: 'PDF Guide', icon: FileText, size: '2.4 MB' },
                    { title: 'Embassy Document Checklist', type: 'Excel template', icon: BookOpen, size: '1.2 MB' },
                    { title: 'Estonia MBA Exclusives Brochure', type: 'Brochure PDF', icon: Sparkles, size: '5.8 MB' }
                  ].map((res) => (
                    <div key={res.title} className="p-3 border border-gray-100 rounded-xl flex items-center justify-between hover:border-gray-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 text-[#2D1B69] rounded-lg">
                          <res.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-[11px] text-gray-900 leading-tight">{res.title}</div>
                          <div className="text-[9px] text-gray-400 font-bold mt-0.5">{res.type} | {res.size}</div>
                        </div>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-[#2D1B69]">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <a 
                  href="https://theglobalavenues.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 border border-gray-150 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  Visit Main Website <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>
          
          {/* Agent Activity Feed */}
          <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm">
            <h3 className="font-extrabold text-sm text-gray-900 mb-1">Recent Activity</h3>
            <p className="text-[10px] text-gray-400 font-semibold mb-4">Roll-up of recent actions in your agency network.</p>
            <ActivityFeedWidget rolePrefix="agent" />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          MODALS & WIZARDS
          ─────────────────────────────────────────────────────────────────────────── */}
      
      {/* MODAL 1: REGISTER LEAD WIZARD (3 STEPS) */}
      <AnimatePresence>
        {isLeadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Form Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-xl overflow-hidden relative z-10"
            >
              <div className="bg-[#2D1B69] p-6 text-white relative">
                <h3 className="text-lg font-black">Register Student Lead</h3>
                <p className="text-xs text-white/75 mt-1">Submit academic credentials to map global study opportunities.</p>
                <div className="absolute top-6 right-6 text-xs font-bold text-[#FFD700] uppercase tracking-wider bg-white/10 px-2 py-1 rounded-md">
                  Step {leadStep} of 3
                </div>
              </div>

              <form onSubmit={handleLeadSubmit} className="p-6 space-y-6">
                
                {/* STEP 1: GENERAL INFO */}
                {leadStep === 1 && (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">First Name</label>
                        <input 
                          type="text" 
                          required
                          value={leadForm.firstName}
                          onChange={(e) => setLeadForm({ ...leadForm, firstName: e.target.value })}
                          placeholder="Aarav"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Last Name</label>
                        <input 
                          type="text" 
                          required
                          value={leadForm.lastName}
                          onChange={(e) => setLeadForm({ ...leadForm, lastName: e.target.value })}
                          placeholder="Sharma"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={leadForm.email}
                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                        placeholder="aarav.sharma@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone / WhatsApp Number</label>
                      <input 
                        type="tel" 
                        required
                        value={leadForm.phone}
                        onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: ACADEMIC CREDENTIALS */}
                {leadStep === 2 && (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Highest Education Completed</label>
                      <select
                        value={leadForm.educationLevel}
                        onChange={(e) => setLeadForm({ ...leadForm, educationLevel: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                      >
                        <option value="High School">High School completed (12th Std)</option>
                        <option value="Bachelor Completed">Bachelor completed (Undergrad)</option>
                        <option value="Master Completed">Master completed (Postgrad)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cumulative GPA / Score</label>
                        <input 
                          type="text" 
                          required
                          value={leadForm.gpa}
                          onChange={(e) => setLeadForm({ ...leadForm, gpa: e.target.value })}
                          placeholder="e.g. 85% or 8.2 CGPA"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">English Language Score</label>
                        <input 
                          type="text" 
                          required
                          value={leadForm.englishScore}
                          onChange={(e) => setLeadForm({ ...leadForm, englishScore: e.target.value })}
                          placeholder="e.g. IELTS 6.5 or Duolingo 120"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: PREFERENCES */}
                {leadStep === 3 && (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Target Study Destination</label>
                        <select
                          value={leadForm.desiredCountry}
                          onChange={(e) => setLeadForm({ ...leadForm, desiredCountry: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                        >
                          <option value="Austria">Austria 🇦🇹 (Highly Recommended)</option>
                          <option value="Estonia">Estonia 🇪🇪</option>
                          <option value="France">France 🇫🇷</option>
                          <option value="Germany">Germany 🇩🇪</option>
                          <option value="United States">United States 🇺🇸</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Desired Field Area</label>
                        <select
                          value={leadForm.desiredSubject}
                          onChange={(e) => setLeadForm({ ...leadForm, desiredSubject: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                        >
                          <option value="IT & Game Design">IT & Game Design</option>
                          <option value="Business & Management">Business & Management (MBA)</option>
                          <option value="Medicine & Health">Medicine & Health sciences</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Annual Tuition Budget</label>
                      <select
                        value={leadForm.budgetRange}
                        onChange={(e) => setLeadForm({ ...leadForm, budgetRange: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69] transition-all"
                      >
                        <option value="€5,000–€10,000/year">€5,000 to €10,000 / year (Standard Public)</option>
                        <option value="€10,000–€20,000/year">€10,000 to €20,000 / year</option>
                        <option value="€20,000+/year">€20,000+ / year (Premium/Medicine)</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Wizard buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  {leadStep > 1 ? (
                    <button 
                      type="button" 
                      onClick={() => setLeadStep(leadStep - 1)}
                      className="px-5 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {leadStep < 3 ? (
                    <button 
                      type="button" 
                      onClick={() => setLeadStep(leadStep + 1)}
                      className="px-6 py-2.5 bg-[#2D1B69] text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                      Continue
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      className="px-6 py-2.5 bg-gradient-to-r from-[#2D1B69] to-[#FD7E14] text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                      Verify & Submit Lead
                    </button>
                  )}
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: COMMISSION CLAIM & VISUAL INVOICE GENERATOR */}
      <AnimatePresence>
        {isClaimModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClaimModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Claim Content Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-2xl overflow-hidden relative z-10"
            >
              <div className="bg-[#2D1B69] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black">Submit Commission Claim</h3>
                  <p className="text-xs text-white/75 mt-1">Generate a B2B placement invoice statement for certified leads.</p>
                </div>
                <CreditCard className="w-8 h-8 text-[#FFD700]" />
              </div>

              <form onSubmit={handleCommissionSubmit} className="p-6 space-y-6">
                
                {/* Selector */}
                {!invoicePreview ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Select Eligible Placed Student</label>
                      <select 
                        required
                        value={selectedAppForClaim}
                        onChange={(e) => setSelectedAppForClaim(e.target.value)}
                        className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#2D1B69]"
                      >
                        <option value="">-- Choose registered candidate --</option>
                        {eligibleForClaimApps.map((app) => (
                          <option key={app.id} value={app.id}>
                            {app.studentName} - {app.universityName} ({app.programName})
                          </option>
                        ))}
                      </select>
                      {eligibleForClaimApps.length === 0 && (
                        <div className="text-[10px] text-orange-500 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5" /> No students currently eligible. Placed candidates must be issued an offer letter or be enrolled.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Calculated Payout Amount</label>
                        <input 
                          type="number" 
                          required
                          value={claimAmount}
                          onChange={(e) => setClaimAmount(Number(e.target.value))}
                          placeholder="1500"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Currency</label>
                        <select
                          value={claimCurrency}
                          onChange={(e) => setClaimCurrency(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                        >
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50/50 border border-[#2D1B69]/10 rounded-2xl text-[11px] leading-relaxed text-gray-600 space-y-1">
                      <div className="font-extrabold text-[#2D1B69] flex items-center gap-1 mb-1">
                        <Award className="w-4 h-4" /> B2B Partner Rule Policy:
                      </div>
                      <div>• Bronze Tier Partners earn standard €1,000 per public European placement.</div>
                      <div>• Silver Tier Partners earn standard €1,200 per placement.</div>
                      <div>• Gold Tier Partners earn exclusive €1,500 premium payout (which applies to your account).</div>
                    </div>

                    <button 
                      type="button"
                      disabled={!selectedAppForClaim}
                      onClick={() => setInvoicePreview(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#2D1B69] rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
                    >
                      <FilePlus className="w-4 h-4" /> Draft Visual Invoice Statement
                    </button>
                  </div>
                ) : (
                  // B2B Visual Invoice draft template
                  <div className="space-y-6">
                    <div className="border border-gray-200 p-6 rounded-2xl bg-[#FCFCFD] text-[10px] space-y-6 shadow-inner font-mono text-gray-700">
                      
                      {/* Header */}
                      <div className="flex justify-between items-start pb-4 border-b border-gray-150">
                        <div>
                          <div className="font-extrabold text-sm text-gray-900 font-sans tracking-tight">The Global Avenues B2B</div>
                          <div className="text-[9px] mt-0.5">Premium Placement Network</div>
                          <div className="text-[9px] text-gray-400 mt-1">Tax Code: IN-GST-8928A</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-gray-900 uppercase">DRAFT INVOICE</div>
                          <div className="mt-1 font-bold text-gray-400">No. TGA-DRAFT-{Date.now().toString().slice(-4)}</div>
                          <div className="text-gray-400">Date: {new Date().toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Addresses */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="font-bold text-gray-400 uppercase text-[8px] tracking-wider">Bill To:</div>
                          <div className="font-extrabold text-gray-800 font-sans mt-0.5">The Global Avenues CRM</div>
                          <div>New Delhi Secretariat Hub</div>
                          <div>Delhi, India</div>
                        </div>
                        <div>
                          <div className="font-bold text-gray-400 uppercase text-[8px] tracking-wider">Issued By:</div>
                          <div className="font-extrabold text-gray-800 font-sans mt-0.5">{agentData.agencyName}</div>
                          <div>Partner Country: {agentData.agencyCountry}</div>
                          <div>Reg No: {agentData.registrationNumber}</div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-[3fr_1fr] font-bold text-gray-400 border-b border-gray-150 pb-1 text-[8px] uppercase tracking-wider">
                          <span>Description</span>
                          <span className="text-right">Amount</span>
                        </div>
                        <div className="grid grid-cols-[3fr_1fr] font-extrabold text-gray-800 py-1 leading-relaxed">
                          <div>
                            <div>B2B Placement Incentive Commission: {
                              myApplications.find((a) => a.id === selectedAppForClaim)?.studentName
                            }</div>
                            <div className="text-[8px] text-gray-400 font-normal">University placement: {
                              myApplications.find((a) => a.id === selectedAppForClaim)?.universityName
                            }</div>
                          </div>
                          <span className="text-right font-sans text-xs">{claimCurrency} {claimAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="border-t border-gray-150 pt-3 flex justify-between items-center text-xs font-black text-gray-900 font-sans">
                        <span>TOTAL CLAIM DUE</span>
                        <span>{claimCurrency} {claimAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end items-center">
                      <button 
                        type="button"
                        onClick={() => setInvoicePreview(false)}
                        className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                      >
                        Edit Details
                      </button>
                      <button 
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-[#2D1B69] to-[#FD7E14] text-white rounded-xl font-bold hover:shadow-lg transition-all"
                      >
                        Submit Official B2B Payout Claim
                      </button>
                    </div>
                  </div>
                )}

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-LINKED HELPER FOR RESOLVING UNIVERSITIES LOCAL CACHE
// ─────────────────────────────────────────────────────────────────────────────
const UNIVERSITIES = [
  { id: 'fh-kufstein-tirol', country: 'Austria' },
  { id: 'euas', country: 'Estonia' },
  { id: 'st-georges-university', country: 'United States' }
];