import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { COMPANY } from '@/data/company';

const intents = [
  {
    id: 'student',
    label: 'Study Abroad',
    title: 'Student or Parent',
    icon: GraduationCap,
    note: 'Shortlisting, applications, visa and arrival support.',
  },
  {
    id: 'agent',
    label: 'Agent Network',
    title: 'Agent or Counsellor',
    icon: Users,
    note: 'Partner onboarding, university portfolio and application flow.',
  },
  {
    id: 'institution',
    label: 'Institution Growth',
    title: 'University or Institution',
    icon: Building2,
    note: 'India representation, market entry, promotion and collaborations.',
  },
];

const directChannels = [
  {
    label: 'Call',
    value: COMPANY.phone,
    helper: 'Mon-Sat, 9:00 AM - 7:00 PM IST',
    href: `tel:${COMPANY.phone}`,
    icon: Phone,
  },
  {
    label: 'WhatsApp',
    value: 'Chat with the team',
    helper: 'Best for quick document or status questions',
    href: `https://wa.me/${COMPANY.whatsapp}`,
    icon: MessageCircle,
  },
  {
    label: 'Email',
    value: COMPANY.email,
    helper: 'Best for institutional and detailed enquiries',
    href: `mailto:${COMPANY.email}`,
    icon: Mail,
  },
];

const processSteps = [
  { step: '01', title: 'Route', text: 'Your enquiry is routed to student success, agent relations, or institutional partnerships.' },
  { step: '02', title: 'Review', text: 'The team reviews your profile, market, or collaboration brief before responding.' },
  { step: '03', title: 'Next action', text: 'You receive a clear next step: call slot, document list, portfolio note, or partnership discussion.' },
];

export function ContactPage() {
  const [intent, setIntent] = useState(intents[0].id);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const selectedIntent = useMemo(() => intents.find((item) => item.id === intent) ?? intents[0], [intent]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-24">
      <section className="relative overflow-hidden bg-[#07111F]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(253,126,20,0.24),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(0,116,217,0.34),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-[#FFB36B]">
              <Sparkles className="h-4 w-4" />
              Contact The Global Avenues
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.05] text-white md:text-6xl">
              One front door for students, agents, and institutions.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
              Reach the New Delhi team for international admissions, university representation, channel partnerships, and collaboration enquiries.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { value: '15+', label: 'Partner institutions' },
                { value: '600+', label: 'Channel partners' },
                { value: '4K+', label: 'Students recruited' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="text-2xl font-black text-white">{item.value}</div>
                  <div className="mt-1 text-xs text-white/56">{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-md"
          >
            <div className="rounded-[1.5rem] bg-white p-5 text-[#111827]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FD7E14]">Response desk</p>
                  <h2 className="mt-1 text-xl font-bold">Choose your enquiry route</h2>
                </div>
                <Clock className="h-5 w-5 text-[#0074D9]" />
              </div>

              <div className="mt-4 grid gap-3">
                {intents.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === intent;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIntent(item.id)}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                        active ? 'border-[#FD7E14] bg-[#FFF6ED]' : 'border-slate-200 bg-white hover:border-[#0074D9]/30 hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[#FD7E14] text-white' : 'bg-[#EAF5FF] text-[#0074D9]'}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold">{item.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-600">{item.note}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {directChannels.map((channel, index) => {
            const Icon = channel.icon;
            return (
              <motion.a
                key={channel.label}
                href={channel.href}
                target={channel.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="group rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[#FD7E14]/35 hover:shadow-[0_20px_44px_rgba(15,23,42,0.1)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF1E6] text-[#FD7E14] transition group-hover:bg-[#FD7E14] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#FD7E14]" />
                </div>
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{channel.label}</h3>
                <p className="mt-2 text-lg font-bold text-slate-950">{channel.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{channel.helper}</p>
              </motion.a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="space-y-6"
        >
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0074D9]">What happens next</p>
            <div className="mt-7 space-y-5">
              {processSteps.map((item) => (
                <div key={item.step} className="grid grid-cols-[3.5rem_1fr] gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF5FF] text-sm font-black text-[#0074D9]">
                    {item.step}
                  </div>
                  <div className="border-b border-slate-200 pb-5 last:border-0 last:pb-0">
                    <h3 className="font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FD7E14]">New Delhi HQ</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">Visit or write to the India team.</h2>
            <div className="mt-6 space-y-4 text-sm leading-6 text-slate-600">
              <p className="flex gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#FD7E14]" />
                {COMPANY.address}
              </p>
              <p className="flex gap-3">
                <Phone className="mt-1 h-4 w-4 shrink-0 text-[#FD7E14]" />
                {COMPANY.phone}
              </p>
              <p className="flex gap-3">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-[#FD7E14]" />
                {COMPANY.email}
              </p>
            </div>
            <div className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-[#F8FAFC]">
              <div className="relative h-56">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,116,217,0.08)_1px,transparent_1px),linear-gradient(rgba(0,116,217,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FD7E14] text-white shadow-[0_14px_34px_rgba(253,126,20,0.32)]">
                    <MapPin className="h-7 w-7" />
                  </span>
                  <span className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">
                    South Extension II, New Delhi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.1)] md:p-8"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FD7E14]">{selectedIntent.label}</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Send a focused enquiry</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                {selectedIntent.note} Keep it short and specific; the team can route it faster.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Front desk active
            </span>
          </div>

          {submitted ? (
            <div className="mt-8 rounded-[1.5rem] border border-green-200 bg-green-50 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="mt-4 text-xl font-bold text-green-900">Message received</h3>
              <p className="mt-2 text-sm leading-6 text-green-800">
                This frontend demo has captured your enquiry state. Wire this form to the CRM API when backend integration starts.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <input type="hidden" name="intent" value={intent} />
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Full name</span>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#FD7E14] focus:ring-4 focus:ring-[#FD7E14]/10"
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#FD7E14] focus:ring-4 focus:ring-[#FD7E14]/10"
                    placeholder="name@example.com"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Phone or WhatsApp</span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#FD7E14] focus:ring-4 focus:ring-[#FD7E14]/10"
                  placeholder="+91 XXXXX XXXXX"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Message</span>
                <textarea
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#FD7E14] focus:ring-4 focus:ring-[#FD7E14]/10"
                  placeholder="Tell us the destination, intake, institution, or collaboration goal you want to discuss."
                />
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] px-6 py-4 text-sm font-bold text-white shadow-[0_16px_38px_rgba(253,126,20,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(253,126,20,0.36)]"
              >
                Send enquiry <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </motion.div>
      </section>
    </div>
  );
}
