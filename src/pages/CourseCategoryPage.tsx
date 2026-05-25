import { useParams, Link } from 'react-router-dom';
import { COURSE_CATEGORIES } from '@/data/courses';
import { motion } from 'motion/react';
import { ArrowRight, GraduationCap, MapPin, Search } from 'lucide-react';

export function CourseCategoryPage() {
  const { category } = useParams();
  const courseCat = COURSE_CATEGORIES.find((c) => c.slug === category);

  if (!courseCat) {
    return (
      <div className="min-h-screen pt-32 text-center bg-[#FFFCF5]">
        <h1 className="text-4xl font-bold text-[#333] mb-4">Course Category Not Found</h1>
        <Link to="/courses" className="text-[#FD7E14] hover:underline">Browse Courses</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className={`py-16 bg-gradient-to-br ${courseCat.bgGradient} relative overflow-hidden border-b border-[#FD7E14]/10`}>
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center text-5xl shrink-0">
            {courseCat.icon}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-[#333] mb-4">
              {courseCat.name}
            </h1>
            <p className="text-xl text-[#666] max-w-2xl">
              {courseCat.description}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Sub Categories */}
          <div className="lg:col-span-2 space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-[#333] mb-6 flex items-center gap-2">
                <Search className="w-6 h-6 text-[#FD7E14]" /> Specialized Programs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseCat.subCategories.map((sub, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-xl border border-[#eee] bg-white hover:border-[#FD7E14]/50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#333] group-hover:text-[#FD7E14] transition-colors">{sub}</span>
                      <ArrowRight className="w-4 h-4 text-[#999] group-hover:text-[#FD7E14] group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgba(253,126,20,0.08)] border border-[#FD7E14]/10">
              <h3 className="text-xl font-bold text-[#333] mb-4">Why study {courseCat.name}?</h3>
              <p className="text-[#666] leading-relaxed mb-6">
                Programs in {courseCat.name} are highly sought after globally, offering exceptional career prospects, high earning potential, and the opportunity to work at the forefront of industry innovation. Graduates are heavily recruited across top destinations.
              </p>
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A0A00] text-white rounded-xl font-bold hover:bg-[#2D1200] transition-colors">
                Speak to a Counsellor <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column - Stats & Info */}
          <div className="space-y-6">
            <div className="bg-[#FFFCF5] border border-[#FD7E14]/20 rounded-2xl p-6">
              <h3 className="font-bold text-lg text-[#333] mb-4">Quick Facts</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FD7E14]/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#FD7E14]" />
                  </div>
                  <div>
                    <div className="text-sm text-[#999]">Top Destinations</div>
                    <div className="font-semibold text-[#333]">{courseCat.topCountries.join(', ')}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FD7E14]/10 flex items-center justify-center shrink-0">
                    <span className="font-bold text-[#FD7E14]">₹</span>
                  </div>
                  <div>
                    <div className="text-sm text-[#999]">Avg. Fee Range</div>
                    <div className="font-semibold text-[#333]">{courseCat.avgFeeRange}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FD7E14]/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-[#FD7E14]" />
                  </div>
                  <div>
                    <div className="text-sm text-[#999]">Total Programs</div>
                    <div className="font-semibold text-[#333]">{courseCat.coursesCount}+ Available</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] rounded-2xl p-6 text-white text-center">
              <h3 className="font-bold text-xl mb-2">Ready to Apply?</h3>
              <p className="text-white/80 text-sm mb-6">Create your student profile to get AI-matched with the best universities for {courseCat.name}.</p>
              <Link to="/apply" className="block w-full py-3 bg-white text-[#FD7E14] rounded-xl font-bold shadow-lg hover:scale-105 transition-transform">
                Start Your Profile
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
