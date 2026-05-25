import { Link } from 'react-router-dom';
import { UserCircle, Brain, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

const STEPS = [
  {
    number: '01',
    icon: UserCircle,
    title: 'Build Your Profile',
    description: 'Tell us your academic background, test scores, and dream destinations. Takes 5 minutes.',
    color: 'from-[#FD7E14] to-[#FF8C42]',
    glow: 'rgba(253,126,20,0.35)',
    delay: 0,
  },
  {
    number: '02',
    icon: Brain,
    title: 'Get Matched by AI',
    description: 'Our AI analyzes 50+ data points and suggests the best-fit universities, courses, and intakes for you.',
    color: 'from-[#D32F2F] to-[#FF5722]',
    glow: 'rgba(211,47,47,0.35)',
    delay: 0.15,
  },
  {
    number: '03',
    icon: GraduationCap,
    title: 'Apply & Get Enrolled',
    description: 'Apply to multiple universities in one click. We handle documents, visa, and follow-ups.',
    color: 'from-[#C94D1B] to-[#FD7E14]',
    glow: 'rgba(201,77,27,0.35)',
    delay: 0.3,
  },
];

export function HowItWorks() {
  return (
    <section className="py-28 bg-[#FFFCF5] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#FD7E14]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#D32F2F]/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-5">
            <Sparkles className="w-4 h-4 text-[#FD7E14]" />
            <span className="text-sm text-[#FD7E14] font-semibold">Simple 3-Step Process</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1C1C1E] mb-4">
            How Global Avenues Works
          </h2>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            From your first search to your university offer letter — we're with you every step.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting dashed line */}
          <div className="hidden md:block absolute top-[4.5rem] left-[calc(16.67%+3rem)] right-[calc(16.67%+3rem)] h-px">
            <div className="w-full h-full border-t-2 border-dashed border-[#FD7E14]/25" />
            <motion.div
              className="absolute inset-0 border-t-2 border-[#FD7E14]/60"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.5 }}
              style={{ transformOrigin: 'left' }}
            />
          </div>

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: step.delay }}
                className="relative group"
              >
                {/* 3D card effect */}
                <motion.div
                  whileHover={{ y: -12, rotateX: 4, rotateY: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="bg-white rounded-3xl p-8 h-full relative overflow-hidden"
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px',
                    boxShadow: `0 4px 24px rgba(253,126,20,0.08), 0 0 0 1px rgba(253,126,20,0.08)`,
                  }}
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 60px ${step.glow}` }}
                  />

                  {/* Large background number */}
                  <div className="absolute -top-2 -right-2 text-[120px] font-black leading-none select-none pointer-events-none"
                    style={{ color: 'rgba(253,126,20,0.05)' }}>
                    {step.number}
                  </div>

                  {/* Step badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-5">
                    <span className="text-xs font-bold text-[#FD7E14]">Step {i + 1}</span>
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                    style={{ boxShadow: `0 8px 24px ${step.glow}` }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-[#1C1C1E] mb-3 group-hover:text-[#FD7E14] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[#6B7280] leading-relaxed text-sm">{step.description}</p>

                  {/* Bottom accent line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} rounded-b-3xl scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link
            to="/apply"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-2xl font-bold shadow-[0_8px_32px_rgba(253,126,20,0.4)] hover:shadow-[0_12px_48px_rgba(253,126,20,0.6)] hover:scale-105 transition-all"
          >
            Start Your Journey Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
