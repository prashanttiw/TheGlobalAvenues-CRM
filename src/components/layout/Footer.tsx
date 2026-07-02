import { Link } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { COMPANY } from '@/data/company';

const columns = [
  {
    title: 'Connect',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Apply Now', href: '/apply' },
    ],
  },
  {
    title: 'Portal',
    links: [
      { label: 'Student Login', href: '/portal/login' },
      { label: 'Student Dashboard', href: '/portal/student' },
      { label: 'Agent Dashboard', href: '/portal/agent' },
    ],
  },
];

const socials = [
  { icon: Facebook, href: COMPANY.socials.facebook, label: 'Facebook' },
  { icon: Instagram, href: COMPANY.socials.instagram, label: 'Instagram' },
  { icon: Youtube, href: COMPANY.socials.youtube, label: 'YouTube' },
  { icon: Linkedin, href: COMPANY.socials.linkedin, label: 'LinkedIn' },
];

export function Footer() {
  return (
    <footer className="bg-[#07111F] text-white">
      <div className="border-y border-white/10 bg-gradient-to-r from-[#001F3F] via-[#062B52] to-[#1A0A00]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-7 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FFB36B]">
              Education . Consulting . Collaborations
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Ready to build your global education pathway?
            </h2>
          </div>
          <Link
            to="/apply"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FD7E14] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(253,126,20,0.28)] transition hover:-translate-y-0.5 hover:bg-[#E8650A]"
          >
            Start Application <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <img src={COMPANY.logoFooterUrl} alt={`${COMPANY.name} logo`} className="h-12 w-auto max-w-[300px] object-contain" />
            <p className="mt-5 max-w-md text-sm leading-7 text-white/62">
              {COMPANY.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {COMPANY.certifications.map((cert) => (
                <span key={cert} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/64">
                  {cert}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/82">{column.title}</h3>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className="text-sm text-white/56 transition-colors hover:text-[#FFB36B]">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 border-t border-white/10 pt-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-3 text-sm text-white/58 md:flex-row md:flex-wrap md:items-center md:gap-6">
            <a href={`mailto:${COMPANY.email}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
              <Mail className="h-4 w-4 text-[#FD7E14]" />
              {COMPANY.email}
            </a>
            <a href={`tel:${COMPANY.phone}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
              <Phone className="h-4 w-4 text-[#FD7E14]" />
              {COMPANY.phone}
            </a>
            <span className="inline-flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FD7E14]" />
              {COMPANY.address}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {socials.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/65 transition hover:border-[#FD7E14]/50 hover:bg-[#FD7E14] hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-white/38 md:flex-row md:items-center md:justify-between">
          <p>Copyright {new Date().getFullYear()} The Global Avenues. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="https://theglobalavenues.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
              Main Website
            </a>
            <Link to="/contact" className="hover:text-white/70">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
