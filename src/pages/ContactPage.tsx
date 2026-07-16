import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { COMPANY } from '@/data/company';

const directEmailDesks = [
  {
    label: 'In-Country Representation',
    email: COMPANY.inCountryRepresentationEmail,
  },
  {
    label: 'UNI Collaboration',
    email: COMPANY.partnershipsEmail,
  },
  {
    label: 'B2B Agent Partnership',
    email: COMPANY.agentPartnershipEmail,
  },
  {
    label: 'Admissions',
    email: COMPANY.admissionsEmail,
  },
  {
    label: 'Job Opportunities',
    email: COMPANY.careersEmail,
  },
];

const contactTeams = [
  {
    title: 'Student Admissions & Support',
    address: COMPANY.address,
    phone: COMPANY.phone,
    email: COMPANY.admissionsEmail,
  },
  {
    title: 'Education Agent Partnerships',
    address: COMPANY.address,
    phone: COMPANY.phone,
    email: COMPANY.agentPartnershipEmail,
  },
  {
    title: 'General Enquiries',
    address: COMPANY.address,
    phone: '+91 9971801133',
    email: COMPANY.email,
  },
];



const phoneHref = (phone: string) => 'tel:' + phone.replace(/[^\d+]/g, '');

export function ContactPage() {
  const [activeOfficeId, setActiveOfficeId] = useState(COMPANY.offices[0].id);

  const activeOffice =
    COMPANY.offices.find((office) => office.id === activeOfficeId) ?? COMPANY.offices[0];


  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-[61px] sm:pt-[73px] xl:pt-[102px]">
      <section className="relative overflow-hidden bg-[#07111F]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(253,126,20,0.24),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(0,116,217,0.34),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-[#FFB36B]">
              Contact The Global Avenues
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] text-white sm:text-5xl md:text-6xl">
              Guidance for Students and Education Agents
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
              Connect with our team for study-abroad admissions, application support, or B2B agent
              partnership guidance.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  value: COMPANY.stats.partnerUniversities + '+',
                  label: 'Partner Universities',
                },
                {
                  value: COMPANY.stats.countries + '+',
                  label: 'Countries',
                },
                {
                  value: COMPANY.stats.applicationsManaged + '+',
                  label: 'Applications Managed',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                >
                  <div className="text-2xl font-black text-white">{item.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.12em] text-white/56">
                    {item.label}
                  </div>
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
              <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4328A8] to-[#FD7E14] text-white">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold">Direct Email Desks</h2>
                  <p className="mt-1 text-sm text-slate-600">Route your inquiry to the right team</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {directEmailDesks.map((desk) => (
                  <a
                    key={desk.label}
                    href={'mailto:' + desk.email}
                    className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-[#FD7E14]/35 hover:bg-[#FFF8F2]"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {desk.label}
                      </span>
                      <span className="mt-1 block break-all text-sm font-bold text-slate-950 sm:break-normal">
                        {desk.email}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#FD7E14]" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              label: 'Email',
              value: COMPANY.email,
              icon: Mail,
              href: 'mailto:' + COMPANY.email,
            },
            {
              label: 'Phone',
              value: COMPANY.phone,
              icon: Phone,
              href: phoneHref(COMPANY.phone),
            },
            {
              label: 'Address',
              value: COMPANY.address,
              icon: MapPin,
            },
          ].map((channel, index) => {
            const Icon = channel.icon;
            const content = (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF1E6] text-[#FD7E14]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {channel.label}
                </h2>
                <p className="mt-2 break-all text-lg font-bold leading-7 text-slate-950 sm:break-words">{channel.value}</p>
              </>
            );

            const classes =
              'min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[#FD7E14]/35 hover:shadow-[0_20px_44px_rgba(15,23,42,0.1)] sm:p-6';

            return channel.href ? (
              <motion.a
                key={channel.label}
                href={channel.href}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className={classes}
              >
                {content}
              </motion.a>
            ) : (
              <motion.div
                key={channel.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className={classes}
              >
                {content}
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-16">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#4328A8]">
            <img
              src={COMPANY.logoMarkUrl}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 object-contain"
            />
            Our Global Presence
          </div>
          <h2 className="mt-4 text-3xl font-bold text-slate-950 md:text-4xl">
            Where in the world are we?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Connect with our headquarters and regional desks for student admissions, application
            support, agent partnerships, and careers.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0074D9]">
              Office Network
            </p>
            <h3 className="text-2xl font-bold text-slate-950">Choose a regional desk</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {COMPANY.offices.map((office) => {
                const active = office.id === activeOffice.id;

                return (
                  <button
                    key={office.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveOfficeId(office.id)}
                    className={
                      'flex items-start justify-between gap-4 rounded-2xl border p-4 text-left transition ' +
                      (active
                        ? 'border-[#FD7E14] bg-[#FFF6ED] shadow-sm'
                        : 'border-slate-200 bg-white hover:border-[#0074D9]/30 hover:bg-[#F8FAFC]')
                    }
                  >
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {office.type}
                      </span>
                      <span className="mt-1 block font-bold text-slate-950">{office.country}</span>
                      <span className="mt-1 block text-sm text-slate-600">{office.city}</span>
                    </span>
                    <span
                      className={
                        'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ' +
                        (active ? 'bg-[#FD7E14]' : 'bg-[#0074D9]/30')
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <motion.div
            key={activeOffice.id}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-7"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EAF5FF] text-[#0074D9]">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FD7E14]">
                  {activeOffice.type}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">{activeOffice.country}</h3>
                <p className="mt-1 text-base font-semibold text-slate-600">{activeOffice.city}</p>
              </div>
            </div>

            <div className="mt-7 space-y-4 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-600">
              <p className="flex gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#FD7E14]" />
                {activeOffice.address}
              </p>
              {activeOffice.phones.map((phone) => (
                <a
                  key={phone}
                  href={phoneHref(phone)}
                  className="flex gap-3 transition-colors hover:text-[#FD7E14]"
                >
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-[#FD7E14]" />
                  {phone}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-start gap-6 px-4 pb-14 sm:px-6 sm:pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FD7E14]">
              Connect Faster
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">
              Talk to the right team directly
            </h2>
            <div className="mt-6 space-y-4">
              {contactTeams.map((team) => (
                <div key={team.title} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Team
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-slate-950">{team.title}</h3>
                  <p className="mt-3 flex gap-2 text-sm leading-6 text-slate-600">
                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#FD7E14]" />
                    {team.address}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
                    <a
                      href={phoneHref(team.phone)}
                      className="inline-flex items-center gap-2 transition-colors hover:text-[#FD7E14]"
                    >
                      <Phone className="h-4 w-4 text-[#FD7E14]" />
                      {team.phone}
                    </a>
                    <a
                      href={'mailto:' + team.email}
                      className="inline-flex min-w-0 items-center gap-2 break-all transition-colors hover:text-[#FD7E14] sm:break-normal"
                    >
                      <Mail className="h-4 w-4 text-[#FD7E14]" />
                      {team.email}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">

          <a
            href={'https://wa.me/' + COMPANY.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="group block h-fit rounded-[2rem] bg-gradient-to-br from-[#075E54] to-[#128C7E] p-5 text-white shadow-[0_18px_50px_rgba(7,94,84,0.2)] sm:p-7"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Preferred Channel
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              Need quick help with an application or agent enquiry?
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              Message our team on WhatsApp and we will connect you with student admissions or the
              education agent partnership desk.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-[#075E54] sm:px-5">
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </a>

        </div>

      </section>
    </div>
  );
}
