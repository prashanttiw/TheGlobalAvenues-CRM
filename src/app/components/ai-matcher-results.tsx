import { useState } from 'react';
import { TrendingUp, Users, DollarSign, Award, MessageCircle, Heart, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

const universities = [
  {
    id: 1,
    name: 'FH Kufstein Tirol',
    country: 'Austria',
    ranking: 'Applied Sciences',
    successProbability: 86,
    expectedROI: 'Strong EU pathway',
    avgSalary: 'Career-service guided',
    topEmployers: ['Tourism', 'Data', 'Sustainability'],
    tuition: 'EUR 700-EUR 800/year',
    scholarships: 'Profile based',
    image: '/universities/fh-kufstein-tirol-hero.webp',
  },
  {
    id: 2,
    name: 'EUAS',
    country: 'Estonia',
    ranking: 'Largest private UAS',
    successProbability: 84,
    expectedROI: 'Tallinn tech ecosystem',
    avgSalary: 'Program based',
    topEmployers: ['IT', 'Business', 'Design'],
    tuition: 'EUR 6,260-EUR 8,740/year',
    scholarships: 'Available',
    image: '/universities/euas-hero.jpg',
  },
  {
    id: 3,
    name: 'ICN Business School',
    country: 'France/Germany',
    ranking: 'Business School',
    successProbability: 80,
    expectedROI: 'Multi-campus exposure',
    avgSalary: 'Career-service guided',
    topEmployers: ['Consulting', 'Finance', 'Luxury'],
    tuition: 'Program specific',
    scholarships: 'Available',
    image: '/universities/icn-business-school-hero.png',
  },
  {
    id: 4,
    name: "St. George's University",
    country: 'Grenada',
    ranking: 'Medical University',
    successProbability: 78,
    expectedROI: 'Clinical pathway',
    avgSalary: 'Residency-track outcome',
    topEmployers: ['Hospitals', 'Clinics', 'Research'],
    tuition: 'Program specific',
    scholarships: 'Available',
    image: '/universities/st-georges-university-hero.webp',
  },
];

export function AIMatcherResults() {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [filterBy, setFilterBy] = useState<'probability' | 'salary' | 'roi'>('probability');

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 75) return 'from-[#4CAF50] to-[#66BB6A]';
    if (prob >= 60) return 'from-[#FFC107] to-[#FFD54F]';
    return 'from-[#FF5722] to-[#FF7043]';
  };

  const getProbabilityTextColor = (prob: number) => {
    if (prob >= 75) return 'text-[#4CAF50]';
    if (prob >= 60) return 'text-[#FFC107]';
    return 'text-[#FF5722]';
  };

  return (
    <section className="py-24 bg-gradient-to-b from-[#FFFCF5] to-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-4xl font-bold text-[#222222] mb-2">
                Your Perfect Matches
              </h2>
              <p className="text-[#666666]">
                Matched from The Global Avenues partner portfolio based on profile, budget, and destination preference
              </p>
            </div>
            
            {/* Outcome Filter */}
            <div className="flex items-center gap-3 bg-white rounded-2xl p-2 shadow-[0_4px_16px_rgba(253,126,20,0.15)] border border-[#FD7E14]/20">
              <button
                onClick={() => setFilterBy('probability')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterBy === 'probability'
                    ? 'bg-gradient-to-r from-[#D32F2F] to-[#FF5722] text-white shadow-[0_4px_12px_rgba(211,47,47,0.3)]'
                    : 'text-[#666666] hover:text-[#222222]'
                }`}
              >
                Success Rate
              </button>
              <button
                onClick={() => setFilterBy('salary')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterBy === 'salary'
                    ? 'bg-gradient-to-r from-[#D32F2F] to-[#FF5722] text-white shadow-[0_4px_12px_rgba(211,47,47,0.3)]'
                    : 'text-[#666666] hover:text-[#222222]'
                }`}
              >
                Career Outcome
              </button>
              <button
                onClick={() => setFilterBy('roi')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterBy === 'roi'
                    ? 'bg-gradient-to-r from-[#D32F2F] to-[#FF5722] text-white shadow-[0_4px_12px_rgba(211,47,47,0.3)]'
                    : 'text-[#666666] hover:text-[#222222]'
                }`}
              >
                Expected ROI
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white backdrop-blur-xl rounded-2xl p-4 border border-[#FD7E14]/20 shadow-[0_2px_8px_rgba(253,126,20,0.1)]">
              <div className="text-2xl font-bold text-[#FD7E14] mb-1">12</div>
              <div className="text-sm text-[#666666]">Partner Options</div>
            </div>
            <div className="bg-white backdrop-blur-xl rounded-2xl p-4 border border-[#FD7E14]/20 shadow-[0_2px_8px_rgba(253,126,20,0.1)]">
              <div className="text-2xl font-bold text-[#FD7E14] mb-1">78%</div>
              <div className="text-sm text-[#666666]">Avg Success Rate</div>
            </div>
            <div className="bg-white backdrop-blur-xl rounded-2xl p-4 border border-[#FD7E14]/20 shadow-[0_2px_8px_rgba(253,126,20,0.1)]">
              <div className="text-2xl font-bold text-[#FD7E14] mb-1">Profile</div>
              <div className="text-sm text-[#666666]">Scholarship Review</div>
            </div>
            <div className="bg-white backdrop-blur-xl rounded-2xl p-4 border border-[#FD7E14]/20 shadow-[0_2px_8px_rgba(253,126,20,0.1)]">
              <div className="text-2xl font-bold text-[#FD7E14] mb-1">15</div>
              <div className="text-sm text-[#666666]">Countries</div>
            </div>
          </div>
        </motion.div>

        {/* University Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {universities.map((uni, index) => (
            <motion.div
              key={uni.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8 }}
              className="group relative bg-white backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_4px_16px_rgba(253,126,20,0.15)] hover:shadow-[0_20px_40px_rgba(253,126,20,0.25)] transition-all duration-300 border border-[#FD7E14]/10 hover:border-[#FFC107]"
            >
              {/* Image Header */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={uni.image}
                  alt={uni.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Favorite Button */}
                <button
                  onClick={() => toggleFavorite(uni.id)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all border border-white/50 hover:scale-110"
                >
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      favorites.includes(uni.id)
                        ? 'fill-[#D32F2F] text-[#D32F2F]'
                        : 'text-white'
                    }`}
                  />
                </button>

                {/* Ranking Badge */}
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-white/95 backdrop-blur-md rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                  <span className="text-sm font-bold text-[#222222]">{uni.ranking}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-[#222222] mb-1 group-hover:text-[#FD7E14] transition-colors">
                      {uni.name}
                    </h3>
                    <p className="text-sm text-[#666666]">{uni.country}</p>
                  </div>
                </div>

                {/* Success Probability Meter */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#222222]">
                      Success Probability
                    </span>
                    <span className={`text-lg font-bold ${getProbabilityTextColor(uni.successProbability)}`}>
                      {uni.successProbability}%
                    </span>
                  </div>
                  <div className="h-3 bg-[#FFFCF5] rounded-full overflow-hidden border border-[#FD7E14]/10">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${getProbabilityColor(uni.successProbability)} rounded-full`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${uni.successProbability}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                    />
                  </div>
                </div>

                {/* ROI & Salary Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#FFFCF5] to-[#FFE8CC] rounded-xl p-4 border border-[#FD7E14]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-[#FD7E14]" />
                      <span className="text-xs font-semibold text-[#333333]">Expected ROI</span>
                    </div>
                    <div className="text-xl font-bold text-[#FD7E14]">{uni.expectedROI}</div>
                  </div>
                  <div className="bg-gradient-to-br from-[#FFF8E1] to-[#FFECB3] rounded-xl p-4 border border-[#FFC107]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-[#FF9800]" />
                      <span className="text-xs font-semibold text-[#333333]">Avg. Salary</span>
                    </div>
                    <div className="text-sm font-bold text-[#FF9800]">{uni.avgSalary}</div>
                  </div>
                </div>

                {/* Top Employers */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-[#FD7E14]" />
                    <span className="text-sm font-semibold text-[#222222]">Top Hiring Companies</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uni.topEmployers.map((employer) => (
                      <span
                        key={employer}
                        className="px-3 py-1 bg-[#FFFCF5] rounded-lg text-xs font-medium text-[#222222] border border-[#FD7E14]/20"
                      >
                        {employer}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <motion.button 
                    className="flex-1 bg-gradient-to-r from-[#D32F2F] to-[#FF5722] text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(211,47,47,0.3)]"
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: '0 8px 24px rgba(211,47,47,0.4)'
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Apply Now
                    <ArrowUpRight className="w-4 h-4" />
                  </motion.button>
                  <motion.button 
                    className="px-6 py-3 bg-white border-2 border-[#FD7E14] text-[#FD7E14] rounded-xl font-semibold hover:bg-[#FD7E14] hover:text-white transition-all flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat with Alumni
                  </motion.button>
                </div>

                {/* Additional Info */}
                <div className="mt-4 pt-4 border-t border-[#FD7E14]/10 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-[#666666]">Tuition: </span>
                    <span className="font-semibold text-[#222222]">{uni.tuition}</span>
                  </div>
                  <div className="px-3 py-1 bg-gradient-to-r from-[#FFC107] to-[#FFD54F] text-[#333333] rounded-lg text-sm font-semibold shadow-[0_0_20px_rgba(255,193,7,0.3)]">
                    {uni.scholarships}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
