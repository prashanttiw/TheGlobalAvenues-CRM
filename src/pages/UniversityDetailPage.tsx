import { useParams, Link } from 'react-router-dom';
import { UNIVERSITIES } from '@/data/universities';
import { motion } from 'motion/react';
import { MapPin, Trophy, GraduationCap, Calendar, Users, Star, ArrowRight } from 'lucide-react';

export function UniversityDetailPage() {
  const { slug } = useParams();
  const uni = UNIVERSITIES.find((u) => u.slug === slug);

  if (!uni) {
    return (
      <div className="min-h-screen pt-32 text-center bg-[#FFFCF5]">
        <h1 className="text-4xl font-bold text-[#333] mb-4">University Not Found</h1>
        <Link to="/universities" className="text-[#FD7E14] hover:underline">Browse Universities</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-20">
      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-end pb-12">
        <div className="absolute inset-0">
          <img src={uni.image} alt={uni.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row items-start md:items-end gap-6 justify-between">
          <div className="flex items-end gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl p-4 shadow-2xl shrink-0 border border-white/20">
              <img src={uni.logo} alt={`${uni.name} logo`} className="w-full h-full object-contain" />
            </div>
            <div className="pb-2">
              {uni.tier === 'exclusive' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFC107]/20 border border-[#FFC107]/30 text-[#FFC107] text-xs font-bold mb-3">
                  <Star className="w-3.5 h-3.5 fill-current" /> EXCLUSIVE PARTNER
                </div>
              )}
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{uni.name}</h1>
              <div className="flex items-center gap-2 text-white/80">
                <MapPin className="w-4 h-4" />
                <span>{uni.city}, {uni.country}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <Link to="/contact" className="flex-1 md:flex-none px-8 py-3 bg-[#FD7E14] text-white rounded-xl font-bold text-center hover:bg-[#C94D1B] transition-colors shadow-[0_4px_16px_rgba(253,126,20,0.35)]">
              Apply Now
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-8">
          
          {/* Main Info */}
          <div className="flex-1 space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(253,126,20,0.08)] border border-[#FD7E14]/10">
              <h2 className="text-2xl font-bold text-[#333] mb-6">About University</h2>
              <p className="text-[#666] leading-relaxed mb-6">
                {uni.name} is a leading institution in {uni.country}, known for its excellent academic standards, innovative research, and vibrant campus life. Welcoming international students from across the globe, it offers a diverse environment geared towards student success and global employability.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-[#eee]">
                <div>
                  <div className="text-sm text-[#999] mb-1">Global Rank</div>
                  <div className="font-bold text-[#333] flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#FD7E14]" /> #{uni.rankingQS}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#999] mb-1">Avg Tuition</div>
                  <div className="font-bold text-[#333]">{uni.tuitionFee}</div>
                </div>
                <div>
                  <div className="text-sm text-[#999] mb-1">Intakes</div>
                  <div className="font-bold text-[#333] flex flex-wrap gap-1">
                    {uni.intakes.map(i => <span key={i} className="text-xs bg-[#f5f5f5] px-2 py-1 rounded">{i}</span>)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#999] mb-1">Requirements</div>
                  <div className="font-bold text-[#333] text-sm">{uni.requirements}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(253,126,20,0.08)] border border-[#FD7E14]/10">
              <h2 className="text-2xl font-bold text-[#333] mb-6">Popular Programs</h2>
              <div className="space-y-4">
                {uni.programs.map((prog, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[#eee] hover:border-[#FD7E14]/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FD7E14]/10 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-[#FD7E14]" />
                      </div>
                      <span className="font-semibold text-[#333]">{prog}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#999]" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 text-white shadow-xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#FD7E14]" /> Connect with Rep
              </h3>
              <p className="text-white/70 text-sm mb-6">
                As an exclusive partner, we provide direct application processing and scholarship assistance.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[#FD7E14]" />
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">Next Intake</div>
                    <div className="font-semibold">{uni.intakes[0]}</div>
                  </div>
                </div>
              </div>
              <Link to={`/contact?uni=${uni.slug}`} className="mt-6 block w-full py-3 bg-[#FD7E14] text-center rounded-xl font-bold hover:bg-[#C94D1B] transition-colors">
                Book Session
              </Link>
            </div>
            
            {uni.scholarships && uni.scholarships.length > 0 && (
              <div className="bg-gradient-to-br from-[#FFF8F0] to-[#FFF] border border-[#FD7E14]/20 rounded-2xl p-6">
                <h3 className="font-bold text-lg text-[#333] mb-4">Scholarships</h3>
                <ul className="space-y-3">
                  {uni.scholarships.map((schol, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#666]">
                      <Star className="w-4 h-4 text-[#FFC107] shrink-0 mt-0.5" />
                      {schol}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
