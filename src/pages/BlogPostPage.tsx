import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, User, ArrowLeft, Share2 } from 'lucide-react';

export function BlogPostPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <Link to="/blog" className="inline-flex items-center gap-2 text-[#FD7E14] font-semibold hover:gap-3 transition-all mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <span className="bg-[#FD7E14]/10 text-[#FD7E14] text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">
              Destinations
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#333] mb-6 leading-tight">
              Top 10 Emerging Tech Hubs for International Students in 2026
            </h1>
            <div className="flex items-center justify-between py-6 border-y border-[#eee] mb-8">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-[#666]">
                  <Calendar className="w-4 h-4" /> May 10, 2026
                </div>
                <div className="flex items-center gap-2 text-sm text-[#666]">
                  <User className="w-4 h-4" /> Neha Sharma
                </div>
              </div>
              <button className="flex items-center gap-2 text-[#FD7E14] hover:bg-[#FD7E14]/10 px-3 py-1.5 rounded-lg transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden mb-12 shadow-xl">
            <img 
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200" 
              alt="Tech Hubs" 
              className="w-full h-[400px] object-cover"
            />
          </div>

          <div className="prose prose-lg max-w-none text-[#555]">
            <p className="lead text-xl text-[#333] font-medium mb-8">
              The global tech landscape is shifting. While Silicon Valley remains a powerhouse, a new wave of emerging tech hubs across Europe, Asia, and Canada is drawing international students with competitive tuition, high-paying post-grad jobs, and fast-track PR pathways.
            </p>
            
            <h2 className="text-2xl font-bold text-[#333] mb-4 mt-8">1. Munich, Germany: The Deep Tech Pioneer</h2>
            <p className="mb-6">
              Known affectionately as "Isar Valley," Munich is rapidly becoming Europe's premier destination for Deep Tech and AI. With institutions like TU Munich leading the charge, international students benefit from virtually zero tuition fees and direct access to heavyweights like Siemens, BMW, and Apple's new European Silicon Design Center.
            </p>

            <h2 className="text-2xl font-bold text-[#333] mb-4 mt-8">2. Toronto, Canada: The AI Capital</h2>
            <p className="mb-6">
              Toronto's tech sector is growing faster than any other North American market. Fueled by generous government grants and an open immigration policy, the University of Toronto and Waterloo act as massive feeder schools to the booming local AI industry.
            </p>

            <div className="bg-[#FD7E14]/10 p-8 rounded-2xl border border-[#FD7E14]/20 my-10 italic text-[#1A0A00] font-medium text-lg">
              "The best tech destination isn't always the most famous one. It's the one that offers the best intersection of academic excellence, industry integration, and livability." — Neha Sharma, Senior Tech Counsellor
            </div>

            <h2 className="text-2xl font-bold text-[#333] mb-4 mt-8">3. Tallinn, Estonia: The Digital Society</h2>
            <p className="mb-6">
              Estonia is arguably the most digitally advanced society in the world. For students interested in cybersecurity and e-governance, Tallinn University of Technology offers incredibly forward-thinking programs. Plus, the startup ecosystem (birthplace of Skype and Wise) is notoriously welcoming to international talent.
            </p>
            
            <h3 className="text-xl font-bold text-[#333] mb-3 mt-8">Conclusion</h3>
            <p>
              When choosing where to study computer science or IT, looking beyond the traditional giants can yield incredible ROI. Whether it's the tuition-free landscape of Germany or the booming AI scene in Canada, your ideal tech hub is out there. 
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
