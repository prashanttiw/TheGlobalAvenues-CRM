import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Lock, ArrowRight, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UNIVERSITIES } from '@/data/universities';

const COUNTRIES = [...new Set(UNIVERSITIES.map((u) => u.country))].sort();
const TYPES = [...new Set(UNIVERSITIES.map((u) => u.type))].sort();

export function UniversitiesPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return UNIVERSITIES.filter((u) => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.country.toLowerCase().includes(search.toLowerCase());
      const matchCountry = !selectedCountry || u.country === selectedCountry;
      const matchType = !selectedType || u.type === selectedType;
      const matchTier = !selectedTier || u.tier === selectedTier;
      return matchSearch && matchCountry && matchType && matchTier;
    });
  }, [search, selectedCountry, selectedType, selectedTier]);

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className="py-14 bg-gradient-to-br from-[#1A0A00] to-[#2D1200]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-bold text-white mb-4">Find Your University</h1>
            <p className="text-white/70 text-lg mb-8">100+ partner universities across 40+ countries</p>
            <div className="flex items-center gap-3 p-2 bg-white/95 rounded-2xl shadow-[0_8px_40px_rgba(253,126,20,0.3)] max-w-2xl mx-auto">
              <Search className="w-5 h-5 text-[#999] ml-3" />
              <input
                type="text"
                placeholder="Search by university name, country, or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[#333] text-sm placeholder:text-[#999]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-1 hover:bg-[#FD7E14]/10 rounded-lg">
                  <X className="w-4 h-4 text-[#999]" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#FD7E14]/30 text-[#FD7E14] font-semibold text-sm hover:bg-[#FD7E14]/8 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          {/* Quick tier filters */}
          {['', 'exclusive', 'preferred', 'open'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedTier === tier ? 'bg-[#FD7E14] text-white' : 'bg-white border border-[#FD7E14]/20 text-[#666] hover:border-[#FD7E14]/50'}`}
            >
              {tier === '' ? 'All Partners' : tier === 'exclusive' ? '🔒 Exclusive' : tier === 'preferred' ? '⭐ Preferred' : 'Open Network'}
            </button>
          ))}

          <span className="ml-auto text-sm text-[#999]">{filtered.length} universities</span>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-white rounded-2xl p-6 border border-[#FD7E14]/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2 block">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14]/50"
                  >
                    <option value="">All Countries</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2 block">Institution Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14]/50"
                  >
                    <option value="">All Types</option>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => { setSelectedCountry(''); setSelectedType(''); setSelectedTier(''); setSearch(''); }}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#FD7E14]/30 text-[#FD7E14] font-semibold text-sm hover:bg-[#FD7E14]/8 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((uni, i) => (
            <motion.div
              key={uni.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              whileHover={{ y: -6 }}
              className="group"
            >
              <div className="bg-white rounded-2xl overflow-hidden border border-[#FD7E14]/10 hover:border-[#FD7E14]/30 shadow-[0_2px_12px_rgba(253,126,20,0.06)] hover:shadow-[0_16px_40px_rgba(253,126,20,0.14)] transition-all duration-300">
                {/* Hero */}
                <div className="relative h-40 overflow-hidden">
                  <img src={uni.heroImage} alt={uni.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {uni.tier === 'exclusive' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-[#FD7E14] rounded-lg">
                      <Lock className="w-3 h-3 text-white" />
                      <span className="text-xs font-bold text-white">Exclusive</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 text-sm font-semibold text-white">{uni.country}</div>
                </div>

                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FFFCF5] border border-[#FD7E14]/10 flex items-center justify-center flex-shrink-0 p-1">
                      <img src={uni.logo} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#222] leading-tight group-hover:text-[#FD7E14] transition-colors">{uni.name}</h3>
                      <p className="text-xs text-[#999] mt-0.5">{uni.city}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#666] mb-3 line-clamp-2">{uni.description}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {uni.programs.slice(0, 3).map((p) => (
                      <span key={p} className="text-xs px-2 py-0.5 bg-[#FD7E14]/8 rounded-md text-[#FD7E14] border border-[#FD7E14]/15">{p}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#999] mb-4">
                    <span>Intake: {uni.intakes[0]}</span>
                    {uni.tuitionRange && <span className="font-semibold text-[#333]">{uni.tuitionRange}</span>}
                  </div>

                  <Link
                    to={`/universities/${uni.slug}`}
                    className="flex items-center justify-between w-full px-4 py-2.5 bg-[#FD7E14]/10 hover:bg-[#FD7E14] rounded-xl text-[#FD7E14] hover:text-white font-semibold text-sm transition-all"
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-[#333] mb-2">No universities found</h3>
            <p className="text-[#666]">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>
    </div>
  );
}
