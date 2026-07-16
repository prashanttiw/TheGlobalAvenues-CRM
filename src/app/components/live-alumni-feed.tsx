import { useState } from 'react';
import { Play, Heart, MessageCircle, Share2, MapPin, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

const alumniPosts = [
  {
    id: 1,
    name: 'The Global Avenues Team',
    university: 'FH Kufstein Tirol',
    country: 'Austria',
    avatar: 'AT',
    thumbnail: '/universities/fh-kufstein-tirol-hero.webp',
    caption: 'Applied sciences pathways in AI, data science, sustainability, business, and event management.',
    likes: 234,
    comments: 45,
    duration: '0:15',
    posted: 'Portfolio update',
  },
  {
    id: 2,
    name: 'The Global Avenues Team',
    university: 'EUAS',
    country: 'Estonia',
    avatar: 'EE',
    thumbnail: '/universities/euas-hero.jpg',
    caption: 'Business, IT, design, and entrepreneurship programs inside Tallinn innovation ecosystem.',
    likes: 189,
    comments: 32,
    duration: '0:12',
    posted: 'Portfolio update',
  },
  {
    id: 3,
    name: 'The Global Avenues Team',
    university: 'ICN Business School',
    country: 'France/Germany',
    avatar: 'FR',
    thumbnail: '/universities/icn-business-school-hero.png',
    caption: 'International business pathways with multi-campus European exposure.',
    likes: 312,
    comments: 58,
    duration: '0:14',
    posted: 'Portfolio update',
  },
  {
    id: 4,
    name: 'The Global Avenues Team',
    university: "St. George's University",
    country: 'Grenada',
    avatar: 'GD',
    thumbnail: '/universities/st-georges-university-hero.webp',
    caption: 'Medical and veterinary pathways with global clinical training context.',
    likes: 267,
    comments: 41,
    duration: '0:13',
    posted: 'Portfolio update',
  },
  {
    id: 5,
    name: 'The Global Avenues Team',
    university: 'MJM Graphic Design',
    country: 'France',
    avatar: 'FR',
    thumbnail: '/universities/mjm-graphic-design-hero.jpg',
    caption: 'Creative arts and design programs connected to Paris and London learning routes.',
    likes: 423,
    comments: 67,
    duration: '0:16',
    posted: 'Portfolio update',
  },
  {
    id: 6,
    name: 'The Global Avenues Team',
    university: 'International American University',
    country: 'USA',
    avatar: 'US',
    thumbnail: '/universities/international-american-university-hero.jpg',
    caption: 'Business-focused programs across a global campus network.',
    likes: 198,
    comments: 29,
    duration: '0:11',
    posted: 'Portfolio update',
  },
];

export function LiveAlumniFeed() {
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const toggleLike = (postId: number) => {
    setLikedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 mb-4 border border-orange-500/20">
            <Play className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-600 font-semibold">Partner Portfolio</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A0A00] mb-4">
            Explore Partner Campus Stories
          </h2>
          <p className="text-lg text-[#1A0A00]/70 max-w-2xl mx-auto">
            Verified institution highlights from The Global Avenues partner portfolio
          </p>
        </div>

        {/* Alumni Feed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alumniPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-200"
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-gray-900 to-gray-700">
                <img
                  src={post.thumbnail}
                  alt={post.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-[#1A0A00] ml-1" fill="currentColor" />
                  </button>
                </div>

                {/* Duration Badge */}
                <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                  <span className="text-white text-xs font-semibold">{post.duration}</span>
                </div>

                {/* User Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {/* User Profile */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FD7E14] to-[#1A0A00] flex items-center justify-center text-2xl flex-shrink-0">
                      {post.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white mb-1">{post.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-white/90">
                        <GraduationCap className="w-3 h-3" />
                        <span className="truncate">{post.university}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/80">
                        <MapPin className="w-3 h-3" />
                        <span>{post.country}</span>
                      </div>
                    </div>
                  </div>

                  {/* Caption */}
                  <p className="text-sm text-white/95 mb-4 line-clamp-2">
                    {post.caption}
                  </p>

                  {/* Engagement Stats */}
                  <div className="flex items-center gap-6 text-white/90">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className="flex items-center gap-2 hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all ${
                          likedPosts.includes(post.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-white'
                        }`}
                      />
                      <span className="text-sm font-semibold">
                        {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
                      </span>
                    </button>
                    <button className="flex items-center gap-2 hover:scale-110 transition-transform">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-semibold">{post.comments}</span>
                    </button>
                    <button className="ml-auto hover:scale-110 transition-transform">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white">
                <p className="text-xs text-[#1A0A00]/60 text-center">
                  Posted {post.posted}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View More Button */}
        <div className="text-center mt-12">
          <button className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
            View All Partner Highlights
          </button>
        </div>

        {/* Stats Banner */}
        <div className="mt-16 grid grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-[#FD7E14] mb-2">100+</div>
            <div className="text-sm text-[#1A0A00]/70">Partner Universities</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-[#FD7E14] mb-2">45+</div>
            <div className="text-sm text-[#1A0A00]/70">Countries Covered</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-[#FD7E14] mb-2">600+</div>
            <div className="text-sm text-[#1A0A00]/70">Channel Partners</div>
          </div>
        </div>
      </div>
    </section>
  );
}