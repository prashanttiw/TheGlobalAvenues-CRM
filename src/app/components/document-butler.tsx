import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const WORKFLOW_STEPS = [
  {
    label: 'Request created',
    actor: 'TGA team',
    status: 'Requested',
    icon: BellRing,
    title: 'TGA asks for the right document',
    description:
      'A document request is added to the student’s application with a clear label, instructions and an optional deadline.',
    activity: 'A new request appears in Documents Vault and the application timeline.',
  },
  {
    label: 'Portal upload',
    actor: 'Student or agent',
    status: 'Submitted',
    icon: UploadCloud,
    title: 'Upload securely from the CRM dashboard',
    description:
      'The student—or their assigned agent—opens the request in the portal and submits the requested file from there.',
    activity: 'The file is safety-checked, stored privately and added to the review queue.',
  },
  {
    label: 'TGA review',
    actor: 'TGA team',
    status: 'Awaiting review',
    icon: UserRoundCheck,
    title: 'A person reviews the submission',
    description:
      'The TGA team checks the document against the request and can approve it or return it with a specific reason.',
    activity: 'The student and agent can follow the same status from the application and Documents Vault.',
  },
  {
    label: 'Decision recorded',
    actor: 'Shared progress',
    status: 'Approved',
    icon: FileCheck2,
    title: 'Approval locks the reviewed file',
    description:
      'Approved files cannot be silently replaced. If changes are needed, the rejection reason stays visible and a new version can be uploaded.',
    activity: 'Every decision and resubmission remains part of the application history.',
  },
];

const STATUS_STYLES = [
  'border-amber-200 bg-amber-50 text-amber-700',
  'border-blue-200 bg-blue-50 text-blue-700',
  'border-violet-200 bg-violet-50 text-violet-700',
  'border-emerald-200 bg-emerald-50 text-emerald-700',
];

export function DocumentButler() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const current = WORKFLOW_STEPS[activeStep];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (reduceMotion || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % WORKFLOW_STEPS.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [isPaused, reduceMotion]);

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#F3F9FF] to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <motion.div
          className="mx-auto mb-12 max-w-3xl text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0074D9]/10 px-4 py-2 text-sm font-semibold text-[#0074D9]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Documents Vault
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-[#001F3F] md:text-5xl">
            Document requests, handled inside your CRM.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#001F3F]/70">
            TGA requests what is needed for an application. Students or their assigned agent upload through the
            dashboard, then follow review and feedback in one place.
          </p>
        </motion.div>

        <div
          className="grid items-stretch gap-7 lg:grid-cols-[0.78fr_1.22fr]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="rounded-3xl border border-[#0074D9]/15 bg-[#F8FBFF] p-4 shadow-[0_18px_50px_rgba(0,31,63,0.07)] sm:p-5"
          >
            <div className="flex items-center justify-between px-2 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0074D9]">The actual portal flow</p>
                <p className="mt-1 text-sm text-[#001F3F]/60">Select a stage to preview it</p>
              </div>
              <span className="rounded-full border border-[#0074D9]/15 bg-white px-3 py-1 text-xs font-bold text-[#001F3F]">
                {activeStep + 1} / {WORKFLOW_STEPS.length}
              </span>
            </div>

            <div className="relative space-y-2">
              <div className="absolute bottom-7 left-[1.55rem] top-7 w-px bg-[#0074D9]/15" aria-hidden="true" />
              <motion.div
                className="absolute left-[1.48rem] top-7 w-[3px] origin-top rounded-full bg-[#0074D9]"
                animate={{ height: `${(activeStep / (WORKFLOW_STEPS.length - 1)) * 75}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
                aria-hidden="true"
              />

              {WORKFLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeStep;
                const isComplete = index < activeStep;

                return (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    aria-pressed={isActive}
                    className={`relative z-10 flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074D9] focus-visible:ring-offset-2 ${
                      isActive
                        ? 'border-[#0074D9] bg-white shadow-[0_10px_28px_rgba(0,116,217,0.12)]'
                        : 'border-transparent bg-transparent hover:border-[#0074D9]/15 hover:bg-white/70'
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
                        isActive
                          ? 'border-[#0074D9] bg-[#0074D9] text-white'
                          : isComplete
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                            : 'border-[#D7E8F7] bg-white text-[#6D849A]'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className={`block text-sm font-bold ${isActive ? 'text-[#0074D9]' : 'text-[#001F3F]'}`}>
                        {step.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#001F3F]/55">{step.actor}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="rounded-3xl bg-gradient-to-br from-[#001F3F] to-[#0074D9] p-4 shadow-[0_28px_70px_rgba(0,31,63,0.2)] sm:p-6"
          >
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#DFEAF3] bg-[#F8FBFF] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF8A65]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FFD166]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#62C991]" />
                  </div>
                  <span className="hidden text-xs font-semibold text-[#001F3F]/55 sm:inline">
                    TGA CRM · Documents Vault
                  </span>
                </div>
                <span className="rounded-full bg-[#001F3F] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Portal preview
                </span>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0074D9]/10 text-[#0074D9]">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0074D9]">
                        Application document
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-[#001F3F]">Passport copy</h3>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[activeStep]}`}>
                    {current.status}
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-[#DDEAF5] bg-[#F8FBFF] p-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#0074D9]" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-[#001F3F]">Request details stay with the application</p>
                      <p className="mt-1 text-xs leading-5 text-[#001F3F]/60">
                        Upload a clear scan of the passport photo page. Any deadline and review feedback appear here.
                      </p>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3 }}
                    className="mt-5 rounded-2xl border border-[#0074D9]/15 bg-white p-5 shadow-[0_10px_28px_rgba(0,31,63,0.07)]"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0074D9] to-[#001F3F] text-white">
                        <CurrentIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0074D9]">{current.actor}</p>
                        <h4 className="mt-1 text-lg font-bold text-[#001F3F]">{current.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-[#001F3F]/65">{current.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-start gap-2 border-t border-[#E6EEF5] pt-4 text-xs leading-5 text-[#001F3F]/60">
                      {activeStep === 3 ? (
                        <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-[#0074D9]" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#0074D9]" aria-hidden="true" />
                      )}
                      {current.activity}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-xl bg-[#F5F9FC] px-3 py-2.5 text-xs font-semibold text-[#41576C]">
                    <ShieldCheck className="h-4 w-4 text-[#0074D9]" aria-hidden="true" />
                    Safety checks
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-[#F5F9FC] px-3 py-2.5 text-xs font-semibold text-[#41576C]">
                    <LockKeyhole className="h-4 w-4 text-[#0074D9]" aria-hidden="true" />
                    Private access
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-[#F5F9FC] px-3 py-2.5 text-xs font-semibold text-[#41576C]">
                    <UsersRound className="h-4 w-4 text-[#0074D9]" aria-hidden="true" />
                    Shared status
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="mt-9 flex justify-center sm:justify-end"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >

          <Link
            to="/portal/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0074D9] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#005FAF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074D9] focus-visible:ring-offset-2"
          >
            Open portal login
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
