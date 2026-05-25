import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, ArrowRight, GraduationCap, Globe2, CheckCircle2, Users, ChevronDown } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';

const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&q=85',
    headline: 'Your Dream University.',
    highlight: 'One Platform Away.',
    sub: 'Navigate admissions, visa, counselling — all in one place. Built for students from South Asia.',
  },
  {
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920&q=85',
    headline: '100+ Partner Universities.',
    highlight: 'Across 40+ Countries.',
    sub: 'From exclusive MOU partners to a global network — find your perfect institution.',
  },
  {
    image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1920&q=85',
    headline: '98% Visa Success Rate.',
    highlight: 'Expert Guidance.',
    sub: 'ICEF certified counsellors with 12+ years of experience in international education.',
  },
];

const STATS = [
  { icon: GraduationCap, value: '100+', label: 'Partner Universities', color: '#FD7E14' },
  { icon: Globe2,        value: '40+',  label: 'Countries',            color: '#FFC107' },
  { icon: CheckCircle2,  value: '98%',  label: 'Visa Success',         color: '#4CAF50' },
  { icon: Users,         value: '4K+',  label: 'Students Recruited',   color: '#D32F2F' },
];

const FLOATING_BADGES = [
  { text: '🇬🇧 UK Visa Approved', delay: 0,   x: '8%',  y: '30%' },
  { text: '🎓 Offer from ICN France', delay: 1.5, x: '78%', y: '22%' },
  { text: '✅ Scholarship Secured', delay: 3,   x: '82%', y: '65%' },
];

export function HeroSection() {
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState('');
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bgY   = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const current = HERO_SLIDES[slide];

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* ── Parallax background images ── */}
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

      {/* ── Multi-layer gradient overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D0500]/85 via-[#1A0800]/70 to-[#FD7E14]/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#FFFCF5] via-transparent to-transparent opacity-[0.08]" />

      {/* ── Animated mesh gradient orbs ── */}
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

      {/* ── Floating notification badges ── */}
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

      {/* ── Main content ── */}
      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-28 pb-16"
        style={{ y: textY, opacity }}
      >
        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass border border-white/20 mb-10"
        >
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#FFC107] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFC107]" />
          </span>
          <span className="text-sm text-white/90 font-medium">✦ Asia's Trusted Global Education Partner · ICEF Certified</span>
        </motion.div>

        {/* Headline with slide transition */}
        <div className="mb-6 min-h-[160px] md:min-h-[200px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-3">
                {current.headline}
                <br />
                <span className="text-gradient-orange">{current.highlight}</span>
              </h1>
              <p className="text-lg md:text-xl text-white/75 max-w-2xl mx-auto leading-relaxed">
                {current.sub}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slide indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`transition-all duration-300 rounded-full ${i === slide ? 'w-8 h-2 bg-[#FD7E14]' : 'w-2 h-2 bg-white/30 hover:bg-white/60'}`}
            />
          ))}
        </div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="flex items-center gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_40px_rgba(253,126,20,0.35),0_0_0_1px_rgba(253,126,20,0.15)]">
            <Search className="w-5 h-5 text-[#9CA3AF] ml-3 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (window.location.href = `/universities${search ? `?q=${encodeURIComponent(search)}` : ''}`)}
              placeholder="Search universities, courses, or countries..."
              className="flex-1 bg-transparent outline-none text-[#1C1C1E] placeholder:text-[#9CA3AF] text-sm py-1"
            />
            <Link
              to={`/universities${search ? `?q=${encodeURIComponent(search)}` : ''}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl text-sm font-bold shadow-[0_4px_16px_rgba(253,126,20,0.5)] hover:shadow-[0_6px_24px_rgba(253,126,20,0.7)] hover:scale-105 transition-all flex-shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              Search
            </Link>
          </div>
          <p className="text-xs text-white/50 mt-2 text-center">
            Popular: <button onClick={() => setSearch('MBA')} className="hover:text-white/80 transition-colors">MBA</button> · <button onClick={() => setSearch('Computer Science')} className="hover:text-white/80 transition-colors">Computer Science</button> · <button onClick={() => setSearch('UK')} className="hover:text-white/80 transition-colors">UK</button> · <button onClick={() => setSearch('France')} className="hover:text-white/80 transition-colors">France</button>
          </p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          <Link
            to="/apply"
            className="group flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-2xl font-bold text-base shadow-[0_8px_32px_rgba(253,126,20,0.5)] hover:shadow-[0_12px_48px_rgba(253,126,20,0.7)] hover:scale-105 transition-all animate-pulse-glow"
          >
            Start My Journey
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/partners"
            className="flex items-center gap-2 px-8 py-4 glass text-white rounded-2xl font-bold text-base hover:bg-white/15 transition-all"
          >
            View Our Partners
          </Link>
        </motion.div>

        {/* Stats grid */}
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

      {/* ── Scroll indicator ── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs text-white/40 uppercase tracking-widest">Scroll</span>
        <ChevronDown className="w-5 h-5 text-white/40" />
      </motion.div>

      {/* ── Bottom fade to cream ── */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#FFFCF5] to-transparent" />
    </section>
  );
}
