import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BellRing, Building2, CalendarDays, CheckCircle2, ClipboardCheck,
  FileText, GraduationCap, MapPin, ShieldCheck, Sparkles, UserRoundCheck,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const STEPS = [
  {
    number: '01', icon: UserRoundCheck, title: 'Verify & Prepare Your Profile',
    badge: 'Verified foundation', gradient: 'from-[#FD7E14] to-[#FF8C42]',
    description: 'Create your account, verify your email, and keep the personal, academic, and document details used across your applications in one place.',
    bullets: [
      'Verify your email with a secure 6-digit code',
      'Add personal details, academic history, and test scores',
      'Upload required profile documents once for future applications',
    ],
  },
  {
    number: '02', icon: Building2, title: 'Explore Programs & Intakes',
    badge: 'Campus to intake', gradient: 'from-[#D32F2F] to-[#FF5722]',
    description: 'Search the live partner catalog, choose the right campus and program, then review a specific intake before starting your application.',
    bullets: [
      'Search partner institutions or filter them by country',
      'Move from institution to campus, program, and intake',
      'Review available dates and tuition before you apply',
    ],
  },
  {
    number: '03', icon: ClipboardCheck, title: 'Submit & Track Your Application',
    badge: 'One live record', gradient: 'from-[#C94D1B] to-[#FD7E14]',
    description: 'Your application, requests, payments, timeline, and status updates stay connected so you always know what needs attention next.',
    bullets: [
      'A draft submits once the required profile documents are ready',
      'Respond to document and payment requests inside the portal',
      'Follow status changes, timeline entries, and notifications',
    ],
  },
] as const;

const PROFILE_ITEMS = [
  { label: 'Personal details', note: 'Saved to your profile', icon: UserRoundCheck },
  { label: 'Academic history', note: 'Qualifications & test scores', icon: GraduationCap },
  { label: 'Required documents', note: 'Securely stored on file', icon: FileText },
];
const CATALOG_ITEMS = [
  { label: 'Institution', note: 'Partner university', icon: Building2 },
  { label: 'Campus', note: 'Choose a city', icon: MapPin },
  { label: 'Program', note: 'Select your course', icon: GraduationCap },
  { label: 'Intake', note: 'Review an open intake', icon: CalendarDays },
];
const APPLICATION_ITEMS = [
  { label: 'Draft created', note: 'Your selected intake is saved' },
  { label: 'Application submitted', note: 'A reference and timeline are created' },
  { label: 'Under review', note: 'Track requests and status changes' },
];

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function WorkflowPreview({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();
  const itemCount = step === 1 ? 4 : 3;
  const [phase, setPhase] = useState(reduceMotion ? itemCount - 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      setPhase(itemCount - 1);
      return;
    }
    setPhase(0);
    const timer = setInterval(() => setPhase((current) => (current + 1) % itemCount), 1000);
    return () => clearInterval(timer);
  }, [itemCount, reduceMotion, step]);

  const header = step === 0
    ? { title: 'Application profile', badge: 'EMAIL VERIFIED', icon: ShieldCheck }
    : step === 1
      ? { title: 'Live catalog path', badge: 'OPEN INTAKES', icon: Building2 }
      : { title: 'Application timeline', badge: 'STATUS TRACKED', icon: ClipboardCheck };
  const HeaderIcon = header.icon;

  return (
    <div className="relative flex min-h-[16rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111622] p-4 text-white/90 shadow-2xl sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#FD7E14]/15 blur-3xl" />
      <div className="relative z-10 mb-3 flex items-center justify-between border-b border-white/10 pb-3">
        <span className="flex items-center gap-2">
          <HeaderIcon className="h-4 w-4 text-[#FF8A5B]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 sm:text-xs">{header.title}</span>
        </span>
        <span className="rounded-full border border-[#FD7E14]/25 bg-[#FD7E14]/10 px-2 py-0.5 text-[8px] font-bold text-[#FF9A55] sm:text-[10px]">{header.badge}</span>
      </div>

      {step === 1 ? (
        <>
          <div className="relative z-10 mb-3 flex items-center gap-1 text-[9px] font-semibold text-white/35 sm:text-[10px]">
            {CATALOG_ITEMS.map((item, index) => (
              <span key={item.label} className="flex items-center gap-1">
                <span className={index <= phase ? 'text-[#FF8A5B]' : ''}>{item.label}</span>
                {index < 3 && <ArrowRight className="h-2.5 w-2.5" />}
              </span>
            ))}
          </div>
          <div className="relative z-10 grid flex-1 grid-cols-2 gap-2 sm:gap-2.5">
            {CATALOG_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const active = phase === index;
              return (
                <button
                  key={item.label} type="button" aria-pressed={active} onClick={() => setPhase(index)}
                  className={cx(
                    'rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD7E14] sm:p-3',
                    active ? 'border-[#FF6B3D] bg-[#FF6B3D]/12 shadow-[0_0_24px_rgba(255,87,34,0.12)]' : 'border-white/10 bg-white/[0.035] hover:border-white/20',
                  )}
                >
                  <span className="mb-2 flex items-center justify-between">
                    <span className={cx('flex h-7 w-7 items-center justify-center rounded-lg', index <= phase ? 'bg-[#FF6B3D]/20 text-[#FF8A5B]' : 'bg-white/7 text-white/35')}><Icon className="h-4 w-4" /></span>
                    <span className="text-[9px] font-black text-white/25">0{index + 1}</span>
                  </span>
                  <span className={cx('block text-[9px] font-bold uppercase tracking-wider sm:text-[10px]', active ? 'text-[#FF8A5B]' : 'text-white/45')}>{item.label}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-white/80 sm:text-[11px]">{item.note}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="relative z-10 flex flex-1 flex-col justify-center gap-3">
            {(step === 0 ? PROFILE_ITEMS : APPLICATION_ITEMS).map((item, index) => {
              const done = phase >= index;
              const Icon = step === 0 ? PROFILE_ITEMS[index].icon : CheckCircle2;
              return (
                <motion.div
                  key={item.label}
                  className={cx('flex items-center gap-3 rounded-xl border p-2.5 sm:p-3', done ? 'border-emerald-500/20 bg-emerald-500/[0.07]' : 'border-white/10 bg-white/[0.035]')}
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                >
                  <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', done ? 'bg-emerald-500 text-[#111622]' : 'bg-white/8 text-white/35')}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-xs font-bold', done ? 'text-white' : 'text-white/50')}>{item.label}</span>
                    <span className="block truncate text-[9px] text-white/40 sm:text-[10px]">{item.note}</span>
                  </span>
                  {phase === index && <span className="rounded-md border border-[#FD7E14]/25 bg-[#FD7E14]/10 px-2 py-0.5 text-[8px] font-bold text-[#FF9A55]">CURRENT</span>}
                </motion.div>
              );
            })}
          </div>
          <div className="relative z-10 mt-3">
            {step === 0 ? (
              <>
                <div className="mb-1.5 flex justify-between text-[9px] font-bold uppercase tracking-wider text-white/40"><span>Profile readiness</span><span>{phase + 1}/3 areas</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#FD7E14] to-emerald-400" animate={{ width: ((phase + 1) / 3) * 100 + '%' }} /></div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <span className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.035] p-2 text-[9px] font-semibold text-white/65 sm:text-[10px]"><FileText className="h-3.5 w-3.5 text-[#FD7E14]" /> Document requests</span>
                <span className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.035] p-2 text-[9px] font-semibold text-white/65 sm:text-[10px]"><BellRing className="h-3.5 w-3.5 text-sky-400" /> Portal updates</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function HowItWorks() {
  const reduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!paused && !reduceMotion) {
      intervalRef.current = setInterval(() => setActiveStep((current) => (current + 1) % STEPS.length), 7000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, reduceMotion]);

  const active = STEPS[activeStep];
  const StepIcon = active.icon;

  return (
    <section className="relative overflow-hidden bg-[#FFFCF5] py-20 sm:py-24" aria-labelledby="how-it-works-title">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute right-0 top-0 h-[550px] w-[550px] rounded-full bg-[#FD7E14]/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[450px] w-[450px] rounded-full bg-[#D32F2F]/4 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div className="mb-12 text-center sm:mb-16" initial={reduceMotion ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FD7E14]/20 bg-[#FD7E14]/10 px-4 py-2 shadow-sm">
            <Sparkles className="h-4 w-4 text-[#FD7E14]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#D96200]">Real 3-Step Portal Flow</span>
          </div>
          <h2 id="how-it-works-title" className="mb-4 text-4xl font-black tracking-tight text-[#1A1A1A] md:text-5xl">How Global Avenues Works</h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#666] sm:text-lg">From verified account to submitted application, your profile, documents, requests, and progress stay connected in one portal.</p>
        </motion.div>

        <div
          className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-14"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
          }}
        >
          <div className="relative flex flex-col justify-between gap-4" role="tablist" aria-label="How Global Avenues works">
            <div className="absolute bottom-10 left-10 top-10 z-0 hidden border-l-2 border-dotted border-[#FD7E14]/45 lg:block">
              <motion.div className="absolute -left-[2.5px] top-0 w-[3px] rounded-full bg-gradient-to-b from-[#FD7E14] to-[#C94D1B] shadow-[0_0_8px_#FD7E14]" animate={{ height: (activeStep / (STEPS.length - 1)) * 100 + '%' }} />
            </div>
            {STEPS.map((step, index) => {
              const selected = activeStep === index;
              return (
                <button
                  key={step.number} id={'workflow-tab-' + index} type="button" role="tab"
                  aria-selected={selected} aria-controls="workflow-panel" onClick={() => setActiveStep(index)}
                  className={cx(
                    'relative z-10 flex w-full items-start gap-4 rounded-2xl border p-4 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#D96200] focus-visible:ring-offset-2 sm:p-5',
                    selected ? 'border-[#FD7E14] bg-white shadow-[0_12px_40px_rgba(253,126,20,0.08)] lg:scale-[1.02]' : 'border-[#FD7E14]/10 hover:border-[#FD7E14]/30 hover:bg-white/40',
                  )}
                >
                  <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md', selected ? 'bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] text-white ring-4 ring-[#FD7E14]/15' : 'border border-[#FD7E14]/20 bg-white text-[#666]')}>{step.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cx('text-sm font-bold sm:text-base', selected ? 'text-[#D96200]' : 'text-[#1A1A1A]')}>{step.title}</span>
                      {selected && <span className="rounded-full border border-[#FD7E14]/20 bg-[#FD7E14]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#D96200]">{step.badge}</span>}
                    </span>
                    <span className={cx('mt-1.5 line-clamp-2 block text-xs leading-relaxed', selected ? 'text-[#666]' : 'text-[#999]')}>{step.description}</span>
                  </span>
                  {selected && <span className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rotate-45 border-r border-t border-[#FD7E14] bg-white lg:block" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep} id="workflow-panel" role="tabpanel" aria-labelledby={'workflow-tab-' + activeStep}
              initial={reduceMotion ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -20 }}
              className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-[#FD7E14]/15 bg-white p-5 shadow-[0_20px_50px_rgba(253,126,20,0.06)] sm:p-8"
            >
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className={cx('rounded-xl bg-gradient-to-br p-2 text-white shadow-md', active.gradient)}><StepIcon className="h-5 w-5" /></span>
                  <span className="rounded-md bg-[#D96200] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Step {active.number}</span>
                </div>
                <h3 className="mb-3 text-2xl font-black text-[#1A1A1A]">{active.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-[#666]">{active.description}</p>
                <ul className="mb-6 space-y-3">
                  {active.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span className="text-xs font-medium text-[#555]">{bullet}</span></li>
                  ))}
                </ul>
              </div>
              <WorkflowPreview step={activeStep} />
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div className="mt-14 text-center sm:mt-16" initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Link to="/apply" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D96200] to-[#C94D1B] px-8 py-4 font-bold text-white shadow-[0_8px_32px_rgba(217,98,0,0.35)] transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96200] focus-visible:ring-offset-4">
            Start Your Application <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
