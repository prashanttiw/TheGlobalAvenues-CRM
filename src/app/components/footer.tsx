import { Globe, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#C94D1B] to-[#A64417] text-white pt-16 pb-8 shadow-[0_-4px_20px_rgba(201,77,27,0.3)]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Column 1 - Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FD7E14] to-white/20 flex items-center justify-center shadow-[0_4px_12px_rgba(253,126,20,0.4)]">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Global Avenue</span>
            </div>
            <p className="text-white/80 mb-6 leading-relaxed">
              Your trusted partner in making global education accessible, affordable, and achievable.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/20 hover:border-white/40"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/20 hover:border-white/40"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/20 hover:border-white/40"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/20 hover:border-white/40"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2 - Destinations */}
          <div>
            <h4 className="font-bold text-lg mb-6">Study Destinations</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  United States
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  United Kingdom
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  Canada
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  Germany
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  Australia
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  View All Countries
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 - Services */}
          <div>
            <h4 className="font-bold text-lg mb-6">Our Services</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  AI University Matcher
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  Application Support
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  Visa Assistance
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  Scholarship Guidance
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  Test Preparation
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
                  Post-Landing Services
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 - Contact */}
          <div>
            <h4 className="font-bold text-lg mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li>
                <a href="mailto:hello@globalavenue.com" className="text-white/80 hover:text-white transition-colors flex items-start gap-3">
                  <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>hello@globalavenue.com</span>
                </a>
              </li>
              <li>
                <a href="tel:+1234567890" className="text-white/80 hover:text-white transition-colors flex items-start gap-3">
                  <Phone className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>+1 (234) 567-890</span>
                </a>
              </li>
              <li>
                <div className="text-white/80 flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>123 Education Street,<br />New York, NY 10001</span>
                </div>
              </li>
            </ul>

            {/* Certification Badges */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-xs text-white/60 mb-3">Certified by:</p>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs border border-white/20">
                  ICEF Certified
                </div>
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs border border-white/20">
                  AIRC Member
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/70">
              © 2026 Global Avenue. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}