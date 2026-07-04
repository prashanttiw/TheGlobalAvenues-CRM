import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserCircle, Brain, GraduationCap, ArrowRight, Sparkles, 
  CheckCircle2, FileText, Globe, Search, Award, Plane, Mail, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STEPS_DATA = [
  {
    number: '01',
    icon: UserCircle,
    title: 'Build Your Profile',
    badge: 'Quick & Detailed',
    shortDesc: 'Create a rich digital profile of your academic history, test scores, and career ambitions in under 5 minutes.',
    bullets: [
      'Enter academic details & IELTS/TOEFL scores',
      'Select preferred study destinations & intake timeline',
      'Profile strength analysis against international criteria'
    ],
    color: 'from-[#FD7E14] to-[#FF8C42]',
    bgLight: 'bg-[#FD7E14]/6',
    glow: 'rgba(253,126,20,0.15)',
  },
  {
    number: '02',
    icon: Brain,
    title: 'Get Matched Instantly',
    badge: 'Data-Driven matching',
    shortDesc: 'Our matching engine analyzes 50+ admission checkpoints to select high-compatibility partner universities.',
    bullets: [
      'Scans every partner university\'s program catalog',
      'Filters by budget, tuition range, and PR pathways',
      'High-compatibility matches with verified university partners'
    ],
    color: 'from-[#D32F2F] to-[#FF5722]',
    bgLight: 'bg-[#D32F2F]/6',
    glow: 'rgba(211,47,47,0.15)',
  },
  {
    number: '03',
    icon: GraduationCap,
    title: 'Apply & Get Enrolled',
    badge: 'End-to-End Success',
    shortDesc: 'Apply to multiple selected universities seamlessly. Our experts manage your documents, interview preps, and visas.',
    bullets: [
      'Single-click application to signed MOU universities',
      'Priority document assessment & priority offer turnaround',
      'Full visa filing support with 98% historical success rate'
    ],
    color: 'from-[#C94D1B] to-[#FD7E14]',
    bgLight: 'bg-[#C94D1B]/6',
    glow: 'rgba(201,77,27,0.15)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 Widget: Interactive Profile Builder Mockup
// ─────────────────────────────────────────────────────────────────────────────
function ProfileBuilderMock() {
  const [selectedCountry, setSelectedCountry] = useState('Austria');
  const [selectedDegree, setSelectedDegree] = useState('Bachelor');
  const [gaugeValue, setGaugeValue] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setGaugeValue(98), 300);
    return () => clearTimeout(t);
  }, [selectedCountry, selectedDegree]);

  return (
    <div className="flex flex-col h-full bg-[#111622] rounded-2xl border border-white/8 p-5 text-white/90 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FD7E14]/10 rounded-full blur-2xl" />
      
      {/* Title / Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold tracking-wider text-white/50 uppercase">Student Profile Engine</span>
        </div>
        <span className="text-[10px] bg-[#FD7E14]/20 border border-[#FD7E14]/30 px-2 py-0.5 rounded-full text-[#FD7E14] font-bold">LIVE PREVIEW</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Input parameters */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase tracking-wider">Dream Destination</label>
            <div className="flex gap-1.5">
              {['Austria', 'France', 'Estonia'].map((c) => (
                <button
                  key={c}
                  onClick={() => { setSelectedCountry(c); setGaugeValue(0); }}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg border font-bold transition-all ${
                    selectedCountry === c 
                      ? 'border-[#FD7E14] bg-[#FD7E14]/15 text-[#FD7E14]' 
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase tracking-wider">Target Program</label>
            <div className="flex gap-1.5">
              {['Bachelor', 'Master / MBA'].map((d) => (
                <button
                  key={d}
                  onClick={() => { setSelectedDegree(d); setGaugeValue(0); }}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg border font-bold transition-all ${
                    selectedDegree === d 
                      ? 'border-[#FD7E14] bg-[#FD7E14]/15 text-[#FD7E14]' 
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/4 border border-white/5 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-white/50">IELTS Score Required:</span>
              <span className="font-bold text-[#FD7E14]">6.5+ band</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-white/50">Academic GPA Strength:</span>
              <span className="font-bold text-green-400">High (92%)</span>
            </div>
          </div>
        </div>

        {/* Circular Progress Gauge */}
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.02] border border-white/5 relative">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* SVG Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="7"
                fill="transparent"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#orangeGradient)"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * gaugeValue) / 100 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FD7E14" />
                  <stop offset="100%" stopColor="#FFC107" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white leading-none">{gaugeValue}%</span>
              <span className="text-[8px] text-white/50 mt-1 font-bold tracking-widest uppercase">STRENGTH</span>
            </div>
          </div>
          <span className="text-[10px] text-green-400 font-bold mt-2.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Profile Status
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 Widget: Interactive AI Matchmaking Scanner
// ─────────────────────────────────────────────────────────────────────────────
function AIMatcherMock() {
  const [scanState, setScanState] = useState<'scanning' | 'done'>('scanning');
  
  useEffect(() => {
    const t1 = setTimeout(() => setScanState('scanning'), 0);
    const t2 = setTimeout(() => setScanState('done'), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#111622] rounded-2xl border border-white/8 p-5 text-white/90 shadow-2xl relative overflow-hidden justify-between">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#D32F2F]/10 rounded-full blur-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#D32F2F]" />
          <span className="text-xs font-bold tracking-wider text-white/50 uppercase">TGA Matching Engine</span>
        </div>
        <span className="text-[9px] bg-[#D32F2F]/20 border border-[#D32F2F]/30 px-2 py-0.5 rounded-full text-[#FF5722] font-bold">50+ DATAPOINTS SCAN</span>
      </div>

      {scanState === 'scanning' ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#D32F2F] animate-spin mb-4" />
          <span className="text-sm font-semibold tracking-wider text-white/80 animate-pulse">Analyzing profiles & portfolios...</span>
          <span className="text-[10px] text-white/40 mt-1">Cross-referencing Austria, Estonia, France and USA</span>
          
          {/* Mock scanner line */}
          <div className="absolute inset-x-0 h-0.5 bg-[#D32F2F]/40 shadow-[0_0_12px_#D32F2F] top-0 animate-bounce" />
        </div>
      ) : (
        <motion.div 
          className="space-y-2 flex-1 flex flex-col justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-1">✓ Shortlisted matches:</div>
          
          {/* Matched Uni 1 */}
          <motion.div 
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/4 border border-white/15"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center p-0.5">
                <img src="/universities/fh-kufstein-tirol-logo.png" alt="" className="w-full h-full object-contain" onError={(e) => {(e.target as HTMLElement).style.display = 'none'}} />
              </div>
              <div>
                <div className="text-xs font-bold">FH Kufstein Tirol</div>
                <div className="text-[9px] text-white/40">Austria · Public applied fees</div>
              </div>
            </div>
            <span className="text-xs font-black text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">96% Match</span>
          </motion.div>

          {/* Matched Uni 2 */}
          <motion.div 
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/4 border border-white/15"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center p-0.5">
                <img src="/universities/euas-logo.svg" alt="" className="w-full h-full object-contain" onError={(e) => {(e.target as HTMLElement).style.display = 'none'}} />
              </div>
              <div>
                <div className="text-xs font-bold">EUAS Business School</div>
                <div className="text-[9px] text-white/40">Estonia · Startup Hub Pathways</div>
              </div>
            </div>
            <span className="text-xs font-black text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">93% Match</span>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 Widget: Interactive Enrollment Tracker
// ─────────────────────────────────────────────────────────────────────────────
function EnrollmentTrackerMock() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1000);
    const t2 = setTimeout(() => setStage(2), 2200);
    const t3 = setTimeout(() => setStage(3), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const milestones = [
    { label: 'Documents Compiled', desc: 'SOP, transcripts verified' },
    { label: 'Offer Letter Issued', desc: 'MOU fast-track priority' },
    { label: 'Visa Approved', desc: '100% ICEF certified filing' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#111622] rounded-2xl border border-white/8 p-5 text-white/90 shadow-2xl relative overflow-hidden justify-between">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C94D1B]/10 rounded-full blur-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#C94D1B]" />
          <span className="text-xs font-bold tracking-wider text-white/50 uppercase">Student Application Hub</span>
        </div>
        <span className="text-[9px] bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-full text-green-400 font-bold">VISA DEPOSITED</span>
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-center">
        {milestones.map((m, i) => {
          const isDone = stage >= i;
          const isActive = stage === i;
          return (
            <div key={m.label} className="flex gap-3 items-start relative">
              {/* Connecting line */}
              {i < milestones.length - 1 && (
                <div className={`absolute top-5 left-2.5 w-0.5 h-10 ${stage > i ? 'bg-green-500' : 'bg-white/10'}`} />
              )}

              {/* Status node */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 shrink-0 mt-0.5 transition-all ${
                isDone 
                  ? 'bg-green-500 text-[#111622]' 
                  : isActive 
                  ? 'bg-[#C94D1B] animate-pulse text-white' 
                  : 'bg-white/10 text-white/20'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>

              {/* Text details */}
              <div className="transition-opacity duration-300">
                <div className={`text-xs font-bold ${isDone ? 'text-white' : isActive ? 'text-[#C94D1B]' : 'text-white/40'}`}>
                  {m.label}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">{m.desc}</div>
              </div>

              {/* Extra visual indicators */}
              {isDone && i === 1 && (
                <motion.div 
                  className="ml-auto flex items-center gap-1 text-[9px] bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-md text-yellow-400 font-bold shrink-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Mail className="w-3 h-3" /> Offer Received
                </motion.div>
              )}

              {isDone && i === 2 && (
                <motion.div 
                  className="ml-auto flex items-center gap-1 text-[9px] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md text-green-400 font-bold shrink-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Plane className="w-3 h-3 animate-bounce" /> Fly 🇬🇧
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main HowItWorks Component
// ─────────────────────────────────────────────────────────────────────────────
export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play timer that cycles steps every 7 seconds, pauses when user manual hovers
  useEffect(() => {
    if (!isHovered) {
      intervalRef.current = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % STEPS_DATA.length);
      }, 7000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered]);

  const active = STEPS_DATA[activeStep];
  const StepIcon = active.icon;

  return (
    <section className="py-24 bg-[#FFFCF5] relative overflow-hidden">
      {/* Dynamic Background elements */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[550px] h-[550px] rounded-full bg-[#FD7E14]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full bg-[#D32F2F]/4 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Title Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#FD7E14] animate-spin-slow" />
            <span className="text-xs text-[#FD7E14] font-bold uppercase tracking-wider">Simple 3-Step Process</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#1A1A1A] tracking-tight mb-4">
            How Global Avenues Works
          </h2>
          <p className="text-base sm:text-lg text-[#666] max-w-xl mx-auto leading-relaxed">
            From your first profile submission to your verified visa grant — we're with you at every milestone.
          </p>
        </motion.div>

        {/* Stepper Grid Container */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-14 items-stretch"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          
          {/* Stepper Selector list (Left side on desktop, top bar on mobile) */}
          <div className="flex flex-col justify-between gap-4 relative">
            {/* Connection timeline line */}
            <div className="hidden lg:block absolute left-10 top-10 bottom-10 w-0 border-l-2 border-dotted border-[#FD7E14]/45 z-0">
              {/* Dynamic progress bar tracking active step */}
              <motion.div 
                className="absolute top-0 -left-[2.5px] w-[3px] bg-gradient-to-b from-[#FD7E14] to-[#C94D1B] rounded-full shadow-[0_0_8px_#FD7E14]"
                initial={{ height: '0%' }}
                animate={{ height: `${(activeStep / (STEPS_DATA.length - 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {STEPS_DATA.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <button
                  key={step.number}
                  onClick={() => { setActiveStep(idx); setIsHovered(true); }}
                  className={`w-full text-left relative flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 z-10 outline-none ${
                    isActive 
                      ? 'border-[#FD7E14] bg-white shadow-[0_12px_40px_rgba(253,126,20,0.08)] scale-[1.02]' 
                      : 'border-[#FD7E14]/10 bg-transparent hover:bg-white/40 hover:border-[#FD7E14]/30'
                  }`}
                >
                  {/* Step Number Circle */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-all shadow-md ${
                    isActive 
                      ? 'bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] text-white ring-4 ring-[#FD7E14]/15' 
                      : 'bg-white border border-[#FD7E14]/20 text-[#666]'
                  }`}>
                    {step.number}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-sm sm:text-base transition-colors ${
                        isActive ? 'text-[#FD7E14]' : 'text-[#1A1A1A]'
                      }`}>
                        {step.title}
                      </h3>
                      {isActive && (
                        <span className="text-[9px] font-bold bg-[#FD7E14]/10 border border-[#FD7E14]/20 text-[#FD7E14] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                          {step.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1.5 leading-relaxed line-clamp-2 transition-opacity ${
                      isActive ? 'text-[#666]' : 'text-[#999]'
                    }`}>
                      {step.shortDesc}
                    </p>
                  </div>

                  {/* Arrow Indicator on Desktop */}
                  {isActive && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rotate-45 bg-white border-r border-t border-[#FD7E14] z-20" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive Showcase Panel (Right side) */}
          <div className="flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20, y: 5 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -20, y: -5 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col bg-white rounded-3xl p-6 sm:p-8 h-full border border-[#FD7E14]/15 shadow-[0_20px_50px_rgba(253,126,20,0.06)] hover:shadow-[0_24px_60px_rgba(253,126,20,0.12)] transition-shadow duration-500 justify-between gap-6"
                style={{ backdropFilter: 'blur(20px)' }}
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${active.color} text-white shadow-md`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-white/90 bg-[#FD7E14] px-2 py-0.5 rounded-md tracking-wider">
                        STEP {active.number}
                      </div>
                    </div>
                  </div>

                  {/* Showcase Info */}
                  <h3 className="text-2xl font-black text-[#1A1A1A] mb-3 leading-tight">
                    {active.title}
                  </h3>
                  <p className="text-sm text-[#666] leading-relaxed mb-6">
                    {active.shortDesc}
                  </p>

                  {/* Bullet points checklist */}
                  <ul className="space-y-3 mb-6">
                    {active.bullets.map((b) => (
                      <li key={b} className="flex gap-2.5 items-start">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-xs text-[#555] font-medium leading-normal">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Animated Widget container */}
                <div className="h-60 sm:h-64">
                  {activeStep === 0 && <ProfileBuilderMock />}
                  {activeStep === 1 && <AIMatcherMock />}
                  {activeStep === 2 && <EnrollmentTrackerMock />}
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Global CTAs */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            to="/apply"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-2xl font-bold shadow-[0_8px_32px_rgba(253,126,20,0.35)] hover:shadow-[0_12px_48px_rgba(253,126,20,0.5)] hover:scale-105 transition-all"
          >
            Start Your Journey Now <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
