import { Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const scholarshipWins = [
  { name: 'FH Kufstein Tirol', amount: 'AI, Data Science, Sustainability', university: 'Applied sciences pathways', country: 'Austria' },
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
    <div className="relative py-6 bg-gradient-to-r from-[#FFC107] to-[#FFA000] overflow-hidden shadow-[0_4px_20px_rgba(255,193,7,0.3)]">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyMCAwIEwgMjAgMjAgTCAwIDIwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
      
      <div className="relative flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 px-4">
          <TrendingUp className="w-5 h-5 text-[#333333]" />
          <span className="text-sm font-semibold text-[#333333]">Featured Partner Pathways</span>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <motion.div
          className="flex gap-6"
          animate={{
            x: [0, -50 * scholarshipWins.length],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 30,
              ease: 'linear',
            },
          }}
        >
          {items.map((win, index) => (
            <div
              key={index}
              className="flex-shrink-0 flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-xl px-6 py-3 border border-[#FD7E14]/20 shadow-[0_2px_8px_rgba(253,126,20,0.2)]"
            >
              <Award className="w-5 h-5 text-[#FD7E14]" />
              <div className="flex items-center gap-2">
                <span className="text-[#333333] font-semibold">{win.name}</span>
                <span className="text-[#666666]">offers</span>
                <span className="text-[#D32F2F] font-bold">{win.amount}</span>
                <span className="text-[#666666]">through</span>
                <span className="text-[#333333] font-medium">{win.university}</span>
                <span className="text-[#999999]">({win.country})</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
