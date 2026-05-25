import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Zap, Star, FileCheck, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { EXCLUSIVE_UNIVERSITIES } from '@/data/universities';

const BENEFITS = [
  { icon: Zap, label: 'Faster Offers', desc: 'Priority processing' },
  { icon: Star, label: 'Exclusive Scholarships', desc: 'Special discounts' },
  { icon: FileCheck, label: 'Simplified Docs', desc: 'Streamlined process' },
  { icon: Clock, label: 'Avg 14 Days', desc: 'Offer turnaround' },
];

export function ExclusivePartnersSection() {
  const featured = EXCLUSIVE_UNIVERSITIES.slice(0, 6);

  return (
    <section className="py-24 bg-[#1A1A1A] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#FD7E14]/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#D32F2F]/5 blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#FD7E14 1px, transparent 1px), linear-gradient(90deg, #FD7E14 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFC107]/15 border border-[#FFC107]/30 mb-4">
            <Lock className="w-4 h-4 text-[#FFC107]" />
            <span className="text-sm text-[#FFC107] font-semibold">Exclusive University Partners</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Our Exclusive University Partners
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Universities with signed MOUs with The Global Avenues. Students get faster processing, dedicated admissions contacts, and special scholarships.
          </p>
        </motion.div>

        {/* Benefits strip */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.label} className="flex items-center gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FD7E14]/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#FD7E14]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{b.label}</div>
                  <div className="text-xs text-white/50">{b.desc}</div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Partner cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {featured.map((uni, i) => (
            <motion.div
              key={uni.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="group"
            >
              <div className="bg-white/5 rounded-2xl border border-white/10 hover:border-[#FD7E14]/40 overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(253,126,20,0.15)]">
                {/* Hero image */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={uni.heroImage}
                    alt={uni.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent" />
                  {/* Exclusive badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#FD7E14] rounded-lg">
                    <Lock className="w-3 h-3 text-white" />
                    <span className="text-xs font-bold text-white">Exclusive</span>
                  </div>
                </div>

                <div className="p-5">
                  {/* Logo + name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 p-1.5 shadow-md">
                      <img
                        src={uni.logo}
                        alt={uni.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight group-hover:text-[#FD7E14] transition-colors">
                        {uni.name}
                      </h3>
                      <p className="text-xs text-white/50 mt-0.5">{uni.city}, {uni.country}</p>
                    </div>
                  </div>

                  {/* Programs */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {uni.programs.slice(0, 3).map((prog) => (
                      <span key={prog} className="text-xs px-2 py-0.5 bg-white/8 rounded-md text-white/60 border border-white/10">
                        {prog}
                      </span>
                    ))}
                  </div>

                  {/* Intakes + fee */}
                  <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                    <span>Intake: {uni.intakes[0]}</span>
                    {uni.tuitionRange && <span>{uni.tuitionRange}</span>}
                  </div>

                  {/* CTA */}
                  <Link
                    to={`/universities/${uni.slug}`}
                    className="flex items-center justify-between w-full px-4 py-2.5 bg-[#FD7E14]/15 hover:bg-[#FD7E14] rounded-xl text-[#FD7E14] hover:text-white font-semibold text-sm transition-all group/btn"
                  >
                    View University
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/partners"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-2xl font-bold shadow-[0_8px_32px_rgba(253,126,20,0.35)] hover:shadow-[0_12px_40px_rgba(253,126,20,0.5)] hover:scale-105 transition-all"
          >
            View All Partners <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
