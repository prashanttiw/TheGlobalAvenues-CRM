import { motion } from 'motion/react';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const BLOG_POSTS = [
  {
    id: 1,
    title: 'FH Kufstein Tirol: Applied Sciences Pathways in Austria',
    excerpt: 'A snapshot of English-taught routes in AI, data science, sustainability, business, and event management.',
    image: '/universities/fh-kufstein-tirol-hero.webp',
    date: 'May 2026',
    author: 'The Global Avenues',
    category: 'Partner Portfolio',
  },
  {
    id: 2,
    title: 'EUAS: Business, IT and Design Programs in Tallinn',
    excerpt: 'Explore Estonia-based applied sciences options inside Tallinn innovation and entrepreneurship ecosystem.',
    image: '/universities/euas-hero.jpg',
    date: 'May 2026',
    author: 'The Global Avenues',
    category: 'Partner Portfolio',
  },
  {
    id: 3,
    title: 'ICN Business School and European Business Routes',
    excerpt: 'Understand multi-campus business education options available through The Global Avenues portfolio.',
    image: '/universities/icn-business-school-hero.png',
    date: 'May 2026',
    author: 'The Global Avenues',
    category: 'Business Education',
  },
];

export function BlogPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-[#1A0A00] to-[#2D1200] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, #FD7E14 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Insights & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FD7E14] to-[#FFC107]">Updates</span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Read verified partner updates, program highlights, and student recruitment insights from The Global Avenues.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(253,126,20,0.08)] border border-[#FD7E14]/10 group hover:shadow-[0_8px_30px_rgba(253,126,20,0.15)] transition-all"
              >
                <div className="relative h-48 overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-[#FD7E14] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {post.category}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 text-xs text-[#666] mb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {post.author}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#333] mb-3 group-hover:text-[#FD7E14] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-[#666] mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <Link
                    to="/blog"
                    className="inline-flex items-center gap-2 text-[#FD7E14] font-semibold hover:gap-3 transition-all"
                  >
                    Read Full Article <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}