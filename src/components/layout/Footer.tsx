import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Linkedin, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { COMPANY } from '@/data/company';

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Col 1 — Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <img src={COMPANY.logoFooterUrl} alt={`${COMPANY.name} logo`} className="h-12 w-auto object-contain" />
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-xs">
              {COMPANY.description}
            </p>
            {/* Socials */}
            <div className="flex items-center gap-3 mb-6">
              {[
                { icon: Facebook, href: COMPANY.socials.facebook, label: 'Facebook' },
                { icon: Instagram, href: COMPANY.socials.instagram, label: 'Instagram' },
                { icon: Youtube, href: COMPANY.socials.youtube, label: 'YouTube' },
                { icon: Linkedin, href: COMPANY.socials.linkedin, label: 'LinkedIn' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center hover:bg-[#FD7E14] transition-all border border-white/10 hover:border-[#FD7E14]"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
            {/* Certifications */}
            <div className="flex items-center gap-2">
              {COMPANY.certifications.map((cert) => (
                <span key={cert} className="px-3 py-1 bg-white/8 rounded-lg text-xs border border-white/10 text-white/70">
                  {cert}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2 — Destinations */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-[#FFC107] mb-5">Destinations</h4>
            <ul className="space-y-2.5">
              {['Austria', 'Estonia', 'France', 'Cyprus', 'USA', 'Grenada', 'Germany', 'Malta'].map((country) => (
                <li key={country}>
                  <Link
                    to={`/destinations/${country.toLowerCase().replace(/ /g, '-')}`}
                    className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#FD7E14] group-hover:scale-150 transition-transform" />
                    {country}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Services */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-[#FFC107] mb-5">Services</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'In-Country Representation', href: '/services/representation' },
                { label: 'Marketing & Promotion', href: '/services/marketing' },
                { label: 'Agent Management', href: '/services/agent-management' },
                { label: 'Market Research & Analysis', href: '/services/market-research' },
                { label: 'Administrative Services', href: '/services/administrative-services' },
                { label: 'Collaboration & Partnerships', href: '/partners' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.href} className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#FD7E14] group-hover:scale-150 transition-transform" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Company + Contact */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-[#FFC107] mb-5">Company</h4>
            <ul className="space-y-2.5 mb-6">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Our Partners', href: '/partners' },
                { label: 'Blog & News', href: '/blog' },
                { label: 'Contact Us', href: '/contact' },
                { label: 'Apply Now', href: '/apply' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.href} className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#FD7E14] group-hover:scale-150 transition-transform" />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://theglobalavenues.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <ExternalLink className="w-3 h-3 text-[#FD7E14]" />
                  Main Website
                </a>
              </li>
            </ul>

            <h4 className="font-bold text-sm uppercase tracking-wider text-[#FFC107] mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href={`mailto:${COMPANY.email}`} className="flex items-start gap-2.5 text-sm text-white/60 hover:text-white transition-colors">
                  <Mail className="w-4 h-4 mt-0.5 text-[#FD7E14] flex-shrink-0" />
                  {COMPANY.email}
                </a>
              </li>
              <li>
                <a href={`tel:${COMPANY.phone}`} className="flex items-start gap-2.5 text-sm text-white/60 hover:text-white transition-colors">
                  <Phone className="w-4 h-4 mt-0.5 text-[#FD7E14] flex-shrink-0" />
                  {COMPANY.phone}
                </a>
              </li>
              <li>
                <div className="flex items-start gap-2.5 text-sm text-white/60">
                  <MapPin className="w-4 h-4 mt-0.5 text-[#FD7E14] flex-shrink-0" />
                  <span>{COMPANY.address}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            Copyright � {new Date().getFullYear()} The Global Avenues. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Sitemap'].map((item) => (
              <a key={item} href="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}