import { useState, useEffect } from 'react';
import { 
  Sparkles, Briefcase, Code, Heart, Scale, Palette, 
  TrendingUp, ChevronRight, GraduationCap, CheckCircle2, 
  MapPin, RotateCcw, Award, Loader2, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Unified B2B/B2C career database with authentic MOU partners
const CAREERS = [
  { 
    id: 'business',
    icon: Briefcase, 
    label: 'Business & Finance', 
    color: '#FD7E14',
    stats: { unis: 24, locations: 'France, Germany, Estonia', success: '97.8%' },
    checklist: [
      'Evaluate Triple-Crown (AMBA/AACSB) Grande École standards',
      'Scan solvency & tuition funding brackets (€4,000–€12,000/yr)',
      'Analyze 2-Year post-study EU visa clearance thresholds'
    ],
    matches: [
      { name: 'ICN Business School', score: 98, desc: 'Grande École double degree routes in Paris, France & Berlin, Germany.', location: 'Paris / Berlin', logo: 'ICN' },
      { name: 'EUAS Tallinn', score: 93, desc: 'International Business & Economics pathways in the Baltic tech hub.', location: 'Tallinn, Estonia', logo: 'EUAS' },
      { name: 'Mesoyios College', score: 89, desc: 'Business Administration with direct placements and transfer paths.', location: 'Limassol, Cyprus', logo: 'Mesoyios' }
    ]
  },
  { 
    id: 'technology',
    icon: Code, 
    label: 'Technology & IT', 
    color: '#D32F2F',
    stats: { unis: 18, locations: 'Estonia, Austria, USA', success: '98.4%' },
    checklist: [
      'Assess software engineering prerequisite credit waivers',
      'Check EU Startup Visa incubator and patent thresholds',
      'Verify English proficiency waivers for South Asian tech students'
    ],
    matches: [
      { name: 'EUAS Tallinn', score: 96, desc: 'Software engineering inside the Baltic tech hub with startup visa.', location: 'Tallinn, Estonia', logo: 'EUAS' },
      { name: 'FH Kufstein Tirol', score: 91, desc: 'AI, smart industry, and systems engineering alpine research track.', location: 'Kufstein, Austria', logo: 'Kufstein' },
      { name: 'IAU Malta / USA', score: 87, desc: 'Tech MBA and data analytics graduate pathways with USA rotations.', location: 'Malta / USA', logo: 'IAU' }
    ]
  },
  { 
    id: 'healthcare',
    icon: Heart, 
    label: 'Healthcare & Medicine', 
    color: '#E91E63',
    stats: { unis: 8, locations: 'Grenada, USA, UK', success: '98.0%' },
    checklist: [
      'Audit bio-chemistry and organic life sciences credentials',
      'Scan USMLE residency match historical records by SGU graduates',
      'Verify accredited global clinical rotation slots in USA/UK'
    ],
    matches: [
      { name: "St. George's University", score: 98, desc: 'MD pathway with clinical training in USA & UK. Leading US residency provider.', location: 'Grenada, West Indies', logo: 'SGU' },
      { name: 'Mesoyios College', score: 84, desc: 'Healthcare and clinical wellness administration internships.', location: 'Limassol, Cyprus', logo: 'Mesoyios' },
      { name: 'German Bio-Tech Track', score: 80, desc: 'Biotechnology, pharmacology, and clinical laboratory research routes.', location: 'Munich, Germany', logo: 'TGA' }
    ]
  },
  { 
    id: 'law',
    icon: Scale, 
    label: 'Law & Legal Studies', 
    color: '#795548',
    stats: { unis: 12, locations: 'UK, Ireland, Canada', success: '95.6%' },
    checklist: [
      'Check LLB & LLM Commonwealth Bar recognition criteria',
      'Analyze international corporate arbitration and IP courses',
      'Verify moot court practice modules and legal apprenticeships'
    ],
    matches: [
      { name: 'Elite Legal Partner Universities', score: 95, desc: 'LLB/LLM pathways with corporate law and dispute specialties.', location: 'Ireland / UK / Canada', logo: 'TGA' },
      { name: 'ICN Corporate Law Track', score: 88, desc: 'International business law and arbitration joint master.', location: 'Paris, France', logo: 'ICN' },
      { name: 'Tallinn Tech Law Academy', score: 84, desc: 'Digital law, cyber regulation, and IP master pathways.', location: 'Tallinn, Estonia', logo: 'EUAS' }
    ]
  },
  { 
    id: 'arts',
    icon: Palette, 
    label: 'Arts & Design', 
    color: '#9C27B0',
    stats: { unis: 10, locations: 'France, UK, Italy', success: '96.2%' },
    checklist: [
      'Evaluate digital creative portfolio and studio submissions',
      'Scan fashion design and interior modeling lab credentials',
      'Assess luxury brand student projects and creative internships'
    ],
    matches: [
      { name: 'MJM Graphic Design', score: 97, desc: 'Creative studio training in fashion, graphic, and interior design.', location: 'Paris, France', logo: 'MJM' },
      { name: 'ICN Design Management', score: 90, desc: 'Joint management and creative arts master pathways.', location: 'Berlin, Germany', logo: 'ICN' },
      { name: 'EUAS Game Art Academy', score: 85, desc: '3D animation, gaming art, and UX design startup routes.', location: 'Tallinn, Estonia', logo: 'EUAS' }
    ]
  },
  { 
    id: 'marketing',
    icon: TrendingUp, 
    label: 'Marketing & Media', 
    color: '#FF9800',
    stats: { unis: 15, locations: 'France, Estonia, Austria', success: '97.0%' },
    checklist: [
      'Analyze brand communication and digital marketing modules',
      'Scan media production and SEO training portfolios',
      'Verify corporate internships in European media hubs'
    ],
    matches: [
      { name: 'ICN Marketing Grande École', score: 96, desc: 'Triple-Crown master in luxury brand and communications.', location: 'Paris, France', logo: 'ICN' },
      { name: 'FH Kufstein Marketing', score: 91, desc: 'Web analytics, digital branding, and Alps green PR routes.', location: 'Kufstein, Austria', logo: 'Kufstein' },
      { name: 'EUAS Digital Media Hub', score: 86, desc: 'Fintech marketing, growth hacking, and tech PR startup routes.', location: 'Tallinn, Estonia', logo: 'EUAS' }
    ]
  }
];

const SCANNING_STATUSES = [
  'Connecting to Global Avenues MOU Database...',
  'Analyzing admission prerequisite academic benchmarks...',
  'Matching solvency metrics against tuition brackets...',
  'Checking VFS visa clearance thresholds...',
  'Compiling matching partner university portfolios...'
];

export function AIMatcherWidget() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [step, setStep] = useState<'career' | 'loading' | 'results'>('career');
  const [loadingStatusIdx, setLoadingStatusIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  const activeCareer = CAREERS[selectedIdx];

  // Simulated AI scanning loading increments
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let statusTimer: NodeJS.Timeout;

    if (step === 'loading') {
      setProgress(0);
      setLoadingStatusIdx(0);

      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setStep('results');
            return 100;
          }
          return prev + 4;
        });
      }, 80);

      statusTimer = setInterval(() => {
        setLoadingStatusIdx((prev) => (prev + 1) % SCANNING_STATUSES.length);
      }, 500);
    }

    return () => {
      clearInterval(timer);
      clearInterval(statusTimer);
    };
  }, [step]);

  const handleInitiateMatch = () => {
    setStep('loading');
  };

  return (
    <section id="ai-matcher" className="py-24 bg-[#FFFCF5] relative overflow-hidden">
      {/* Dynamic background accents */}
      <div className="absolute inset-0 dot-grid opacity-[0.15] pointer-events-none" />
      <div className="absolute -top-48 left-1/4 w-96 h-96 rounded-full bg-[#FD7E14]/3 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-48 right-1/4 w-96 h-96 rounded-full bg-[#FFC107]/3 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#FD7E14] animate-spin-slow" />
            <span className="text-xs text-[#FD7E14] font-extrabold uppercase tracking-widest">AI-Powered Matchmaker</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#1C1C1E] tracking-tight mb-4">
            What's Your Dream Career?
          </h2>
          <p className="text-base sm:text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Our AI scans exclusive partner MOU thresholds to find your highly compatible university match in seconds.
          </p>
        </motion.div>

        {/* Unified Glassmorphic AI Console */}
        <div className="bg-white border-2 border-neutral-100/90 rounded-[32px] p-6 md:p-10 shadow-[0_24px_50px_rgba(0,0,0,0.03)] backdrop-blur-xl relative overflow-hidden min-h-[460px] flex flex-col justify-center">
          
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Interactive Selection Console */}
            {step === 'career' && (
              <motion.div
                key="career-selector"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 items-stretch"
              >
                {/* Left side selector stack */}
                <div className="flex flex-col gap-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 mb-2.5 px-1">
                    1. Choose Your Direction
                  </div>
                  {CAREERS.map((c, idx) => {
                    const Icon = c.icon;
                    const isActive = selectedIdx === idx;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 relative text-left group ${
                          isActive
                            ? 'border-[#FD7E14] bg-[#FD7E14] text-white shadow-md shadow-[#FD7E14]/15'
                            : 'border-neutral-100 bg-neutral-50 hover:bg-white hover:border-[#FD7E14]/30 text-[#1C1C1E]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div 
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                              isActive ? 'bg-white/20 text-white' : 'bg-[#FFFCF5] border border-[#FD7E14]/15 text-[#FD7E14] group-hover:scale-105'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold truncate">{c.label}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform shrink-0 ${
                          isActive ? 'translate-x-1 text-white' : 'text-neutral-400 group-hover:text-[#FD7E14] group-hover:translate-x-0.5'
                        }`} />
                      </button>
                    );
                  })}
                </div>

                {/* Right side parameter display card */}
                <div className="bg-[#FFFCF5]/90 border border-[#FD7E14]/15 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  {/* Subtle blur accent */}
                  <div 
                    className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-[90px] opacity-10 pointer-events-none transition-all duration-500" 
                    style={{ backgroundColor: activeCareer.color }}
                  />

                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white border border-[#FD7E14]/15 text-[#FD7E14] mb-4.5 shadow-sm">
                      <Target className="w-3.5 h-3.5" /> AI Scan Core
                    </div>
                    
                    <h3 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight mb-4 flex items-center gap-2">
                      <span className="text-2xl shrink-0">{activeCareer.label.split(' ')[0]}</span>
                      {activeCareer.label} Requirements
                    </h3>

                    {/* Scan checklist */}
                    <ul className="flex flex-col gap-3.5 mb-6">
                      {activeCareer.checklist.map((c, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs font-semibold text-neutral-600 leading-relaxed">
                          <span className="w-5 h-5 rounded-full bg-white border border-[#FD7E14]/15 text-[#FD7E14] text-[9px] font-extrabold flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            0{i + 1}
                          </span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Dynamic Database Statistics */}
                  <div className="relative z-10 mt-auto">
                    <div className="grid grid-cols-3 gap-2.5 bg-white border border-neutral-100 rounded-2xl p-3 text-center mb-6.5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                      <div>
                        <div className="text-xs font-black text-[#FD7E14]">{activeCareer.stats.unis}</div>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase mt-0.5">MOU Unis</div>
                      </div>
                      <div className="border-x border-neutral-100 px-1">
                        <div className="text-xs font-black text-neutral-800 truncate" title={activeCareer.stats.locations}>{activeCareer.stats.locations.split(',')[0]}</div>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase mt-0.5">Top Hub</div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-[#4CAF50]">{activeCareer.stats.success}</div>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase mt-0.5">Success Rate</div>
                      </div>
                    </div>

                    <button
                      onClick={handleInitiateMatch}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white text-xs font-extrabold py-4 px-6 rounded-2xl shadow-[0_8px_24px_rgba(253,126,20,0.25)] hover:shadow-[0_12px_32px_rgba(253,126,20,0.4)] hover:scale-[1.01] transition-all duration-300"
                    >
                      <Sparkles className="w-4 h-4" /> Initiate AI Matchmaker
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Neural Loading Analysis */}
            {step === 'loading' && (
              <motion.div
                key="neural-loader"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="max-w-md mx-auto text-center"
              >
                {/* Large high-tech loader icon */}
                <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-neutral-100" />
                  <Loader2 className="w-12 h-12 text-[#FD7E14] animate-spin shrink-0 z-10" />
                  {/* Subtle glow border rings */}
                  <div className="absolute -inset-2 rounded-full border border-[#FD7E14]/20 animate-ping opacity-60" />
                </div>

                <h3 className="text-2xl font-black text-[#1C1C1E] tracking-tight mb-2">
                  Initiating Neural Matching...
                </h3>
                
                {/* Dynamic Status Text */}
                <p className="text-xs text-neutral-500 font-bold tracking-tight min-h-[16px] mb-8 uppercase text-[#FD7E14]">
                  {SCANNING_STATUSES[loadingStatusIdx]}
                </p>

                {/* Micro-metrics progress bar */}
                <div className="relative h-2.5 bg-neutral-50 rounded-full overflow-hidden border border-neutral-100 shadow-inner mb-2.5">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B]"
                    style={{ width: `${progress}%` }}
                    transition={{ ease: 'easeInOut' }}
                  />
                </div>
                <div className="text-right text-[10px] text-neutral-400 font-extrabold">{progress}% Analyzed</div>
              </motion.div>
            )}

            {/* STEP 3:Curated MOU Partners Reveal */}
            {step === 'results' && (
              <motion.div
                key="matches-results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-100 pb-5 mb-7 gap-4">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#4CAF50] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-ping" /> Match compilation complete
                    </div>
                    <h3 className="text-2xl font-black text-[#1C1C1E] tracking-tight mt-0.5">
                      Curated {activeCareer.label} Matches
                    </h3>
                  </div>
                  <button
                    onClick={() => setStep('career')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFFCF5] hover:bg-[#FD7E14]/10 border border-[#FD7E14]/25 hover:border-[#FD7E14]/50 rounded-xl text-xs font-bold text-[#FD7E14] transition-all duration-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Re-Match Direction
                  </button>
                </div>

                {/* 3 matches cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {activeCareer.matches.map((uni, idx) => (
                    <motion.div
                      key={uni.name}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.4 }}
                      className="group flex flex-col justify-between bg-white border border-neutral-100 hover:border-[#FD7E14]/30 hover:shadow-[0_16px_36px_rgba(253,126,20,0.03)] rounded-[24px] p-6 transition-all duration-300 h-full relative"
                    >
                      {/* Placement Header */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase border border-[#FD7E14]/20 bg-[#FFFCF5] text-[#FD7E14]"
                          >
                            MOU Pathway
                          </span>
                          <span className="text-[11px] font-black text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-md border border-[#4CAF50]/20">
                            {uni.score}% Match
                          </span>
                        </div>

                        {/* Uni Identity */}
                        <h4 className="text-base font-black text-[#1C1C1E] tracking-tight group-hover:text-[#FD7E14] transition-colors mt-1 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-[#FD7E14] shrink-0" /> {uni.name}
                        </h4>
                        
                        <div className="text-[10px] text-neutral-400 font-bold tracking-tight uppercase flex items-center gap-1 mt-1.5 mb-4">
                          <MapPin className="w-3 h-3 text-[#FD7E14] shrink-0" /> {uni.location}
                        </div>

                        <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                          {uni.desc}
                        </p>
                      </div>

                      {/* Direct Apply Action */}
                      <Link
                        to={`/apply?role=student&university=${encodeURIComponent(uni.name)}`}
                        className="w-full flex items-center justify-center gap-1.5 bg-[#FFFCF5] hover:bg-[#FD7E14] border border-[#FD7E14]/25 hover:border-transparent text-xs font-black text-[#FD7E14] hover:text-white py-3 rounded-xl transition-all duration-300 mt-6 shadow-[0_2px_8px_rgba(253,126,20,0.01)] hover:shadow-[0_4px_16px_rgba(253,126,20,0.2)]"
                      >
                        Apply Priority Route <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>
    </section>
  );
}