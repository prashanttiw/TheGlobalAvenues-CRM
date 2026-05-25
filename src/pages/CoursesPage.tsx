import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { COURSE_CATEGORIES } from '@/data/courses';

export function CoursesPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      <section className="py-16 bg-gradient-to-br from-[#1A0A00] to-[#2D1200]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/20 border border-[#FD7E14]/30 mb-6">
              <BookOpen className="w-4 h-4 text-[#FD7E14]" />
              <span className="text-sm text-[#FD7E14] font-semibold">1,000+ Courses Available</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">Find Your Perfect Course</h1>
            <p className="text-xl text-white/70">Explore programs across every field at top global universities</p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COURSE_CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -6 }}
              className="group"
            >
              <Link to={`/courses/${cat.slug}`}>
                <div className="bg-white rounded-2xl p-7 border border-[#FD7E14]/10 hover:border-[#FD7E14]/30 shadow-[0_2px_12px_rgba(253,126,20,0.06)] hover:shadow-[0_16px_40px_rgba(253,126,20,0.14)] transition-all h-full">
                  <div className="text-4xl mb-4">{cat.icon}</div>
                  <h3 className="text-xl font-bold text-[#222] mb-2 group-hover:text-[#FD7E14] transition-colors">{cat.name}</h3>
                  <p className="text-[#666] text-sm mb-4">{cat.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {cat.subCategories.slice(0, 4).map((sub) => (
                      <span key={sub} className="text-xs px-2 py-0.5 bg-[#FD7E14]/8 rounded-md text-[#FD7E14] border border-[#FD7E14]/15">{sub}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#999]">{cat.coursesCount} courses</span>
                    <span className="text-[#FD7E14] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Explore <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
