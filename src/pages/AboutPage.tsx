import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { COMPANY } from '@/data/company';
import { StatsSection } from '@/components/home/StatsSection';

const VALUES = [
  { emoji: '🤝', title: 'Partner First', desc: 'We build long-term relationships with universities and students alike — not just transactions.' },
  { emoji: '🔍', title: 'Transparency', desc: 'Clear processes, honest advice, and measurable outcomes. No hidden fees, no false promises.' },
  { emoji: '🚀', title: 'Innovation', desc: 'We use technology and data to stay ahead — from AI matching to digital application tracking.' },
  { emoji: '🌍', title: 'Global Reach', desc: 'Deep local knowledge combined with a truly global network across 40+ countries.' },
  { emoji: '✅', title: 'Accountability', desc: 'ICEF certified and AIRC member. We hold ourselves to the highest industry standards.' },
];

const SERVICES_LIST = [
  'Localized market entry strategy and brand positioning',
  'Recruitment pipeline management with transparent reporting',
  'Application conversion journeys backed by experienced advisors',
  'Long-term partnership support with measurable outcomes',
  'Visa and immigration expert assistance',
  'Career guidance and counselling for students',
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-[#1A0A00] to-[#2D1200] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, #FD7E14 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/20 border border-[#FD7E14]/30 mb-6">
              <span className="text-sm text-[#FD7E14] font-semibold">ICEF Certified · AIRC Member · 12+ Years</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Empowering Global Education With Trusted Partnerships
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              {COMPANY.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <StatsSection />

      {/* Our Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-6">
                <span className="text-sm text-[#FD7E14] font-semibold">Our Story</span>
              </div>
              <h2 className="text-4xl font-bold text-[#222] mb-6">
                Building Pathways That Connect Ambition With Opportunity
              </h2>
              <p className="text-[#666] leading-relaxed mb-6">
                The Global Avenues acts as a strategic bridge between universities and the Indian market ecosystem, bringing tailored market intelligence, recruitment expertise, and cultural insight to every partnership.
              </p>
              <p className="text-[#666] leading-relaxed mb-8">
                With deep relationships across institutions, counselors, and industry networks, our team crafts outcomes that are measurable, sustainable, and rooted in trust.
              </p>
              <div className="space-y-3">
                {SERVICES_LIST.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#FD7E14] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#555]">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
                  alt="Team meeting"
                  className="w-full rounded-3xl shadow-[0_20px_60px_rgba(253,126,20,0.2)]"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-5 shadow-[0_8px_32px_rgba(253,126,20,0.15)] border border-[#FD7E14]/10">
                  <div className="text-3xl font-black text-[#FD7E14]">12+</div>
                  <div className="text-sm font-semibold text-[#333]">Years of Experience</div>
                  <div className="text-xs text-[#999]">Trusted since day one</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-[#FFFCF5]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-bold text-[#222] mb-4">Our Values</h2>
            <p className="text-lg text-[#666]">The principles that guide everything we do</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-2xl p-6 border border-[#FD7E14]/10 hover:border-[#FD7E14]/30 shadow-[0_2px_12px_rgba(253,126,20,0.06)] hover:shadow-[0_16px_40px_rgba(253,126,20,0.14)] transition-all text-center"
              >
                <div className="text-4xl mb-4">{v.emoji}</div>
                <h3 className="font-bold text-[#222] mb-2">{v.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Partner With Us?</h2>
          <p className="text-white/80 text-lg mb-8">Whether you're a student, agent, or university — we'd love to connect.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact" className="flex items-center gap-2 px-8 py-4 bg-white text-[#FD7E14] rounded-2xl font-bold hover:scale-105 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
              Contact Us <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/partners" className="flex items-center gap-2 px-8 py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/30 hover:bg-white/20 transition-all">
              View Partners
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
