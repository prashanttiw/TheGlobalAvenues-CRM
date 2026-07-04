import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { COMPANY } from '@/data/company';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  description: string;
  color: string;
}

const STATS: StatItem[] = [
  { value: COMPANY.stats.yearsExperience, suffix: '+', label: 'Years of Experience', description: 'Trusted since day one', color: '#FD7E14' },
  { value: COMPANY.stats.partnerUniversities, suffix: '+', label: 'Partner Universities', description: `Across ${COMPANY.stats.countries}+ countries`, color: '#D32F2F' },
  { value: COMPANY.stats.channelPartners, suffix: '+', label: 'Channel Partners', description: 'Active in SAMEA region', color: '#FFC107' },
  { value: COMPANY.stats.studentsRecruited, suffix: '+', label: 'Students Recruited', description: 'And counting', color: '#4CAF50' },
];

function AnimatedCounter({ value, suffix, color }: { value: number; suffix: string; color: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-5xl md:text-6xl font-black" style={{ color }}>
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#FD7E14] via-[#C94D1B] to-[#D32F2F] relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Numbers That Speak for Themselves
          </h2>
          <p className="text-white/70 text-lg">
            ICEF Certified · AIRC Member · Trusted across South Asia
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
            >
              <AnimatedCounter value={stat.value} suffix={stat.suffix} color="white" />
              <div className="text-white font-bold mt-2 text-lg">{stat.label}</div>
              <div className="text-white/60 text-sm mt-1">{stat.description}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
