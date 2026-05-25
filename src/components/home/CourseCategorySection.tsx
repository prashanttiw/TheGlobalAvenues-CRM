import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { COURSE_CATEGORIES } from '@/data/courses';

export function CourseCategorySection() {
  return (
    <section className="py-24 bg-[#FFFCF5]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4">
            <span className="text-sm text-[#FD7E14] font-semibold">1,000+ Courses Available</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#222] mb-4">
            Find Courses by Your Interest
          </h2>
          <p className="text-lg text-[#666] max-w-2xl mx-auto">
            From AI to Medicine — explore programs across every field at top global universities.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COURSE_CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group"
            >
              <Link to={`/courses/${cat.slug}`}>
                <div className="bg-white rounded-2xl p-5 border border-[#FD7E14]/10 hover:border-[#FD7E14]/40 shadow-[0_2px_12px_rgba(253,126,20,0.06)] hover:shadow-[0_12px_32px_rgba(253,126,20,0.15)] transition-all duration-300 h-full flex flex-col items-center text-center">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110"
                    style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}25` }}
                  >
                    {cat.icon}
                  </div>

                  <h3 className="text-sm font-bold text-[#222] mb-1 leading-tight">{cat.name}</h3>
                  <p className="text-xs text-[#999] mb-3">{cat.coursesCount} courses</p>

                  {/* Hover: show top sub-categories */}
                  <div className="hidden group-hover:flex flex-col gap-1 w-full">
                    {cat.subCategories.slice(0, 3).map((sub) => (
                      <span key={sub} className="text-xs text-[#666] bg-[#FFFCF5] rounded-lg px-2 py-1 truncate">
                        {sub}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-3 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: cat.color }}>
                    Explore <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#FD7E14] text-[#FD7E14] font-bold hover:bg-[#FD7E14] hover:text-white transition-all"
          >
            Browse All Courses <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
