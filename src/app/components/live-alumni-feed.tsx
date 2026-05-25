import { useState } from 'react';
import { Play, Heart, MessageCircle, Share2, MapPin, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

const alumniPosts = [
  {
    id: 1,
    name: 'Priya Sharma',
    university: 'Stanford University',
    country: 'USA',
    avatar: '👩‍🎓',
    thumbnail: 'https://images.unsplash.com/photo-1663049964372-05a2e9f0998c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbWVyaWNhbiUyMHVuaXZlcnNpdHl8ZW58MXx8fHwxNzY4MTM4NTY3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Day in the life at Stanford! The campus is absolutely stunning 🌟',
    likes: 234,
    comments: 45,
    duration: '0:15',
    posted: '2 hours ago',
  },
  {
    id: 2,
    name: 'Rahul Gupta',
    university: 'Oxford University',
    country: 'UK',
    avatar: '👨‍🎓',
    thumbnail: 'https://images.unsplash.com/photo-1627131715233-480b34985c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb25kb24lMjB1bml2ZXJzaXR5fGVufDF8fHx8MTc2ODEzODU2Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Finals week at Oxford! The libraries here are magical ✨📚',
    likes: 189,
    comments: 32,
    duration: '0:12',
    posted: '5 hours ago',
  },
  {
    id: 3,
    name: 'Ananya Singh',
    university: 'University of Toronto',
    country: 'Canada',
    avatar: '👩‍💼',
    thumbnail: 'https://images.unsplash.com/photo-1618255630366-f402c45736f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW5hZGlhbiUyMGNhbXB1c3xlbnwxfHx8fDE3NjgxMzg1NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'First snow at UofT! Can\'t believe this is my campus now ❄️',
    likes: 312,
    comments: 58,
    duration: '0:14',
    posted: '1 day ago',
  },
  {
    id: 4,
    name: 'Arjun Patel',
    university: 'TU Munich',
    country: 'Germany',
    avatar: '👨‍💻',
    thumbnail: 'https://images.unsplash.com/photo-1760131556605-7f2e63d00385?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1bml2ZXJzaXR5JTIwY2FtcHVzfGVufDF8fHx8MTc2ODEzODU2NHww&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Engineering lab tour! The facilities here are world-class 🔬',
    likes: 267,
    comments: 41,
    duration: '0:13',
    posted: '3 hours ago',
  },
  {
    id: 5,
    name: 'Kavya Reddy',
    university: 'University of Melbourne',
    country: 'Australia',
    avatar: '👩‍🔬',
    thumbnail: 'https://images.unsplash.com/photo-1683319598210-d70486f2f996?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBzdHVkeWluZ3xlbnwxfHx8fDE3NjgwODU5MDl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Study group sessions by the beach! Best decision ever 🏖️',
    likes: 423,
    comments: 67,
    duration: '0:16',
    posted: '6 hours ago',
  },
  {
    id: 6,
    name: 'Vikram Mehta',
    university: 'MIT',
    country: 'USA',
    avatar: '👨‍🚀',
    thumbnail: 'https://images.unsplash.com/photo-1623461487986-9400110de28e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFkdWF0aW9uJTIwY2VyZW1vbnl8ZW58MXx8fHwxNzY4MDcwMjYxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Robotics competition prep! Dream come true moment 🤖',
    likes: 198,
    comments: 29,
    duration: '0:11',
    posted: '8 hours ago',
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
            <span className="text-sm text-orange-600 font-semibold">Live from Campus</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A0A00] mb-4">
            See Life Through Our Students' Eyes
          </h2>
          <p className="text-lg text-[#1A0A00]/70 max-w-2xl mx-auto">
            Real stories, real experiences from students currently studying abroad
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
            View All Alumni Stories
          </button>
        </div>

        {/* Stats Banner */}
        <div className="mt-16 grid grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-[#FD7E14] mb-2">2.5K+</div>
            <div className="text-sm text-[#1A0A00]/70">Alumni Videos</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-[#FD7E14] mb-2">50+</div>
            <div className="text-sm text-[#1A0A00]/70">Universities Featured</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-[#FD7E14] mb-2">100K+</div>
            <div className="text-sm text-[#1A0A00]/70">Community Members</div>
          </div>
        </div>
      </div>
    </section>
  );
}
