import { useState, useEffect } from 'react';
import { Globe, User } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-[0_4px_20px_rgba(253,126,20,0.1)] border-b border-[#FD7E14]/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#D32F2F] flex items-center justify-center shadow-[0_4px_12px_rgba(253,126,20,0.3)]">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[#333333]">Global Avenue</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#destinations"
              className="text-[#333333] hover:text-[#FD7E14] transition-colors font-medium"
            >
              Destinations
            </a>
            <a
              href="#ai-matcher"
              className="text-[#333333] hover:text-[#FD7E14] transition-colors font-medium"
            >
              AI University Matcher
            </a>
            <a
              href="#about"
              className="text-[#333333] hover:text-[#FD7E14] transition-colors font-medium"
            >
              About Us
            </a>
          </nav>

          {/* Login Button */}
          <Button
            variant="outline"
            className="border-[#FD7E14] text-[#FD7E14] hover:bg-[#FD7E14] hover:text-white transition-all rounded-xl shadow-[0_2px_8px_rgba(253,126,20,0.2)] hover:shadow-[0_4px_16px_rgba(253,126,20,0.4)]"
          >
            <User className="w-4 h-4 mr-2" />
            Login
          </Button>
        </div>
      </div>
    </header>
  );
}