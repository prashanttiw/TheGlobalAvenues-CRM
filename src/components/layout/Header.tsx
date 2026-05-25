import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Globe, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COMPANY, NAV_LINKS } from '@/data/company';

const DROPDOWN_ITEMS: Record<string, { label: string; href: string; desc: string }[]> = {
  Destinations: [
    { label: 'All Destinations', href: '/destinations', desc: 'Verified study destinations' },
    { label: 'Austria', href: '/destinations/austria', desc: 'FH Kufstein Tirol pathways' },
    { label: 'Estonia', href: '/destinations/estonia', desc: 'EUAS business, IT and design' },
    { label: 'France', href: '/destinations/france', desc: 'ICN, CEFAM and MJM options' },
    { label: 'Cyprus', href: '/destinations/cyprus', desc: 'Mesoyios and KES College' },
    { label: 'United States', href: '/destinations/united-states', desc: 'IAU and US partner pathways' },
  ],
  Universities: [
    { label: 'All Universities', href: '/universities', desc: 'Verified portfolio partners' },
    { label: 'FH Kufstein Tirol', href: '/universities/fh-kufstein-tirol', desc: 'Austria' },
    { label: 'EUAS', href: '/universities/estonian-entrepreneurship-university-of-applied-sciences', desc: 'Estonia' },
    { label: 'ICN Business School', href: '/universities/icn-business-school', desc: 'France and Germany' },
    { label: 'International American University', href: '/universities/international-american-university', desc: 'USA, Malta and UAE' },
  ],
  Courses: [
    { label: 'All Courses', href: '/courses', desc: 'English-taught partner programs' },
    { label: 'Business & Management', href: '/courses/business-mba', desc: 'Bachelor, master and MBA routes' },
    { label: 'IT & Game Design', href: '/courses/computer-science', desc: 'EUAS and EPITECH-aligned tracks' },
    { label: 'Medicine & Health', href: '/courses/medicine-health', desc: 'SGU medical pathways' },
    { label: 'Design & Creative Arts', href: '/courses/arts-design', desc: 'MJM and creative programs' },
  ],
  Services: [
    { label: 'All Services', href: '/services', desc: 'End-to-end student recruitment support' },
    { label: 'In-Country Representation', href: '/services/representation', desc: 'Local presence for institutions' },
    { label: 'Marketing & Promotion', href: '/services/marketing', desc: 'Targeted market outreach' },
    { label: 'Agent Management', href: '/services/agent-management', desc: 'Channel partner development' },
    { label: 'Administrative Services', href: '/services/administrative-services', desc: 'Applications, visa and support' },
  ],
};

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [location]);

  const isHome = location.pathname === '/';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || !isHome
          ? 'bg-white/98 backdrop-blur-xl shadow-[0_4px_20px_rgba(253,126,20,0.08)] border-b border-[#FD7E14]/10'
          : 'bg-transparent'
      }`}
    >
      {/* Top bar */}
      <div className={`hidden lg:block border-b transition-all duration-300 ${scrolled || !isHome ? 'border-[#FD7E14]/10 bg-[#FFFCF5]' : 'border-white/10 bg-black/20'}`}>
        <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs">
            <a href={`tel:${COMPANY.phone}`} className={`flex items-center gap-1.5 transition-colors ${scrolled || !isHome ? 'text-[#666]  hover:text-[#FD7E14]' : 'text-white/80 hover:text-white'}`}>
              <Phone className="w-3 h-3" />
              {COMPANY.phone}
            </a>
            <a href={`mailto:${COMPANY.email}`} className={`transition-colors ${scrolled || !isHome ? 'text-[#666] hover:text-[#FD7E14]' : 'text-white/80 hover:text-white'}`}>
              {COMPANY.email}
            </a>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className={`flex items-center gap-1 ${scrolled || !isHome ? 'text-[#666]' : 'text-white/70'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              ICEF Certified · AIRC Member
            </span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#D32F2F] flex items-center justify-center shadow-[0_4px_12px_rgba(253,126,20,0.35)]">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className={`text-base font-bold transition-colors ${scrolled || !isHome ? 'text-[#333]' : 'text-white'}`}>
                The Global Avenues
              </span>
              <span className={`text-[10px] font-medium transition-colors ${scrolled || !isHome ? 'text-[#FD7E14]' : 'text-[#FFC107]'}`}>
                Asia's Trusted Education Partner
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const hasDropdown = link.label in DROPDOWN_ITEMS;
              const isActive = location.pathname.startsWith(link.href) && link.href !== '/';
              return (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => hasDropdown && setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  {hasDropdown ? (
                    <button
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'text-[#FD7E14] bg-[#FD7E14]/10'
                          : scrolled || !isHome
                          ? 'text-[#333] hover:text-[#FD7E14] hover:bg-[#FD7E14]/8'
                          : 'text-white/90 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {link.label}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === link.label ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <Link
                      to={link.href}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'text-[#FD7E14] bg-[#FD7E14]/10'
                          : scrolled || !isHome
                          ? 'text-[#333] hover:text-[#FD7E14] hover:bg-[#FD7E14]/8'
                          : 'text-white/90 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}

                  {/* Dropdown */}
                  <AnimatePresence>
                    {hasDropdown && activeDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-[#FD7E14]/10 overflow-hidden"
                      >
                        <div className="p-2">
                          {DROPDOWN_ITEMS[link.label].map((item) => (
                            <Link
                              key={item.href}
                              to={item.href}
                              className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[#FFFCF5] group transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-[#333] group-hover:text-[#FD7E14] transition-colors">
                                  {item.label}
                                </div>
                                <div className="text-xs text-[#999] mt-0.5">{item.desc}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/portal/login"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                scrolled || !isHome
                  ? 'border-[#FD7E14]/30 text-[#FD7E14] hover:bg-[#FD7E14]/8'
                  : 'border-white/30 text-white hover:bg-white/10'
              }`}
            >
              <User className="w-4 h-4" />
              Login
            </Link>
            <Link
              to="/apply"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white shadow-[0_4px_16px_rgba(253,126,20,0.35)] hover:shadow-[0_6px_24px_rgba(253,126,20,0.5)] hover:scale-105 transition-all"
            >
              Start Application
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-xl transition-colors ${scrolled || !isHome ? 'text-[#333] hover:bg-[#FD7E14]/10' : 'text-white hover:bg-white/10'}`}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-[#FD7E14]/10 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-[#333] hover:text-[#FD7E14] hover:bg-[#FFFCF5] font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-[#FD7E14]/10 flex flex-col gap-2">
                <Link to="/portal/login" className="w-full text-center px-4 py-3 rounded-xl border border-[#FD7E14]/30 text-[#FD7E14] font-semibold">
                  Login
                </Link>
                <Link to="/apply" className="w-full text-center px-4 py-3 rounded-xl bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white font-bold">
                  Start Application
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
