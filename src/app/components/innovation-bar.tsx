import { Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const scholarshipWins = [
  { name: 'FH Kufstein Tirol', amount: 'Data Science, Sustainability', university: 'Applied sciences pathways', country: 'Austria' },
  { name: 'EUAS', amount: 'Business, IT, Design', university: 'Tallinn innovation campus', country: 'Estonia' },
  { name: 'ICN Business School', amount: 'Business and management', university: 'Multi-campus options', country: 'France/Germany' },
  { name: 'MJM Graphic Design', amount: 'Design and creative arts', university: 'Paris and London programs', country: 'France' },
  { name: 'Mesoyios College', amount: 'Hospitality and business', university: 'Practical career pathways', country: 'Cyprus' },
  { name: 'International American University', amount: 'Business and graduate routes', university: 'Global campus network', country: 'USA/Malta/UAE' },
  { name: "St. George's University", amount: 'Medicine and veterinary', university: 'Clinical training pathways', country: 'Grenada' },
  { name: 'EIT InnoEnergy', amount: 'Sustainable energy masters', university: 'European innovation ecosystem', country: 'Europe' },
];

export function InnovationBar() {
  // Duplicate the array for seamless loop
  const items = [...scholarshipWins, ...scholarshipWins];

  return (
    <div className="relative z-30 -mt-10 mx-4 md:mx-auto max-w-6xl bg-white/95 backdrop-blur-xl border border-[#FD7E14]/15 rounded-3xl shadow-[0_24px_50px_rgba(253,126,20,0.12),0_0_0_1px_rgba(253,126,20,0.05)] overflow-hidden">
      {/* Subtle brand glow light source in the background of the pill */}
      <div className="absolute -top-10 left-1/4 w-72 h-72 rounded-full bg-[#FFC107]/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 right-1/4 w-72 h-72 rounded-full bg-[#FD7E14]/10 blur-2xl pointer-events-none" />

      {/* Grid overlay for aesthetic structure */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyMCAwIEwgMjAgMjAgTCAwIDIwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-25" />

      {/* Outer wrapper with padding */}
      <div className="py-5 px-6 relative z-10">
        <div className="flex items-center gap-2 mb-3.5 px-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 text-[#FD7E14]" />
          </div>
          <span className="text-xs font-bold text-[#FD7E14] uppercase tracking-wider">Featured Partner Pathways</span>
          
          <div className="flex-1 h-[1px] bg-gradient-to-r from-[#FD7E14]/20 to-transparent ml-4" />
        </div>

        <div className="relative overflow-hidden py-1">
          {/* Left/Right fades inside the pill for seamless text appearance */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <motion.div
            className="flex gap-6"
            animate={{
              x: ['0%', '-50%'],
            }}
            style={{ width: 'max-content' }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 35,
                ease: 'linear',
              },
            }}
          >
            {items.map((win, index) => (
              <div
                key={index}
                className="flex-shrink-0 flex items-center gap-3 bg-[#FFFCF5]/90 hover:bg-white hover:border-[#FD7E14]/30 hover:shadow-md rounded-2xl px-5 py-3 border border-[#FD7E14]/10 transition-all duration-300 cursor-default"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FD7E14]/10 to-[#FFC107]/10 flex items-center justify-center border border-[#FD7E14]/20 shadow-sm">
                  <Award className="w-4 h-4 text-[#FD7E14]" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#1A1A1A] font-bold tracking-tight">{win.name}</span>
                  <span className="text-[#666] text-xs">offers</span>
                  <span className="text-[#C94D1B] font-extrabold bg-[#C94D1B]/5 border border-[#C94D1B]/10 px-2 py-0.5 rounded-lg text-xs tracking-tight">{win.amount}</span>
                  <span className="text-[#666] text-xs">through</span>
                  <span className="text-[#333] font-semibold text-xs">{win.university}</span>
                  <span className="text-[#999] text-xs font-medium">({win.country})</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
