import { Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const scholarshipWins = [
  { name: 'Priya Sharma', amount: '$25,000', university: 'Harvard University', country: 'USA' },
  { name: 'Rahul Gupta', amount: '$18,000', university: 'Oxford University', country: 'UK' },
  { name: 'Ananya Singh', amount: '$30,000', university: 'University of Toronto', country: 'Canada' },
  { name: 'Arjun Patel', amount: '$22,000', university: 'TU Munich', country: 'Germany' },
  { name: 'Neha Verma', amount: '$20,000', university: 'Stanford University', country: 'USA' },
  { name: 'Vikram Mehta', amount: '$15,000', university: 'Cambridge University', country: 'UK' },
  { name: 'Kavya Reddy', amount: '$28,000', university: 'McGill University', country: 'Canada' },
  { name: 'Aditya Kumar', amount: '$19,000', university: 'MIT', country: 'USA' },
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
          <span className="text-sm font-semibold text-[#333333]">Live Scholarship Wins</span>
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
                <span className="text-[#666666]">won</span>
                <span className="text-[#D32F2F] font-bold">{win.amount}</span>
                <span className="text-[#666666]">at</span>
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