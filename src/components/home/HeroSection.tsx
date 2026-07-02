import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, Globe2, GraduationCap, Users } from 'lucide-react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';

const HERO_SLIDES = [
  {
    image: '/hero/university-hall-hero.jpg',
    headline: 'Your Dream University.',
    highlight: 'One Platform Away.',
    sub: 'Navigate admissions, visa, counselling - all in one place. Built for students from South Asia.',
  },
  {
    image: '/hero/library-study-hero.jpg',
    headline: '100+ Partner Universities.',
    highlight: 'Across 40+ Countries.',
    sub: 'From exclusive MOU partners to a global network - find your perfect institution.',
  },
  {
    image: '/universities/elmhurst-university-hero.jpg',
    headline: '98% Visa Success Rate.',
    highlight: 'Expert Guidance.',
    sub: 'ICEF certified counsellors with 12+ years of experience in international education.',
  },
];

const STATS = [
  { icon: GraduationCap, value: '100+', label: 'Partner Universities', color: '#FD7E14' },
  { icon: Globe2, value: '40+', label: 'Countries', color: '#FFC107' },
  { icon: CheckCircle2, value: '98%', label: 'Visa Success', color: '#4CAF50' },
  { icon: Users, value: '4K+', label: 'Students Recruited', color: '#D32F2F' },
];

const FLOATING_BADGES = [
  { text: 'UK Visa Approved', delay: 0, x: '8%', y: '30%' },
  { text: 'Offer from ICN France', delay: 1.5, x: '78%', y: '22%' },
  { text: 'Scholarship Secured', delay: 3, x: '82%', y: '65%' },
];

const SPARKLE_POINTS = [
  { x: '12%', y: '18%', size: 3, delay: 0 },
  { x: '22%', y: '72%', size: 2, delay: 0.7 },
  { x: '31%', y: '29%', size: 2, delay: 1.4 },
  { x: '39%', y: '82%', size: 3, delay: 2.1 },
  { x: '48%', y: '17%', size: 2, delay: 2.8 },
  { x: '57%', y: '68%', size: 2, delay: 3.5 },
  { x: '66%', y: '31%', size: 3, delay: 4.2 },
  { x: '73%', y: '78%', size: 2, delay: 4.9 },
  { x: '84%', y: '39%', size: 3, delay: 5.6 },
  { x: '91%', y: '16%', size: 2, delay: 6.3 },
  { x: '17%', y: '44%', size: 1.5, delay: 1.1 },
  { x: '52%', y: '48%', size: 1.5, delay: 2.4 },
  { x: '88%', y: '61%', size: 1.5, delay: 3.7 },
];

export function HeroSection() {
  const [slide, setSlide] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const current = HERO_SLIDES[slide];

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-[1800ms]"
            style={{ opacity: i === slide ? 1 : 0 }}
          >
            <img src={s.image} alt="" className="w-full h-full object-cover scale-110" loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-br from-[#0D0500]/85 via-[#1A0800]/70 to-[#FD7E14]/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#FFFCF5] via-transparent to-transparent opacity-[0.08]" />
      <div className="absolute inset-0 dot-grid opacity-25 pointer-events-none" />
      <div className="absolute inset-0 noise pointer-events-none" />

      <div className="absolute inset-0 pointer-events-none hidden md:block">
        {SPARKLE_POINTS.map((point, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white shadow-[0_0_14px_rgba(255,193,7,0.75)]"
            style={{
              left: point.x,
              top: point.y,
              width: point.size,
              height: point.size,
            }}
            animate={{
              opacity: [0.12, 0.9, 0.18],
              scale: [0.7, 1.7, 0.9],
              y: [0, -8, 0],
            }}
            transition={{
              duration: 4.5,
              delay: point.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(253,126,20,0.18) 0%, transparent 70%)', top: '-10%', left: '-10%' }}
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(211,47,47,0.12) 0%, transparent 70%)', bottom: '5%', right: '-5%' }}
          animate={{ scale: [1, 1.15, 1], x: [0, -20, 0], y: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.10) 0%, transparent 70%)', top: '40%', left: '40%' }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {FLOATING_BADGES.map((badge, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: badge.x, top: badge.y }}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -10], scale: [0.8, 1, 1, 0.9] }}
            transition={{ duration: 4, delay: badge.delay + 2, repeat: Infinity, repeatDelay: 8 }}
          >
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-white/50">
              <span className="text-sm font-semibold text-[#1C1C1E] whitespace-nowrap">{badge.text}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[350px] sm:w-[500px] h-[150px] sm:h-[200px] bg-gradient-to-r from-[#FD7E14]/15 to-[#FFC107]/10 rounded-full blur-[90px] sm:blur-[130px] pointer-events-none z-0" />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-24 pb-10 text-center sm:px-6 sm:pt-28 sm:pb-16"
        style={{ y: textY, opacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{
            opacity: { duration: 0.7 },
            y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="mb-8 inline-flex max-w-full items-center justify-center gap-2.5 rounded-full border border-white/20 px-4 py-2 text-center glass sm:mb-10 sm:px-5 sm:py-2.5 shadow-[0_4px_24px_rgba(253,126,20,0.15)] hover:border-[#FD7E14]/40 hover:shadow-[0_4px_30px_rgba(253,126,20,0.25)] transition-all duration-300"
        >
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#FFC107] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFC107]" />
          </span>
          <span className="min-w-0 whitespace-normal text-xs font-medium leading-snug text-white/90 sm:text-sm">Asia's Trusted Global Education Partner . ICEF Certified</span>
        </motion.div>

        <div className="mb-5 flex min-h-[132px] flex-col items-center justify-center sm:mb-6 sm:min-h-[160px] md:min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="mb-3 max-w-full text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-7xl">
                {current.headline}
                <br />
                <span className="text-gradient-orange">{current.highlight}</span>
              </h1>
              <p className="mx-auto max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base md:text-xl">
                {current.sub}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`transition-all duration-300 rounded-full ${i === slide ? 'w-8 h-2 bg-[#FD7E14]' : 'w-2 h-2 bg-white/30 hover:bg-white/60'}`}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mb-10 flex flex-col items-center justify-center gap-3 sm:mb-14 sm:flex-row sm:gap-4"
        >
          <Link
            to="/apply"
            className="group flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] px-8 py-4 text-base font-bold text-white shadow-[0_8px_32px_rgba(253,126,20,0.5)] transition-all animate-pulse-glow hover:scale-105 hover:shadow-[0_12px_48px_rgba(253,126,20,0.7)] sm:w-auto"
          >
            Start My Journey
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto"
        >
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
                className="glass rounded-2xl p-4 text-center border border-white/15 hover:border-white/30 transition-all cursor-default"
              >
                <Icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: stat.color }} />
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-white/60 mt-0.5">{stat.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Scroll</span>
        <ChevronDown className="w-5 h-5 text-white/40" />
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FD7E14]/30 to-transparent pointer-events-none z-20" />
    </section>
  );
}
