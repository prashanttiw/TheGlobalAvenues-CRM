import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  LayoutDashboard,
  Search,
  UserRound,
} from 'lucide-react';

const journeySteps = [
  { number: '01', icon: UserRound, title: 'Complete your profile', description: 'Add your academic background and study preferences so your application record is ready' },
  { number: '02', icon: Search, title: 'Browse the live catalogue', description: 'Explore university groups, campuses and programmes currently available in the portal' },
  { number: '03', icon: CalendarDays, title: 'Review programmes and intakes', description: 'Check programme details, intake status and deadlines recorded in the CRM' },
  { number: '04', icon: FileCheck2, title: 'Apply and track progress', description: 'Create an application, upload documents and follow every status update from one place' },
];

const portalAreas = [
  { icon: UserRound, title: 'Profile', description: 'Academic and personal details', state: 'Your record' },
  { icon: Building2, title: 'University catalogue', description: 'Campuses, programmes and intakes', state: 'CRM catalogue' },
  { icon: LayoutDashboard, title: 'Applications', description: 'Drafts, submissions and status', state: 'Track progress' },
  { icon: FileCheck2, title: 'Documents', description: 'Application document checklist', state: 'Stay organised' },
];

export function AIMatcherWidget() {
  return (
    <section id="student-portal-journey" className="relative overflow-hidden bg-[#FFF9F2] py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.12]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#FD7E14]/20 bg-white px-4 py-2 shadow-sm">
            <LayoutDashboard className="h-4 w-4 text-[#FD7E14]" />
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#C94D1B]">Student Portal Journey</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[#101828] sm:text-4xl md:text-5xl">
            Plan Your Study Journey in One Portal
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            Move from profile completion to a focused application with clear, record-based information at every step
          </p>
        </div>

        <div className="grid items-stretch gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FD7E14]">How it works</p>
                <h3 className="mt-2 text-xl font-black text-[#101828] sm:text-2xl">A clear path from profile to application</h3>
              </div>
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#001F3F] text-white sm:flex">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-3">
              {journeySteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#FD7E14] shadow-sm ring-1 ring-slate-200/70">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[10px] font-black tracking-[0.16em] text-[#FD7E14]">{step.number}</span>
                        <h4 className="text-sm font-extrabold text-[#101828] sm:text-base">{step.title}</h4>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-[#163A5F] bg-[#071B2E] p-4 shadow-[0_28px_80px_rgba(0,31,63,0.22)] sm:p-6">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />CRM-backed workflow
                  </div>
                  <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">Your student workspace</h3>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />Available after sign in
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {portalAreas.map((area) => {
                  const Icon = area.icon;
                  return (
                    <div key={area.title} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FD7E14] text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">{area.state}</span>
                      </div>
                      <h4 className="mt-4 font-extrabold text-white">{area.title}</h4>
                      <p className="mt-1 text-sm leading-5 text-slate-300">{area.description}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4 text-sm leading-6 text-orange-50">
                University, programme, intake and application information is read from the CRM after you sign in
              </p>
            </div>
            <div className="flex flex-col gap-3 px-1 pt-5 sm:flex-row">
              <Link to="/apply?role=student" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] px-5 py-3 text-sm font-extrabold text-white">
                Create Student Profile<ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/portal/login" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-extrabold text-white">
                Student Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}