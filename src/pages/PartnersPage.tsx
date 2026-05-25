import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Zap, Star, FileCheck, Clock, Search, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { UNIVERSITIES, EXCLUSIVE_UNIVERSITIES } from '@/data/universities';

const BENEFITS = [
  { icon: Zap, label: 'Faster Offers', desc: 'Priority processing pipeline' },
  { icon: Star, label: 'Exclusive Scholarships', desc: 'Special discounts for our students' },
  { icon: FileCheck, label: 'Simplified Docs', desc: 'Streamlined application process' },
  { icon: Clock, label: 'Avg 14 Days', desc: 'Offer letter turnaround' },
];

export function PartnersPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'exclusive' | 'all'>('exclusive');

  const filtered = UNIVERSITIES.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.country.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' || u.tier === 'exclusive';
    return matchSearch && matchTab;
  });

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(#FD7E14 1px, transparent 1px), linear-gradient(90deg, #FD7E14 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFC107]/15 border border-[#FFC107]/30 mb-6">
              <Lock className="w-4 h-4 text-[#FFC107]" />
              <span className="text-sm text-[#FFC107] font-semibold">100+ University Partners · 40+ Countries</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Our University Partners
            </h1>
            <p className="text-xl text-white/70 mb-8">
              From exclusive MOU partnerships to a broad global network — find your perfect institution.
            </p>
            <div className="flex items-center gap-3 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 max-w-lg mx-auto">
              <Search className="w-5 h-5 text-white/50 ml-3" />
              <input
                type="text"
                placeholder="Search by university or country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 text-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="bg-[#1A1A1A] border-b border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FD7E14]/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#FD7E14]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{b.label}</div>
                    <div className="text-xs text-white/40">{b.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex items-center gap-3 mb-10">
          {(['exclusive', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab ? 'bg-[#FD7E14] text-white shadow-[0_4px_16px_rgba(253,126,20,0.35)]' : 'bg-white border border-[#FD7E14]/20 text-[#666] hover:border-[#FD7E14]/50'}`}
            >
              {tab === 'exclusive' ? '🔒 Exclusive Partners' : '🌐 All Partners'}
              <span className="ml-2 text-xs opacity-70">
                ({tab === 'exclusive' ? EXCLUSIVE_UNIVERSITIES.length : UNIVERSITIES.length})
              </span>
            </button>
          ))}
          <span className="ml-auto text-sm text-[#999]">{filtered.length} results</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((uni, i) => (
            <motion.div
              key={uni.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -6 }}
              className="group"
            >
              <div className="bg-white rounded-2xl overflow-hidden border border-[#FD7E14]/10 hover:border-[#FD7E14]/30 shadow-[0_2px_12px_rgba(253,126,20,0.06)] hover:shadow-[0_20px_50px_rgba(253,126,20,0.14)] transition-all duration-300">
                <div className="relative h-44 overflow-hidden">
                  <img src={uni.heroImage} alt={uni.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {uni.tier === 'exclusive' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-[#FD7E14] rounded-lg shadow-md">
                      <Lock className="w-3 h-3 text-white" />
                      <span className="text-xs font-bold text-white">Exclusive Partner</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#FFFCF5] border border-[#FD7E14]/10 flex items-center justify-center flex-shrink-0 p-1.5">
                      <img src={uni.logo} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#222] leading-tight group-hover:text-[#FD7E14] transition-colors">{uni.name}</h3>
                      <p className="text-sm text-[#999] mt-0.5">{uni.city}, {uni.country}</p>
                    </div>
                  </div>

                  <p className="text-sm text-[#666] mb-4 line-clamp-2">{uni.description}</p>

                  <div className="flex items-center gap-2 text-xs text-[#999] mb-4">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{uni.type}</span>
                    <span>·</span>
                    <span>Intake: {uni.intakes[0]}</span>
                  </div>

                  {uni.email && (
                    <a href={`mailto:${uni.email}`} className="text-xs text-[#FD7E14] hover:underline block mb-4">
                      {uni.email}
                    </a>
                  )}

                  <div className="flex gap-2">
                    <Link
                      to={`/universities/${uni.slug}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FD7E14]/10 hover:bg-[#FD7E14] rounded-xl text-[#FD7E14] hover:text-white font-semibold text-sm transition-all"
                    >
                      View Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/apply"
                      className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] rounded-xl text-white font-semibold text-sm shadow-[0_4px_12px_rgba(253,126,20,0.3)] hover:shadow-[0_6px_20px_rgba(253,126,20,0.5)] transition-all"
                    >
                      Apply
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Become a partner CTA */}
        <div className="mt-16 bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] rounded-3xl p-10 text-center">
          <h3 className="text-3xl font-bold text-white mb-3">List Your Institution on Global Avenues</h3>
          <p className="text-white/60 mb-6 max-w-xl mx-auto">
            Access South Asia's top students, dedicated support, and MOU partnership options.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-2xl font-bold shadow-[0_8px_32px_rgba(253,126,20,0.35)] hover:scale-105 transition-all"
          >
            Request Partnership <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
