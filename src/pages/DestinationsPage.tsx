import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { DESTINATIONS, REGIONS } from '@/data/destinations';

export function DestinationsPage() {
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = DESTINATIONS.filter((d) => {
    const matchesRegion = activeRegion === 'all' || d.region === activeRegion;
    const matchesSearch = d.country.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-[#1A0A00] to-[#2D1200] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, #FD7E14 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/20 border border-[#FD7E14]/30 mb-6">
              <MapPin className="w-4 h-4 text-[#FD7E14]" />
              <span className="text-sm text-[#FD7E14] font-semibold">40+ Countries · 100+ Universities</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Where Will Your Journey Take You?
            </h1>
            <p className="text-xl text-white/70">
              Explore study destinations across the globe — from tuition-free Germany to PR-friendly Canada.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-xl border-b border-[#FD7E14]/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
            <input
              type="text"
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14]/50"
            />
          </div>

          {/* Region filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveRegion('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeRegion === 'all' ? 'bg-[#FD7E14] text-white shadow-[0_4px_16px_rgba(253,126,20,0.35)]' : 'bg-[#FFFCF5] text-[#666] border border-[#FD7E14]/20 hover:border-[#FD7E14]/50'}`}
            >
              All Regions
            </button>
            {REGIONS.map((region) => (
              <button
                key={region.id}
                onClick={() => setActiveRegion(region.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeRegion === region.id ? 'bg-[#FD7E14] text-white shadow-[0_4px_16px_rgba(253,126,20,0.35)]' : 'bg-[#FFFCF5] text-[#666] border border-[#FD7E14]/20 hover:border-[#FD7E14]/50'}`}
              >
                {region.emoji} {region.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-sm text-[#999] mb-6">{filtered.length} destinations found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((dest, i) => (
              <motion.div
                key={dest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                className="group"
              >
                <Link to={`/destinations/${dest.slug}`}>
                  <div className="relative h-72 rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-all duration-300">
                    <img src={dest.heroImage} alt={dest.country} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${dest.color} opacity-40 group-hover:opacity-60 transition-opacity`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    <div className="absolute top-4 left-4 text-3xl">{dest.flag}</div>
                    <div className="absolute top-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-white text-xs font-semibold">
                      {dest.universitiesCount} unis
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-xl font-bold text-white mb-1">{dest.country}</h3>
                      <div className="flex items-center gap-2 text-xs text-white/80 mb-2">
                        <span>{dest.avgTuitionINR}</span>
                        <span>·</span>
                        <span>IELTS {dest.ieltsMin}+</span>
                      </div>
                      <div className="flex items-center gap-1 text-white font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
