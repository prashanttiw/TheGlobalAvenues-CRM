import { useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { ApplicationStatus, Application, Agent, Program, User } from '../../types';
import { 
  Building2, Users2, FileText, CheckCircle2, TrendingUp, 
  Search, Eye, Edit3, ArrowUpRight, GraduationCap, CheckCircle, 
  Clock, AlertTriangle, UserCheck, ShieldAlert, Award, Globe, Plus, Trash2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_DATA = [
  { month: 'Jan', applications: 120, visas: 95 },
  { month: 'Feb', applications: 150, visas: 110 },
  { month: 'Mar', applications: 220, visas: 180 },
  { month: 'Apr', applications: 310, visas: 260 },
  { month: 'May', applications: 458, visas: 410 },
];

export function AdminDashboardPage() {
  const location = useLocation();

  // Zustand Store hooks
  const currentUser = useStore((state) => state.currentUser);
  const applications = useStore((state) => state.applications);
  const students = useStore((state) => state.students);
  const agents = useStore((state) => state.agents);
  const users = useStore((state) => state.users);
  const programs = useStore((state) => state.programs);
  const documents = useStore((state) => state.documents);

  const updateApplicationStatus = useStore((state) => state.updateApplicationStatus);
  const approveAgent = useStore((state) => state.approveAgent);
  const verifyDocument = useStore((state) => state.verifyDocument);

  // ───────────────────────────────────────────────────────────────────────────
  // STATE DEFINITIONS FOR ADMIN DYNAMICS
  // ───────────────────────────────────────────────────────────────────────────
  
  // 1. Pipeline Index filters
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineStageFilter, setPipelineStageFilter] = useState('all');

  // 2. Stage Transition Checklist Modal State
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [targetStage, setTargetStage] = useState<ApplicationStatus | null>(null);
  const [checklistChecks, setChecklistChecks] = useState<Record<string, boolean>>({});

  // 3. Program Adder Modal State
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: '',
    universityId: 'fh-kufstein-tirol',
    universityName: 'FH Kufstein Tirol',
    degreeLevel: 'Bachelor',
    subjectArea: 'IT & Game Design',
    durationMonths: 36,
    tuitionFee: '€363/semester',
    currency: 'EUR',
    englishRequirement: 'IELTS 6.0',
    applicationFee: '€0',
    scholarshipAvailable: true
  });

  // Calculate high-density admin metrics
  const metrics = useMemo(() => {
    return {
      totalApps: applications.length,
      activeAgents: agents.filter(a => a.status === 'approved').length,
      pendingAgentsCount: agents.filter(a => a.status === 'pending').length,
      visaSuccessPct: 98,
      verifiedDocsCount: documents.filter(d => d.verified).length,
      totalDocsCount: documents.length
    };
  }, [applications, agents, documents]);

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE CHECKLIST RESOLVER
  // ───────────────────────────────────────────────────────────────────────────
  const getRequiredChecksForStage = (stage: ApplicationStatus, appId: string) => {
    const appDocs = documents.filter((d) => d.applicationId === appId);
    
    switch (stage) {
      case 'applied':
        return [
          { id: 'passport', label: 'Valid Passport Document uploaded', status: appDocs.some(d => d.documentType === 'Passport') },
          { id: 'academic_12', label: '12th Marksheet verified and stamped', status: appDocs.some(d => d.documentType === 'Marksheet') || true }
        ];
      case 'documents_submitted':
        return [
          { id: 'english', label: 'English language proficiency certificate (IELTS/TOEFL) uploaded', status: appDocs.some(d => d.documentType === 'IELTS Marksheet') },
          { id: 'transcripts', label: 'All higher academic transcripts verified', status: true }
        ];
      case 'offer_received':
        return [
          { id: 'uni_fee', label: 'University application fee clearing paid', status: true },
          { id: 'eligibility', label: 'Target subject pre-requisites matched and audited', status: true }
        ];
      case 'visa_applied':
        return [
          { id: 'bank_statement', label: 'Minimum solvency financial statements signed', status: true },
          { id: 'vfs_file', label: 'VFS Visa appointment slot confirmed', status: true }
        ];
      case 'visa_approved':
        return [
          { id: 'stamp_photo', label: 'Schengen passport stamping photo verified', status: true },
          { id: 'fee_cleared', label: 'Agent commission invoice statement verified', status: true }
        ];
      default:
        return [];
    }
  };

  const handleStageSelect = (appId: string, stage: ApplicationStatus) => {
    setSelectedAppId(appId);
    setTargetStage(stage);
    
    // Resolve checks
    const checks = getRequiredChecksForStage(stage, appId);
    const checksState: Record<string, boolean> = {};
    checks.forEach((c) => {
      checksState[c.id] = c.status;
    });
    setChecklistChecks(checksState);
    
    setIsChecklistModalOpen(true);
  };

  const handleConfirmStageTransition = () => {
    if (selectedAppId && targetStage) {
      updateApplicationStatus(selectedAppId, targetStage, currentUser?.id || 'staff-admin-1');
    }
    setIsChecklistModalOpen(false);
    setSelectedAppId(null);
    setTargetStage(null);
  };

  // Filter application pipeline
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch = 
        app.studentName.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
        app.universityName.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
        app.programName.toLowerCase().includes(pipelineSearch.toLowerCase());
      
      const matchesStage = pipelineStageFilter === 'all' || app.status === pipelineStageFilter;
      
      return matchesSearch && matchesStage;
    });
  }, [applications, pipelineSearch, pipelineStageFilter]);

  // Handler for B2B agent approval
  const handleApproveAgent = (agentId: string) => {
    approveAgent(agentId, currentUser?.id || 'staff-admin-1');
  };

  // Handler for university program adder
  const handleAddProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const newProgRecord: Program = {
      id: `prog-${Date.now()}`,
      universityId: newProgram.universityId,
      universityName: newProgram.universityName,
      name: newProgram.name,
      degreeLevel: newProgram.degreeLevel,
      subjectArea: newProgram.subjectArea,
      durationMonths: Number(newProgram.durationMonths),
      tuitionFee: newProgram.tuitionFee,
      currency: newProgram.currency,
      englishRequirement: newProgram.englishRequirement,
      applicationFee: newProgram.applicationFee,
      scholarshipAvailable: newProgram.scholarshipAvailable,
      intakeMonths: ['September', 'February']
    };
    
    // Add to program mock state
    programs.push(newProgRecord);
    setIsProgramModalOpen(false);
  };

  const activePath = location.pathname;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* ── SUB-PAGE 1: OVERVIEW COCKPIT ── */}
      {activePath === '/portal/admin' && (
        <div className="space-y-8">
          
          {/* KPI Dashboard Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'Global Applications Placed', value: metrics.totalApps, sub: 'All paths mapped', icon: FileText, color: 'text-purple-600 bg-purple-50' },
              { title: 'Active B2B Agencies', value: metrics.activeAgents, sub: `${metrics.pendingAgentsCount} pending review`, icon: Users2, color: 'text-blue-600 bg-blue-50' },
              { title: 'Solvency Success Rate', value: `${metrics.visaSuccessPct}%`, sub: 'ICEF Certified standard', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
              { title: 'Partner University MOUs', value: 3, sub: 'Exclusives network', icon: Building2, color: 'text-[#FD7E14] bg-[#FD7E14]/10' },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.title} className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                  <div className={`p-3 rounded-xl ${kpi.color} shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{kpi.title}</span>
                    <div className="text-2xl font-black text-gray-900 mt-1">{kpi.value}</div>
                    <div className="text-[10px] text-gray-400 font-bold mt-2">{kpi.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-6">
            
            {/* Volume charts */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-black text-gray-900">Placements & Visa Volume</h3>
                  <p className="text-xs text-gray-400">Monthly breakdown of student registrations across EU semesters.</p>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> ICEF Audit Live
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D1B69" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2D1B69" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorVisas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FD7E14" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#FD7E14" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#0F0B1F', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="applications" stroke="#2D1B69" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" name="Applications" />
                    <Area type="monotone" dataKey="visas" stroke="#FD7E14" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVisas)" name="Visa Grants" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pending approvals side drawer */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 mb-1">B2B Agent Queue</h3>
                <p className="text-xs text-gray-400 mb-4">Pending registrations from regional B2B student recruiters.</p>
                
                <div className="space-y-4">
                  {agents.filter(a => a.status === 'pending').map((agent) => (
                    <div key={agent.id} className="p-4 border border-gray-100 bg-gray-50/50 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-xs text-gray-900">{agent.agencyName}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{agent.agencyCountry} • Reg: {agent.registrationNumber}</div>
                      </div>
                      <button 
                        onClick={() => handleApproveAgent(agent.id)}
                        className="px-3.5 py-1.5 bg-[#2D1B69] hover:bg-[#FD7E14] text-white rounded-lg text-[10px] font-black tracking-wider transition-colors shadow-sm"
                      >
                        Approve
                      </button>
                    </div>
                  ))}

                  {agents.filter(a => a.status === 'pending').length === 0 && (
                    <div className="py-12 text-center text-gray-400 flex flex-col items-center">
                      <CheckCircle className="w-8 h-8 text-green-500 mb-2 animate-bounce" />
                      <span className="text-xs font-bold">Queue completely verified!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── SUB-PAGE 2: DETAILED PIPELINE FILTER & TABLE ── */}
      {activePath === '/portal/admin/pipeline' && (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
          
          <div className="p-6 border-b border-gray-150 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900">Stage transition command funnel</h3>
              <p className="text-xs text-gray-400">Strictly verify documents checklist conditions before promoting stages.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl w-60">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Filter pipeline candidates..." 
                  value={pipelineSearch}
                  onChange={e => setPipelineSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full placeholder:text-gray-400" 
                />
              </div>

              <select
                value={pipelineStageFilter}
                onChange={e => setPipelineStageFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-650 outline-none"
              >
                <option value="all">All Stages</option>
                <option value="inquiry">Inquiries</option>
                <option value="applied">Applied</option>
                <option value="documents_submitted">Docs Uploaded</option>
                <option value="offer_received">Offer Letter</option>
                <option value="visa_applied">Visa Filed</option>
                <option value="visa_approved">Visa Granted</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Student Placment</th>
                  <th className="py-3.5 px-6">Assigned Program / Uni</th>
                  <th className="py-3.5 px-6">Pipeline Stage</th>
                  <th className="py-3.5 px-6">Verification Date</th>
                  <th className="py-3.5 px-6 text-right">Coordinate Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2D1B69]/10 border border-[#2D1B69]/25 flex items-center justify-center font-extrabold text-[#2D1B69]">
                          {app.studentName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{app.studentName}</div>
                          <div className="text-[10px] text-gray-400">ID: {app.studentId}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#2D1B69] shrink-0" />
                        <div>
                          <div className="font-bold text-gray-800">{app.programName}</div>
                          <div className="text-[10px] text-gray-400">{app.universityName}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                        app.status === 'visa_approved'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : app.status === 'offer_received'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-gray-400 font-bold">
                      {new Date(app.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <select
                        value={app.status}
                        onChange={(e) => handleStageSelect(app.id, e.target.value as ApplicationStatus)}
                        className="p-1.5 px-2 border border-gray-200 rounded-lg text-[10px] font-black text-gray-600 bg-white shadow-sm outline-none"
                      >
                        <option value="inquiry">Inquiry</option>
                        <option value="applied">Applied</option>
                        <option value="documents_submitted">Docs Uploaded</option>
                        <option value="offer_received">Offer Letter</option>
                        <option value="visa_applied">Visa Filed</option>
                        <option value="visa_approved">Visa Approved</option>
                        <option value="visa_rejected">Visa Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredApps.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 font-semibold">
                      No matching student pipelines found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ── SUB-PAGE 3: ACCOUNT PERMISSIONS DIRECTORY ── */}
      {activePath === '/portal/admin/users' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black text-gray-900">User & B2B Recruiter Directory</h2>
            <p className="text-xs text-gray-500">Configure global partner agent tiers and review counsellor registrations.</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-6">User Account</th>
                    <th className="py-4 px-6">Assigned Role</th>
                    <th className="py-4 px-6">Security Permissions</th>
                    <th className="py-4 px-6 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-bold text-gray-900">{u.firstName} {u.lastName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{u.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-800 capitalize">
                        {u.role.replace('_', ' ')}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-bold text-[9px] uppercase tracking-wider">
                          {u.role === 'admin' || u.role === 'super_admin' ? 'SYSTEM SUPERUSER' : 'PARTNER API RESTRICTED'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase ${
                          u.status === 'active' ? 'text-green-500' : 'text-orange-500'
                        }`}>
                          <CheckCircle className="w-4.5 h-4.5" /> Verified Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-PAGE 4: UNIVERSITY PROGRAM PORTAL ── */}
      {activePath === '/portal/admin/universities' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">Partner university MOU databases</h2>
              <p className="text-xs text-gray-500">Configure global tuition fees, program requirements, and intake options.</p>
            </div>
            <button 
              onClick={() => setIsProgramModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2D1B69] hover:bg-[#FD7E14] text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add University Program
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
            
            {/* List of active exclusive institutions */}
            <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-gray-900 border-b border-gray-100 pb-2">Active exclusive MOUs</h3>
              {[
                { name: 'FH Kufstein Tirol', country: 'Austria 🇦🇹', type: 'exclusive' },
                { name: 'EUAS Tallinn', country: 'Estonia 🇪🇪', type: 'exclusive' },
                { name: "St. George's University", country: 'United States 🇺🇸', type: 'non_exclusive' }
              ].map((uni) => (
                <div key={uni.name} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-gray-800">{uni.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold mt-0.5">{uni.country}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full tracking-wider ${
                    uni.type === 'exclusive' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {uni.type}
                  </span>
                </div>
              ))}
            </div>

            {/* List of active academic courses */}
            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-150 bg-gray-50/50">
                <h3 className="font-extrabold text-sm text-gray-900">Academic Intake Matrix</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-6">Program Name</th>
                      <th className="py-3 px-6">Institution</th>
                      <th className="py-3 px-6">Tuition Fee</th>
                      <th className="py-3 px-6">Intake Months</th>
                      <th className="py-3 px-6 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                    {programs.map((prog) => (
                      <tr key={prog.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-6">
                          <div>
                            <div className="font-bold text-gray-900">{prog.name}</div>
                            <div className="text-[9px] text-gray-400">{prog.degreeLevel} • {prog.englishRequirement}</div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-bold text-gray-850">
                          {prog.universityName}
                        </td>
                        <td className="py-3.5 px-6 text-[#2D1B69] font-black">
                          {prog.tuitionFee}
                        </td>
                        <td className="py-3.5 px-6 font-bold text-gray-400">
                          {prog.intakeMonths.join(', ')}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button className="p-1 hover:text-red-500 text-gray-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          MODALS & DIALOG DRAWERS
          ─────────────────────────────────────────────────────────────────────────── */}
      
      {/* DIALOG 1: STAGE CHECKLIST VERIFICATION TRANSITION MODAL */}
      <AnimatePresence>
        {isChecklistModalOpen && selectedAppId && targetStage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChecklistModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="bg-[#2D1B69] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black">Mandatory Document checklist</h3>
                  <p className="text-xs text-white/70 mt-1">Verify required files for target stage: <span className="text-[#FFD700] uppercase font-bold">{targetStage.replace('_', ' ')}</span></p>
                </div>
                <AlertTriangle className="w-8 h-8 text-[#FFD700]" />
              </div>

              <div className="p-6 space-y-6">
                
                {/* List checks */}
                <div className="space-y-4">
                  {getRequiredChecksForStage(targetStage, selectedAppId).map((check) => (
                    <div 
                      key={check.id}
                      onClick={() => setChecklistChecks({ ...checklistChecks, [check.id]: !checklistChecks[check.id] })}
                      className={`p-3.5 border rounded-2xl flex items-start gap-3 cursor-pointer transition-all ${
                        checklistChecks[check.id]
                          ? 'border-green-200 bg-green-50/50 text-green-800'
                          : 'border-orange-200 bg-orange-50/20 text-orange-850'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={!!checklistChecks[check.id]}
                        onChange={() => {}}
                        className="mt-0.5 cursor-pointer accent-green-600"
                      />
                      <div>
                        <div className="font-extrabold text-[11px] leading-tight">{check.label}</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1">
                          {check.status ? '✓ File system validated' : '⚠️ Missing upload proof'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {getRequiredChecksForStage(targetStage, selectedAppId).length === 0 && (
                    <div className="py-6 text-center text-gray-450 font-bold">
                      No mandatory document parameters configured for this target stage. Direct transition approved.
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end items-center pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => setIsChecklistModalOpen(false)}
                    className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmStageTransition}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#2D1B69] to-[#FD7E14] text-white rounded-xl font-bold hover:shadow-lg transition-all"
                  >
                    Audit & Pass Transition
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 2: UNIVERSITY PROGRAM ADDER DRAWER */}
      <AnimatePresence>
        {isProgramModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProgramModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="bg-[#2D1B69] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black">Configure new University Program</h3>
                  <p className="text-xs text-white/70 mt-1">Configure admission rules and tuition values.</p>
                </div>
                <X 
                  onClick={() => setIsProgramModalOpen(false)}
                  className="w-5 h-5 text-white/50 hover:text-white cursor-pointer" 
                />
              </div>

              <form onSubmit={handleAddProgram} className="p-6 space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Program Course Name</label>
                  <input 
                    type="text"
                    required
                    value={newProgram.name}
                    onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                    placeholder="MSc Artificial Intelligence & Analytics"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Target University</label>
                    <select
                      value={newProgram.universityId}
                      onChange={(e) => {
                        const uniId = e.target.value;
                        const name = uniId === 'fh-kufstein-tirol' ? 'FH Kufstein Tirol' : uniId === 'euas' ? 'EUAS Tallinn' : "St. George's University";
                        setNewProgram({ ...newProgram, universityId: uniId, universityName: name });
                      }}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="fh-kufstein-tirol">FH Kufstein Tirol 🇦🇹</option>
                      <option value="euas">EUAS Tallinn 🇪🇪</option>
                      <option value="st-georges-university">St. George's University 🇺🇸</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Degree Level</label>
                    <select
                      value={newProgram.degreeLevel}
                      onChange={(e) => setNewProgram({ ...newProgram, degreeLevel: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="Bachelor">Bachelor</option>
                      <option value="Master / MBA">Master / MBA</option>
                      <option value="Doctoral">Doctoral</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Annual Tuition Fee</label>
                    <input 
                      type="text"
                      required
                      value={newProgram.tuitionFee}
                      onChange={(e) => setNewProgram({ ...newProgram, tuitionFee: e.target.value })}
                      placeholder="e.g. €363/semester"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">English Language Pre-requisite</label>
                    <input 
                      type="text"
                      required
                      value={newProgram.englishRequirement}
                      onChange={(e) => setNewProgram({ ...newProgram, englishRequirement: e.target.value })}
                      placeholder="e.g. IELTS 6.0"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setIsProgramModalOpen(false)}
                    className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-[#2D1B69] to-[#FD7E14] text-white rounded-xl font-bold hover:shadow-lg transition-all"
                  >
                    Save Program MOU
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
