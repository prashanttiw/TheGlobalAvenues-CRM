import { motion } from 'motion/react';
import { LayoutDashboard, FileText, GraduationCap, Clock, MessageSquare, Bell, User as UserIcon, CheckCircle2, ChevronRight, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StudentDashboardPreview } from '@/app/components/student-dashboard-preview';

export function StudentDashboardPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF5] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#FD7E14]/10 hidden lg:flex flex-col sticky top-0 h-screen pt-24 pb-6">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FD7E14]/10 flex items-center justify-center text-[#FD7E14] font-bold text-xl">
            S
          </div>
          <div>
            <div className="font-bold text-[#333]">Aarav Mehta</div>
            <div className="text-xs text-[#999]">Student ID: TGA-4921</div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#FD7E14]/10 text-[#FD7E14] rounded-xl font-semibold transition-colors">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#666] hover:bg-[#FFFCF5] hover:text-[#FD7E14] rounded-xl font-medium transition-colors">
            <GraduationCap className="w-5 h-5" /> Applications
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#666] hover:bg-[#FFFCF5] hover:text-[#FD7E14] rounded-xl font-medium transition-colors">
            <FileText className="w-5 h-5" /> Documents
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#666] hover:bg-[#FFFCF5] hover:text-[#FD7E14] rounded-xl font-medium transition-colors">
            <MessageSquare className="w-5 h-5" /> Messages <span className="ml-auto w-5 h-5 rounded-full bg-[#FD7E14] text-white text-[10px] flex items-center justify-center font-bold">2</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#666] hover:bg-[#FFFCF5] hover:text-[#FD7E14] rounded-xl font-medium transition-colors">
            <UserIcon className="w-5 h-5" /> Profile
          </a>
        </nav>

        <div className="px-4 mt-auto">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-[#999] hover:text-red-500 rounded-xl font-medium transition-colors">
            <LogOut className="w-5 h-5" /> Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-12 px-6 lg:px-12 max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#333] mb-2">Welcome back, Aarav!</h1>
            <p className="text-[#666]">Here's what's happening with your applications today.</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-[#eee] flex items-center justify-center text-[#666] hover:text-[#FD7E14] hover:border-[#FD7E14]/30 transition-all relative shadow-sm">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(253,126,20,0.06)] border border-[#FD7E14]/10">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-[#333]">3</span>
            </div>
            <div className="text-[#666] font-medium">Active Applications</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(253,126,20,0.06)] border border-[#FD7E14]/10">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-2xl font-bold text-[#333]">1</span>
            </div>
            <div className="text-[#666] font-medium">Pending Action</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(253,126,20,0.06)] border border-[#FD7E14]/10">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-[#333]">1</span>
            </div>
            <div className="text-[#666] font-medium">Offers Received</div>
          </div>
        </div>

        {/* Live Application Pulse Widget */}
        <div className="mb-10 rounded-3xl overflow-hidden shadow-xl border border-[#FD7E14]/20">
          <StudentDashboardPreview />
        </div>

        {/* Document Status */}
        <div className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgba(253,126,20,0.06)] border border-[#FD7E14]/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#333]">Document Vault</h2>
            <button className="text-sm font-semibold text-[#FD7E14] hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-[#eee] rounded-xl flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-500 bg-green-50 rounded-lg p-1" />
              <div>
                <div className="text-sm font-bold text-[#333]">Passport</div>
                <div className="text-xs text-green-600">Verified</div>
              </div>
            </div>
            <div className="p-4 border border-[#eee] rounded-xl flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-500 bg-green-50 rounded-lg p-1" />
              <div>
                <div className="text-sm font-bold text-[#333]">Transcripts</div>
                <div className="text-xs text-green-600">Verified</div>
              </div>
            </div>
            <div className="p-4 border border-[#eee] rounded-xl flex items-center gap-3">
              <FileText className="w-8 h-8 text-orange-500 bg-orange-50 rounded-lg p-1" />
              <div>
                <div className="text-sm font-bold text-[#333]">IELTS Score</div>
                <div className="text-xs text-orange-600">Pending Review</div>
              </div>
            </div>
            <div className="p-4 border border-dashed border-[#FD7E14] bg-[#FFFCF5] rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#FD7E14]/5 transition-colors">
              <span className="text-sm font-semibold text-[#FD7E14]">+ Upload SOP</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}