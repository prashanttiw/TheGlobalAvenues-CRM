import { useParams, Link } from 'react-router-dom';
import { DESTINATIONS } from '@/data/destinations';
import { motion } from 'motion/react';
import { MapPin, ArrowRight, BookOpen, GraduationCap, Building } from 'lucide-react';

export function CountryDetailPage() {
  const { slug } = useParams();
  const dest = DESTINATIONS.find((d) => d.slug === slug);

  if (!dest) {
    return (
      <div className="min-h-screen pt-32 text-center bg-[#FFFCF5]">
        <h1 className="text-4xl font-bold text-[#333] mb-4">Destination Not Found</h1>
        <Link to="/destinations" className="text-[#FD7E14] hover:underline">Return to Destinations</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center">
        <div className="absolute inset-0">
          <img src={dest.heroImage} alt={dest.country} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <div className="text-6xl mb-4">{dest.flag}</div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">Study in {dest.country}</h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Experience world-class education, diverse culture, and excellent career opportunities in one of the most sought-after study destinations.
            </p>
            <div className="flex gap-4">
              <Link to="/contact" className="px-8 py-3 bg-[#FD7E14] text-white rounded-xl font-bold hover:bg-[#C94D1B] transition-colors">
                Apply Now
              </Link>
              <Link to="/partners" className="px-8 py-3 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold hover:bg-white/20 transition-colors border border-white/20">
                View Partners
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Quick View */}
      <section className="py-12 bg-white border-b border-[#FD7E14]/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FD7E14]/10 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6 text-[#FD7E14]" />
              </div>
              <div>
                <div className="text-sm text-[#666] mb-1">Universities</div>
                <div className="text-xl font-bold text-[#333]">{dest.universitiesCount}+</div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FD7E14]/10 flex items-center justify-center shrink-0">
                <Building className="w-6 h-6 text-[#FD7E14]" />
              </div>
              <div>
                <div className="text-sm text-[#666] mb-1">Avg. Living Cost</div>
                <div className="text-xl font-bold text-[#333]">{dest.avgLivingCostINR}</div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FD7E14]/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-[#FD7E14]" />
              </div>
              <div>
                <div className="text-sm text-[#666] mb-1">Min. IELTS</div>
                <div className="text-xl font-bold text-[#333]">{dest.ieltsMin}+</div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FD7E14]/10 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-[#FD7E14]" />
              </div>
              <div>
                <div className="text-sm text-[#666] mb-1">Region</div>
                <div className="text-xl font-bold text-[#333] uppercase">{dest.region}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold text-[#333] mb-6">Why Study in {dest.country}?</h2>
              <p className="text-[#666] text-lg leading-relaxed mb-8">
                {dest.country} is consistently ranked among the top destinations for international students. With a strong emphasis on research and innovation, students gain access to state-of-the-art facilities and world-renowned faculty. The diverse and multicultural environment ensures a welcoming experience for students from the SAMEA region.
              </p>
              
              <h3 className="text-2xl font-bold text-[#333] mb-4">Key Benefits</h3>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FD7E14]/20 flex items-center justify-center shrink-0 mt-1">
                    <ArrowRight className="w-4 h-4 text-[#FD7E14]" />
                  </div>
                  <span className="text-[#666]">High-quality education recognized globally by employers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FD7E14]/20 flex items-center justify-center shrink-0 mt-1">
                    <ArrowRight className="w-4 h-4 text-[#FD7E14]" />
                  </div>
                  <span className="text-[#666]">Excellent post-study work opportunities and PR pathways.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FD7E14]/20 flex items-center justify-center shrink-0 mt-1">
                    <ArrowRight className="w-4 h-4 text-[#FD7E14]" />
                  </div>
                  <span className="text-[#666]">Safe and vibrant cities with high standards of living.</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(253,126,20,0.08)] border border-[#FD7E14]/10">
                <h3 className="text-xl font-bold text-[#333] mb-4">Top Cities</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#eee]">
                    <span className="text-[#666] font-medium">Capital City</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#eee]">
                    <span className="text-[#666] font-medium">Major Tech Hub</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[#666] font-medium">Student Friendly</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] p-6 rounded-2xl text-white">
                <h3 className="text-xl font-bold mb-2">Need Guidance?</h3>
                <p className="text-white/90 mb-4 text-sm">Our experts can help you shortlist universities and handle the visa process.</p>
                <Link to="/contact" className="block text-center w-full bg-white text-[#FD7E14] py-3 rounded-xl font-bold hover:bg-[#FFFCF5] transition-colors">
                  Speak to an Expert
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
