import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Youtube,
} from 'lucide-react';
import { COMPANY } from '@/data/company';

const destinationLinks = [
  'Austria',
  'Estonia',
  'France',
  'Cyprus',
  'United States',
  'Grenada',
  'Germany',
  'Malta',
];

const serviceLinks = [
  { label: 'In-Country Representation', href: '/services/representation' },
  { label: 'Marketing & Promotion', href: '/services/marketing' },
  { label: 'Agent Management', href: '/services/agent-management' },
  { label: 'Administrative Services', href: '/services/administrative-services' },
  { label: 'Collaboration & Partnerships', href: '/partners' },
];

const companyLinks = [
  { label: 'Who We Are', href: '/about' },
  { label: 'Universities', href: '/universities' },
  { label: 'Courses', href: '/courses' },
  { label: 'Blog & News', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

const socialLinks = [
  { icon: Facebook, href: COMPANY.socials.facebook, label: 'Facebook' },
  { icon: Instagram, href: COMPANY.socials.instagram, label: 'Instagram' },
  { icon: Youtube, href: COMPANY.socials.youtube, label: 'YouTube' },
  { icon: Linkedin, href: COMPANY.socials.linkedin, label: 'LinkedIn' },
];

function destinationSlug(country: string) {
  return country.toLowerCase().replace(/ /g, '-');
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#07111F] text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FD7E14]/70 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,116,217,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(253,126,20,0.16),transparent_34%)]" />

      <div className="relative max-w-7xl mx-auto px-6 pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:p-8 shadow-[0_-10px_60px_rgba(0,0,0,0.22)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FD7E14]/30 bg-[#FD7E14]/10 px-3 py-1 text-xs font-semibold text-[#FFB36B]">
              <ShieldCheck className="h-3.5 w-3.5" />
              ICEF Certified international education partner
            </div>
            <h2 className="mt-5 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
              Build your next international education move with a verified partner network.
            </h2>
          </div>

          <div className="flex flex-col justify-between gap-5 rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
            <p className="text-sm leading-relaxed text-white/68">
              Students, agents, and institutions can connect with The Global Avenues for admissions, market representation, and collaboration support.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/apply"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(253,126,20,0.32)] transition-all hover:translate-y-[-1px] hover:shadow-[0_14px_38px_rgba(253,126,20,0.42)]"
              >
                Start Application <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/[0.12]"
              >
                Talk to Team
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 py-14 lg:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <img src={COMPANY.logoFooterUrl} alt={`${COMPANY.name} logo`} className="h-14 w-auto max-w-[320px] object-contain" />
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/62">
              {COMPANY.description}
            </p>

            <div className="mt-6 grid gap-3">
              <a href={`mailto:${COMPANY.email}`} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-[#FD7E14]/35 hover:bg-white/[0.06]">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#FD7E14]" />
                <span className="text-sm text-white/68 group-hover:text-white">{COMPANY.email}</span>
              </a>
              <a href={`tel:${COMPANY.phone}`} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-[#FD7E14]/35 hover:bg-white/[0.06]">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#FD7E14]" />
                <span className="text-sm text-white/68 group-hover:text-white">{COMPANY.phone}</span>
              </a>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FD7E14]" />
                <span className="text-sm leading-relaxed text-white/68">{COMPANY.address}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-[#7CCBFF]">Destinations</h3>
            <ul className="space-y-3">
              {destinationLinks.map((country) => (
                <li key={country}>
                  <Link to={`/destinations/${destinationSlug(country)}`} className="group inline-flex items-center gap-2 text-sm text-white/58 transition-colors hover:text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0074D9] transition-transform group-hover:scale-150" />
                    {country}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-[#FFB36B]">Services</h3>
            <ul className="space-y-3">
              {serviceLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="group inline-flex items-center gap-2 text-sm text-white/58 transition-colors hover:text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FD7E14] transition-transform group-hover:scale-150" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-white/80">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="group inline-flex items-center gap-2 text-sm text-white/58 transition-colors hover:text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/25 transition-transform group-hover:scale-150 group-hover:bg-white" />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="https://theglobalavenues.com" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-sm text-white/58 transition-colors hover:text-white">
                  <ExternalLink className="h-3.5 w-3.5 text-[#FD7E14]" />
                  Main Website
                </a>
              </li>
            </ul>

            <div className="mt-7 flex flex-wrap gap-2">
              {COMPANY.certifications.map((cert) => (
                <span key={cert} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/62">
                  {cert}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/42">
            Copyright {new Date().getFullYear()} The Global Avenues. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65 transition-all hover:border-[#FD7E14]/50 hover:bg-[#FD7E14] hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
