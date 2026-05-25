import { motion } from 'motion/react';
import { UNIVERSITIES } from '@/data/universities';

// Use real partner logos from the website
const PARTNER_LOGOS = UNIVERSITIES.map((u) => ({
  name: u.name,
  logo: u.logo,
  country: u.country,
  isExclusive: u.tier === 'exclusive',
}));

// Duplicate for seamless loop
const ITEMS = [...PARTNER_LOGOS, ...PARTNER_LOGOS];

export function PartnerTicker() {
  return (
    <section className="py-10 bg-white border-y border-[#FD7E14]/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <p className="text-center text-sm font-semibold text-[#999] uppercase tracking-widest">
          Trusted by Leading Universities Worldwide
        </p>
      </div>

      <div className="relative overflow-hidden">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex gap-8 items-center"
          animate={{ x: [0, `-${PARTNER_LOGOS.length * 200}px`] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          style={{ width: `${ITEMS.length * 200}px` }}
        >
          {ITEMS.map((partner, i) => (
            <div
              key={`${partner.name}-${i}`}
              className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
              style={{ width: '160px' }}
            >
              <div className="relative w-28 h-16 flex items-center justify-center bg-[#FFFCF5] rounded-xl border border-[#FD7E14]/10 px-3 py-2 group-hover:border-[#FD7E14]/40 group-hover:shadow-[0_4px_16px_rgba(253,126,20,0.12)] transition-all">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                  onError={(e) => {
                    // Fallback to text if logo fails
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-xs font-bold text-[#FD7E14] text-center leading-tight">${partner.name.split(' ').slice(0, 2).join(' ')}</span>`;
                    }
                  }}
                />
                {partner.isExclusive && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#FD7E14] rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-md">
                    ✦
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#999] text-center leading-tight max-w-[120px] truncate">
                {partner.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
