import { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { ApplicationStatus } from '../types';
import { 
  User as UserIcon, Bell, Sparkles, Award, FileText, CheckCircle2, 
  ArrowRight, ShieldCheck, HelpCircle, Compass, HelpCircle as QuizIcon, BookOpen, AlertCircle, FileCheck, Plane
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';

// Journey map stages mapping TGA pipeline
const JOURNEY_STAGES: { status: ApplicationStatus; label: string; desc: string }[] = [
  { status: 'inquiry', label: 'Inquiry', desc: 'Consulting initiated' },
  { status: 'applied', label: 'Applied', desc: 'Slot booked' },
  { status: 'documents_submitted', label: 'Docs Uploaded', desc: 'Compliance cleared' },
  { status: 'offer_received', label: 'Offer Received', desc: 'MOU fast-track priority' },
  { status: 'enrolled', label: 'Enrolled', desc: 'Confirmed slot' },
  { status: 'visa_applied', label: 'Visa Filed', desc: 'ICEF certified file submit' },
  { status: 'visa_approved', label: 'Visa Approved', desc: 'STAMP GRANTED 🇬🇧' },
  { status: 'departed', label: 'Departed', desc: 'Journey begins!' },
];

export function StudentDashboardPage() {
  const currentUser = useStore((state) => state.currentUser);
  const students = useStore((state) => state.students);
  const applications = useStore((state) => state.applications);
  const documents = useStore((state) => state.documents);
  const badges = useStore((state) => state.badges);
  const studentBadges = useStore((state) => state.studentBadges);
  const uploadDocument = useStore((state) => state.uploadDocument);
  const updateApplicationStatus = useStore((state) => state.updateApplicationStatus);
  const programs = useStore((state) => state.programs);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'quiz' | 'documents' | 'visa'>('dashboard');
  const [selectedNode, setSelectedNode] = useState<number>(3); // default highlight Offer Received

  // Quiz Wizard states
  const [quizStep, setQuizStep] = useState(1);
  const [quizData, setQuizData] = useState({ country: 'Austria', subject: 'IT & Game Design', budget: '€5,000–€10,000/year', gpa: '90%' });
  const [matchedPrograms, setMatchedPrograms] = useState<any[]>([]);

  // VFS country filter
  const [vfsCountry, setVfsCountry] = useState('Austria');

  const student = students.find((s) => s.userId === currentUser?.id) || students[0];
  const activeApps = applications.filter((a) => a.studentId === student.id);
  const app = activeApps[0] || applications[0]; // main active application

  // Sync journey node state based on primary active application status
  useEffect(() => {
    if (app) {
      const idx = JOURNEY_STAGES.findIndex(s => s.status === app.status);
      if (idx !== -1) setSelectedNode(idx);
    }
  }, [app]);

  // Quiz calculations
  const handleQuizSubmit = () => {
    // Generate matches based on student preferred fields
    const filtered = programs.filter(p => p.subjectArea === quizData.subject || p.desiredCountry === quizData.country);
    setMatchedPrograms(filtered.map(p => ({
      ...p,
      matchPct: Math.floor(90 + Math.random() * 8), // premium high compatibility score
    })));
    setQuizStep(4);
    toast.success('AI Matching completed! Matches short-listed below.');
  };

  const handleDocUpload = (docType: string) => {
    const fileName = `${docType.toLowerCase().replace(/ /g, '_')}_aarav.pdf`;
    uploadDocument(app.id, docType, fileName);
    toast.success(`Successfully uploaded ${docType} to secure vault!`);
  };

  // Determine milestone completion details
  const currentStageIndex = JOURNEY_STAGES.findIndex((s) => s.status === app?.status);

  return (
    <div className="min-h-screen bg-[#F8F7FF] pt-24 pb-12">
      <Toaster position="top-center" richColors />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* ── Welcome Header ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-gray-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D1B69] to-[#C94D1B] flex items-center justify-center font-extrabold text-white text-xl shadow-lg border border-white/10 shrink-0">
              {student.firstName.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">Welcome back, {student.firstName}!</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-[#2D1B69] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Student Console</span>
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">ID: TGA-0929</span>
              </div>
            </div>
          </div>

          {/* Gamification Points & Active Badge HUD */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-150 rounded-2xl p-3 shrink-0">
            <div className="text-center pr-3 border-r border-gray-200">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Journey Points</div>
              <div className="text-xl font-black text-[#2D1B69] mt-0.5 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin-slow" />
                {student.gamificationPoints}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Title</div>
              <div className="text-xs font-black text-gray-800 mt-1 flex items-center gap-1 bg-[#FFD700]/10 border border-[#FFD700]/30 px-2.5 py-0.5 rounded-full">
                <span>🌍 Explorer</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Sub Navigation Tabs ── */}
        <div className="flex overflow-x-auto gap-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm shrink-0">
          {[
            { id: 'dashboard', label: 'Study Journey Dashboard', icon: Compass },
            { id: 'quiz', label: 'AI Course Finder Quiz', icon: QuizIcon },
            { id: 'documents', label: 'Document Vault', icon: FileText },
            { id: 'visa', label: 'VFS Visa Butler', icon: Plane }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#2D1B69] text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Workspace Panels ── */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: Main Dashboard Overview & Study Journey Map */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="tab-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Gamified Study Journey Map Timeline */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">My Study Journey Map</h3>
                    <p className="text-xs text-gray-400">Pulsing level timeline mapping your application journey.</p>
                  </div>
                  <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> High Placement Priority
                  </span>
                </div>

                {/* Level Map Timelines Nodes */}
                <div className="relative pb-8 overflow-x-auto flex items-center justify-between min-w-[700px]">
                  {/* Background progress bar */}
                  <div className="absolute left-[25px] right-[25px] top-[22px] h-1 bg-gray-100 z-0">
                    <div 
                      className="h-full bg-gradient-to-r from-[#2D1B69] to-[#FFD700] rounded-full transition-all duration-500"
                      style={{ width: `${(currentStageIndex / (JOURNEY_STAGES.length - 1)) * 100}%` }}
                    />
                  </div>

                  {JOURNEY_STAGES.map((node, i) => {
                    const isDone = currentStageIndex >= i;
                    const isActive = currentStageIndex === i;
                    const isHighlighted = selectedNode === i;
                    
                    return (
                      <button
                        key={node.status}
                        onClick={() => setSelectedNode(i)}
                        className="flex flex-col items-center group relative z-10 w-16"
                      >
                        {/* Node sphere */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-xs transition-all shadow-md ${
                          isDone 
                            ? 'bg-[#FFD700] text-[#2D1B69] border border-[#FFD700]/30 shadow-[0_4px_12px_rgba(255,215,0,0.4)] ring-4 ring-[#FFD700]/15' 
                            : isActive 
                            ? 'bg-[#2D1B69] text-white ring-4 ring-[#2D1B69]/15 animate-pulse' 
                            : 'bg-white border-2 border-gray-200 text-gray-300 hover:border-[#2D1B69]'
                        }`}>
                          {isDone ? '✓' : `0${i+1}`}
                        </div>

                        {/* Label */}
                        <div className={`text-[10px] font-bold mt-3 text-center transition-colors truncate w-full ${
                          isActive ? 'text-[#2D1B69] font-black' : isDone ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {node.label}
                        </div>

                        {/* Pulsing indicator aura */}
                        {isHighlighted && (
                          <div className="absolute -top-1 w-14 h-1.5 bg-[#2D1B69] rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Node Detail display card */}
                {selectedNode !== null && (
                  <motion.div 
                    className="p-5 mt-6 rounded-2xl bg-gray-50 border border-gray-150 flex items-start gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="p-3 rounded-xl bg-white border border-gray-200 text-[#2D1B69] shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Milestone Node Highlight: {JOURNEY_STAGES[selectedNode].label}</h4>
                      <h3 className="text-sm font-bold text-gray-900 mt-1">{JOURNEY_STAGES[selectedNode].desc}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedNode <= currentStageIndex 
                          ? 'This application milestone was cleared successfully. Review verification documents or download offer letters.' 
                          : 'This is a future milestone. Once current academic compliance is verified, TGA will fast-track your profile here.'}
                      </p>
                      {selectedNode === 3 && currentStageIndex >= 3 && (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => toast.success('Downloading verified Austrian admission package...')} className="px-3.5 py-1.5 bg-[#2D1B69] text-white font-bold rounded-lg text-[10px] shadow-sm uppercase tracking-wider">
                            Download Offer Letter
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Grid block: Application status & Collectible Badges */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
                
                {/* Active Application summary */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-5">Active Admission Slots</h3>
                    
                    <div className="space-y-4">
                      {activeApps.map((a) => (
                        <div key={a.id} className="p-4 border border-gray-200 hover:border-[#2D1B69]/30 rounded-2xl bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm border border-gray-100">
                              <img src={a.universityId === 'fh-kufstein-tirol' ? '/universities/fh-kufstein-tirol-logo.png' : '/universities/euas-logo.svg'} alt="" className="w-full h-full object-contain" onError={e => {(e.target as HTMLElement).style.display = 'none'}} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">{a.programName}</h4>
                              <p className="text-[10px] text-gray-400 font-semibold">{a.universityName}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider shrink-0 self-start sm:self-center ${getStageStyle(a.status)}`}>
                            {a.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Total matched portfolios: <strong>{activeApps.length}</strong></span>
                    <button onClick={() => setActiveTab('quiz')} className="font-bold text-[#FD7E14] hover:underline flex items-center gap-1">
                      Run AI matching finder <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Collectible Badges cabinet */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 mb-1">Eearned Badges</h3>
                  <p className="text-xs text-gray-400 mb-6">Visual collection of milestones cleared on your journey.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {badges.map((b) => {
                      const isEarned = studentBadges.some(sb => sb.badgeId === b.id);
                      return (
                        <div 
                          key={b.id} 
                          className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center transition-all duration-300 ${
                            isEarned 
                              ? 'bg-gradient-to-b from-white to-[#FFD700]/5 border-[#FFD700]/30 shadow-md scale-[1.02]' 
                              : 'bg-gray-50 border-gray-100 opacity-40'
                          }`}
                        >
                          <span className="text-3xl filter drop-shadow-md select-none">{b.icon}</span>
                          <span className="text-xs font-black text-gray-900 mt-2">{b.name}</span>
                          <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">{b.description}</span>
                          
                          {isEarned && (
                            <span className="text-[8px] bg-[#FFD700]/20 border border-[#FFD700]/30 text-amber-700 px-1.5 py-0.5 rounded-full font-bold uppercase mt-2 tracking-wide">
                              ✓ Earned
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 2: AI Course Finder Quiz Wizard */}
          {activeTab === 'quiz' && (
            <motion.div
              key="tab-quiz"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm max-w-3xl mx-auto"
            >
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
                  <span className="text-base font-black text-gray-900">AI Course Finder wizard</span>
                </div>
                {quizStep < 4 && (
                  <span className="text-xs font-bold text-gray-400">Step {quizStep} of 3</span>
                )}
              </div>

              {/* Progress Bar */}
              {quizStep < 4 && (
                <div className="w-full h-1 bg-gray-100 rounded-full mb-8 overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${(quizStep / 3) * 100}%` }} />
                </div>
              )}

              <AnimatePresence mode="wait">
                
                {/* Step 1: Destination country selector */}
                {quizStep === 1 && (
                  <motion.div
                    key="q-step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="text-lg font-black text-gray-900">Which country inspires you most?</h3>
                    <p className="text-xs text-gray-400">Select your preferred destination country for English-taught portfolios.</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'Austria', flag: '🇦🇹', desc: 'FH Kufstein applied routes' },
                        { name: 'Estonia', flag: '🇪🇪', desc: 'Tallinn startup hub' },
                        { name: 'France', flag: '🇫🇷', desc: 'ICN Creative business school' },
                        { name: 'USA', flag: '🇺🇸', desc: 'Los Angeles pathways' }
                      ].map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setQuizData({ ...quizData, country: c.name })}
                          className={`p-4 rounded-2xl border text-left flex gap-3 transition-all ${
                            quizData.country === c.name 
                              ? 'border-[#2D1B69] bg-[#2D1B69]/5 shadow-sm' 
                              : 'border-gray-200 hover:border-purple-600 bg-white'
                          }`}
                        >
                          <span className="text-3xl shrink-0">{c.flag}</span>
                          <div>
                            <div className="text-sm font-bold text-gray-800">{c.name}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{c.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end pt-4">
                      <button onClick={() => setQuizStep(2)} className="flex items-center gap-1.5 px-6 py-2.5 bg-[#2D1B69] text-white font-bold rounded-xl text-xs shadow-md">
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Preferred field selection */}
                {quizStep === 2 && (
                  <motion.div
                    key="q-step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="text-lg font-black text-gray-900">What do you wish to study?</h3>
                    <p className="text-xs text-gray-400">Select your preferred domain category for matching.</p>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'IT & Game Design', name: 'IT & Software', icon: Brain },
                        { id: 'Business & Management', name: 'Business & MBA', icon: Award },
                        { id: 'Medicine & Health', name: 'Medical pathways', icon: AlertCircle },
                        { id: 'Design & Creative Arts', name: 'Creative Arts', icon: Sparkles }
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setQuizData({ ...quizData, subject: item.id })}
                            className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                              quizData.subject === item.id 
                                ? 'border-[#2D1B69] bg-[#2D1B69]/5 shadow-sm' 
                                : 'border-gray-200 hover:border-purple-600 bg-white'
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-purple-100 text-[#2D1B69] shrink-0">
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold text-gray-800">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between pt-4">
                      <button onClick={() => setQuizStep(1)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs">
                        Back
                      </button>
                      <button onClick={() => setQuizStep(3)} className="flex items-center gap-1.5 px-6 py-2.5 bg-[#2D1B69] text-white font-bold rounded-xl text-xs shadow-md">
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Budget Range selector */}
                {quizStep === 3 && (
                  <motion.div
                    key="q-step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="text-lg font-black text-gray-900">What is your annual tuition budget?</h3>
                    <p className="text-xs text-gray-400">Help our AI filter programs according to affordability ratios.</p>

                    <div className="space-y-2 max-w-md mx-auto">
                      {[
                        '€5,000–€10,000/year',
                        '€10,000–€15,000/year',
                        '€15,000+/year'
                      ].map((b) => (
                        <button
                          key={b}
                          onClick={() => setQuizData({ ...quizData, budget: b })}
                          className={`w-full p-4 rounded-xl border text-center font-bold text-xs transition-all ${
                            quizData.budget === b 
                              ? 'border-[#2D1B69] bg-[#2D1B69]/5 shadow-sm' 
                              : 'border-gray-200 hover:border-purple-600 bg-white'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between pt-4">
                      <button onClick={() => setQuizStep(2)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs">
                        Back
                      </button>
                      <button onClick={handleQuizSubmit} className="flex items-center gap-1.5 px-6 py-2.5 bg-[#2D1B69] text-white font-bold rounded-xl text-xs shadow-md">
                        Generate Matches <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: AI Matching Results listing */}
                {quizStep === 4 && (
                  <motion.div
                    key="q-results"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="text-center pb-4">
                      <h3 className="text-2xl font-black text-gray-900">AI Placement Matches Generated</h3>
                      <p className="text-xs text-gray-400 mt-1">Based on target {quizData.country} destination preferences and budget scope.</p>
                    </div>

                    <div className="space-y-4">
                      {matchedPrograms.map((prog, i) => (
                        <motion.div
                          key={prog.id}
                          className="p-5 border border-gray-150 hover:border-[#2D1B69]/30 bg-gray-50/50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center p-1">
                              <img src={prog.universityId === 'fh-kufstein-tirol' ? '/universities/fh-kufstein-tirol-logo.png' : '/universities/euas-logo.svg'} alt="" className="w-full h-full object-contain" onError={e => {(e.target as HTMLElement).style.display = 'none'}} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">{prog.name}</h4>
                              <p className="text-[10px] text-gray-400 font-semibold">{prog.universityName}</p>
                              <div className="flex gap-2 mt-2">
                                <span className="text-[9px] bg-purple-500/10 text-[#2D1B69] px-2 py-0.5 rounded-md font-bold">{prog.degreeLevel}</span>
                                <span className="text-[9px] bg-green-500/10 text-green-700 px-2 py-0.5 rounded-md font-bold">{prog.tuitionFee}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-start sm:items-end gap-3 sm:gap-1.5 shrink-0 w-full sm:w-auto">
                            <span className="text-xs font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                              {prog.matchPct}% Match
                            </span>
                            <button
                              onClick={() => {
                                createApplication(student.id, prog.id);
                                toast.success(`Application inquiry created for ${prog.name}!`);
                              }}
                              className="px-4 py-2 bg-[#2D1B69] text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm ml-auto sm:ml-0"
                            >
                              One-Click Apply
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="flex justify-center pt-6">
                      <button onClick={() => setQuizStep(1)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs">
                        Retake Quiz Wizard
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}

          {/* TAB 3: Document Vault / Upload Center */}
          {activeTab === 'documents' && (
            <motion.div
              key="tab-docs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm"
            >
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 leading-none">Document Upload Vault</h3>
                  <p className="text-xs text-gray-400 mt-1">Keep folders complete to maintain placement fast-tracking triggers.</p>
                </div>
                
                {/* Circular verification strength */}
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full border-4 border-green-500/20 border-t-green-500 flex items-center justify-center font-bold text-xs text-green-600">
                    {Math.round((documents.filter(d => d.verified).length / 4) * 100)}%
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase leading-none">COMPLIANCE</div>
                    <div className="text-xs font-black text-green-600 mt-0.5">READY</div>
                  </div>
                </div>
              </div>

              {/* Upload Folders checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { type: 'Passport', icon: FileCheck },
                  { type: 'Academic Transcripts', icon: FileCheck },
                  { type: 'IELTS / TOEFL Score', icon: FileCheck },
                  { type: 'Statement of Purpose (SOP)', icon: FileCheck },
                ].map((doc) => {
                  const uploaded = documents.find(d => d.documentType === doc.type);
                  const isVerified = uploaded?.verified;
                  const Icon = doc.icon;
                  return (
                    <div 
                      key={doc.type} 
                      className={`p-5 rounded-2xl border flex flex-col justify-between h-44 transition-all ${
                        isVerified 
                          ? 'border-green-200 bg-green-500/[0.02]' 
                          : uploaded 
                          ? 'border-yellow-200 bg-yellow-500/[0.02]' 
                          : 'border-dashed border-purple-200 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-2.5 rounded-xl ${isVerified ? 'bg-green-50 text-green-500' : uploaded ? 'bg-yellow-50 text-yellow-500' : 'bg-purple-50 text-[#2D1B69]'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {uploaded && (
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isVerified ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                          }`}>
                            {isVerified ? 'Verified' : 'Reviewing'}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-800 leading-snug">{doc.type}</h4>
                        {uploaded ? (
                          <div className="text-[10px] text-gray-400 mt-1 truncate font-semibold">{uploaded.fileName}</div>
                        ) : (
                          <div className="text-[10px] text-red-500 font-semibold mt-1">Pending Submission</div>
                        )}
                      </div>

                      {uploaded ? (
                        <button disabled className="w-full py-1.5 border border-gray-200 bg-white rounded-lg text-[10px] font-bold text-gray-400 cursor-not-allowed">
                          Document Uploaded
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleDocUpload(doc.type)}
                          className="w-full py-1.5 border border-[#2D1B69]/30 bg-white hover:bg-[#2D1B69] hover:text-white rounded-lg text-[10px] font-bold text-[#2D1B69] transition-all"
                        >
                          + Upload PDF File
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 4: VFS Visa Butler checklists */}
          {activeTab === 'visa' && (
            <motion.div
              key="tab-visa"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8"
            >
              {/* Destination country tabs */}
              <div className="space-y-2 border-r border-gray-100 pr-0 md:pr-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">VFS Folders</h3>
                {[
                  { name: 'Austria', flag: '🇦🇹' },
                  { name: 'France', flag: '🇫🇷' },
                  { name: 'Estonia', flag: '🇪🇪' },
                  { name: 'Germany', flag: '🇩🇪' },
                  { name: 'Cyprus', flag: '🇨🇾' },
                  { name: 'United States', flag: '🇺🇸' }
                ].map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setVfsCountry(c.name)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left font-bold text-xs transition-all ${
                      vfsCountry === c.name 
                        ? 'bg-purple-50 text-[#2D1B69] border border-purple-100 shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span>{c.flag} {c.name} visa</span>
                    {vfsCountry === c.name && <span className="w-2 h-2 rounded-full bg-[#2D1B69]" />}
                  </button>
                ))}
              </div>

              {/* Specific country Visa checklists */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-none">VFS Visa Checklist: {vfsCountry}</h3>
                  <p className="text-xs text-gray-400 mt-1">ICEF standard checklists for student entry visa filings.</p>
                </div>

                <div className="space-y-3 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  {[
                    { label: 'Official University Admission Letter', desc: 'MOU verified priority intake stamp' },
                    { label: 'Embasssy Proof of Funding / Blocked Account', desc: 'Austria: €800+/month block coverage' },
                    { label: 'Comprehensive Schengen Health Travel Insurance', desc: 'Verified min coverage €30,000' },
                    { label: 'Clean Criminal Record Certificate (PCC)', desc: 'Ministry of External Affairs apostille stamp required' },
                    { label: 'Visa Interview appointment receipt', desc: 'Filing confirmed with VFS global embassy slot' }
                  ].map((item, idx) => (
                    <div key={item.label} className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full border border-[#2D1B69]/30 flex items-center justify-center font-bold text-[10px] text-[#2D1B69] shrink-0 mt-0.5 bg-white">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">{item.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <button onClick={() => toast.success('Embassy SOP and checklist templates successfully downloaded!')} className="px-4 py-2 border border-[#2D1B69]/20 hover:bg-purple-50 text-[#2D1B69] text-xs font-bold rounded-xl shadow-sm">
                    Download SOP Template
                  </button>
                  <button onClick={() => toast.success(`Embassy Visa Appointment link triggered for ${vfsCountry}!`)} className="px-5 py-2 bg-[#2D1B69] text-white text-xs font-bold rounded-xl shadow-md">
                    Book Embassy Slot
                  </button>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}

// Stage Style Badge chips helpers
function getStageStyle(status: ApplicationStatus) {
  switch (status) {
    case 'inquiry': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'applied': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'documents_submitted': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'offer_received': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'enrolled': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'visa_applied': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'visa_approved': return 'bg-green-50 text-green-700 border-green-200';
    case 'visa_rejected': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-100';
  }
}