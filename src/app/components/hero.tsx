import { Search, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with warm gradient overlay */}
      <div className="absolute inset-0">
        <img
          src="/universities/fh-kufstein-tirol-hero.webp"
          alt="Happy student in foreign city"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#FD7E14]/30 via-[#FFC107]/25 to-[#D32F2F]/20" />
        <div className="absolute inset-0 bg-[#333333]/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-[#FD7E14]/30 mb-8 shadow-[0_4px_20px_rgba(253,126,20,0.2)]">
          <Sparkles className="w-4 h-4 text-[#FD7E14]" />
          <span className="text-sm text-[#333333] font-semibold">Trusted by 10,000+ Students Worldwide</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          Your Global Future,
          <br />
          <span className="bg-gradient-to-r from-[#FFC107] to-[#FD7E14] bg-clip-text text-transparent drop-shadow-none">
            Decoded.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-white mb-12 max-w-3xl mx-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
          Navigate your study abroad journey with AI-powered guidance, personalized university
          matching, and end-to-end visa support.
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <div className="flex items-center gap-3 p-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(253,126,20,0.3)] border border-[#FD7E14]/20">
              <Search className="w-5 h-5 text-[#333333]/60 ml-3" />
              <input
                type="text"
                placeholder="Search universities, courses, or countries..."
                className="flex-1 bg-transparent outline-none text-[#333333] placeholder:text-[#333333]/50"
              />
              <Button className="bg-gradient-to-r from-[#D32F2F] to-[#C2185B] hover:from-[#C2185B] hover:to-[#D32F2F] text-white rounded-xl px-8 shadow-[0_4px_16px_rgba(211,47,47,0.4)] hover:shadow-[0_6px_24px_rgba(211,47,47,0.5)] transition-all">
                <Sparkles className="w-4 h-4 mr-2" />
                Find My University
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 border border-[#FD7E14]/20 shadow-[0_4px_16px_rgba(253,126,20,0.15)]">
              <div className="text-3xl font-bold text-[#FD7E14] mb-1">100+</div>
              <div className="text-sm text-[#333333]/80">Partner Universities</div>
            </div>
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 border border-[#FD7E14]/20 shadow-[0_4px_16px_rgba(253,126,20,0.15)]">
              <div className="text-3xl font-bold text-[#FD7E14] mb-1">98%</div>
              <div className="text-sm text-[#333333]/80">Visa Success Rate</div>
            </div>
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 border border-[#FD7E14]/20 shadow-[0_4px_16px_rgba(253,126,20,0.15)]">
              <div className="text-3xl font-bold text-[#FD7E14] mb-1">45+</div>
              <div className="text-sm text-[#333333]/80">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FFFCF5] to-transparent" />
    </section>
  );
}
