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
              Partner Portfolio
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#333] mb-6 leading-tight">
              FH Kufstein Tirol: Applied Sciences Pathways in Austria
            </h1>
            <div className="flex items-center justify-between py-6 border-y border-[#eee] mb-8">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-[#666]">
                  <Calendar className="w-4 h-4" /> May 2026
                </div>
                <div className="flex items-center gap-2 text-sm text-[#666]">
                  <User className="w-4 h-4" /> The Global Avenues
                </div>
              </div>
              <button className="flex items-center gap-2 text-[#FD7E14] hover:bg-[#FD7E14]/10 px-3 py-1.5 rounded-lg transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden mb-12 shadow-xl">
            <img
              src="/universities/fh-kufstein-tirol-hero.webp"
              alt="FH Kufstein Tirol campus"
              className="w-full h-[400px] object-cover"
            />
          </div>

          <div className="prose prose-lg max-w-none text-[#555]">
            <p className="lead text-xl text-[#333] font-medium mb-8">
              FH Kufstein Tirol is one of The Global Avenues' featured applied sciences partners in Austria, with programs that connect practical learning, innovation, and European career exposure.
            </p>

            <h2 className="text-2xl font-bold text-[#333] mb-4 mt-8">Programs Students Can Explore</h2>
            <p className="mb-6">
              The portfolio includes pathways in drone engineering and AI-based innovation, data science and intelligence analytics, energy and sustainability management, international business studies, smart products, and sports, culture and event management.
            </p>

            <h2 className="text-2xl font-bold text-[#333] mb-4 mt-8">Why Austria Fits This Portfolio</h2>
            <p className="mb-6">
              Austria offers a central European location, applied learning models, and strong quality-of-life advantages for students seeking practical international education.
            </p>

            <div className="bg-[#FD7E14]/10 p-8 rounded-2xl border border-[#FD7E14]/20 my-10 italic text-[#1A0A00] font-medium text-lg">
              "The right partner institution is not just a name. It is a fit between academic profile, career goals, budget, and long-term mobility."
            </div>

            <h2 className="text-2xl font-bold text-[#333] mb-4 mt-8">How The Global Avenues Supports Students</h2>
            <p className="mb-6">
              Students and channel partners can use the CRM portal to track documentation, application progress, and communication around verified partner institutions.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
