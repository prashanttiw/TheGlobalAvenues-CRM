import { useState, useEffect } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Priya Sharma',
    course: 'MBA — ICN Business School',
    country: 'France',
    flag: '🇫🇷',
    year: '2024',
    avatar: 'PS',
    avatarColor: 'from-[#FD7E14] to-[#D32F2F]',
    quote: 'Global Avenues made my dream of studying in France a reality. From finding ICN Business School to getting my visa approved — they handled everything. The team was incredibly responsive and supportive throughout.',
    rating: 5,
    scholarship: '€8,000 scholarship secured',
  },
  {
    id: 2,
    name: 'Rahul Mehta',
    course: 'BSc Computer Science — EUAS',
    country: 'Estonia',
    flag: '🇪🇪',
    year: '2024',
    avatar: 'RM',
    avatarColor: 'from-[#2196F3] to-[#1565C0]',
    quote: 'I had no idea Estonia had such great tech universities. The counsellors at Global Avenues matched me perfectly with EUAS. The application process was smooth and I got my offer in just 2 weeks!',
    rating: 5,
    scholarship: 'Merit scholarship awarded',
  },
  {
    id: 3,
    name: 'Ananya Patel',
    course: 'BBA — Benedictine University',
    country: 'USA',
    flag: '🇺🇸',
    year: '2023',
    avatar: 'AP',
    avatarColor: 'from-[#4CAF50] to-[#2E7D32]',
    quote: 'The visa process for the US seemed daunting but Global Avenues guided me step by step. Their 98% visa success rate is real — I got my F-1 visa approved on the first attempt. Highly recommend!',
    rating: 5,
    scholarship: 'Partial tuition waiver',
  },
  {
    id: 4,
    name: 'Arjun Singh',
    course: 'MSc Sustainable Energy — EIT InnoEnergy',
    country: 'Europe',
    flag: '🇪🇺',
    year: '2024',
    avatar: 'AS',
    avatarColor: 'from-[#9C27B0] to-[#6A1B9A]',
    quote: 'EIT InnoEnergy is a pan-European program and the application was complex. Global Avenues knew exactly what was needed and helped me craft a compelling SOP. Now I\'m studying across 3 countries!',
    rating: 5,
    scholarship: '€12,000 scholarship',
  },
  {
    id: 5,
    name: 'Kavya Reddy',
    course: 'Graphic Design — MJM Paris',
    country: 'France',
    flag: '🇫🇷',
    year: '2023',
    avatar: 'KR',
    avatarColor: 'from-[#FF5722] to-[#BF360C]',
    quote: 'As a creative student, I wanted a design school with real industry connections. MJM Paris was the perfect fit and Global Avenues helped me get there. The portfolio guidance was exceptional.',
    rating: 5,
    scholarship: 'Early bird discount',
  },
];

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const t = setInterval(() => {
      setDirection(1);
      setCurrent(c => (c + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const go = (dir: number) => {
    setDirection(dir);
    setCurrent(c => (c + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const t = TESTIMONIALS[current];

  return (
    <section className="py-24 bg-[#FFFCF5] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#FD7E14]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#D32F2F]/5 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4">
            <Star className="w-4 h-4 text-[#FD7E14] fill-[#FD7E14]" />
            <span className="text-sm text-[#FD7E14] font-semibold">Student Success Stories</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1C1C1E] mb-4">
            Real Students. Real Results.
          </h2>
          <p className="text-lg text-[#6B7280] max-w-xl mx-auto">
            4,000+ students have trusted us with their study abroad journey.
          </p>
        </motion.div>

        {/* Main testimonial card */}
        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={t.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="bg-white rounded-3xl p-10 shadow-[0_20px_60px_rgba(253,126,20,0.12)] border border-[#FD7E14]/10 relative overflow-hidden"
            >
              {/* Quote icon */}
              <div className="absolute top-8 right-8 opacity-8">
                <Quote className="w-20 h-20 text-[#FD7E14]" />
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-[#FFC107] fill-[#FFC107]" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-xl md:text-2xl text-[#1C1C1E] font-medium leading-relaxed mb-8 relative z-10">
                "{t.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_16px_rgba(253,126,20,0.3)]`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-[#1C1C1E] text-lg">{t.name}</div>
                    <div className="text-sm text-[#6B7280]">{t.course}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-base">{t.flag}</span>
                      <span className="text-xs text-[#9CA3AF]">{t.country} · {t.year}</span>
                    </div>
                  </div>
                </div>
                {t.scholarship && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#FFC107]/15 rounded-xl border border-[#FFC107]/30">
                    <Star className="w-4 h-4 text-[#FFC107] fill-[#FFC107]" />
                    <span className="text-sm font-semibold text-[#92400E]">{t.scholarship}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => go(-1)}
              className="w-12 h-12 rounded-2xl bg-white border border-[#FD7E14]/20 flex items-center justify-center hover:bg-[#FD7E14] hover:text-white hover:border-[#FD7E14] transition-all shadow-[0_2px_12px_rgba(253,126,20,0.1)] group"
            >
              <ChevronLeft className="w-5 h-5 text-[#FD7E14] group-hover:text-white" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                  className={`transition-all duration-300 rounded-full ${i === current ? 'w-8 h-2.5 bg-[#FD7E14]' : 'w-2.5 h-2.5 bg-[#FD7E14]/25 hover:bg-[#FD7E14]/50'}`}
                />
              ))}
            </div>

            <button
              onClick={() => go(1)}
              className="w-12 h-12 rounded-2xl bg-white border border-[#FD7E14]/20 flex items-center justify-center hover:bg-[#FD7E14] hover:text-white hover:border-[#FD7E14] transition-all shadow-[0_2px_12px_rgba(253,126,20,0.1)] group"
            >
              <ChevronRight className="w-5 h-5 text-[#FD7E14] group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Mini testimonial avatars */}
        <div className="flex items-center justify-center gap-3 mt-10">
          {TESTIMONIALS.map((t, i) => (
            <motion.button
              key={t.id}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
              whileHover={{ scale: 1.15 }}
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.avatarColor} flex items-center justify-center text-white text-xs font-bold transition-all ${i === current ? 'ring-2 ring-[#FD7E14] ring-offset-2 scale-110' : 'opacity-50'}`}
            >
              {t.avatar}
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
