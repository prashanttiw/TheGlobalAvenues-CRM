import { motion } from 'motion/react';
import { LayoutDashboard, Users, GraduationCap, DollarSign, PieChart, Bell, LogOut, ChevronRight, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AgentDashboardPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1A0A00] text-white hidden lg:flex flex-col sticky top-0 h-screen pt-24 pb-6">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] flex items-center justify-center font-bold text-xl">
            E
          </div>
          <div>
            <div className="font-bold">The Global Avenues</div>
            <div className="text-xs text-[#999]">Agent ID: AGN-8820</div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#FD7E14] text-white rounded-xl font-semibold transition-colors shadow-lg">
            <LayoutDashboard className="w-5 h-5" /> Overview
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl font-medium transition-colors">
            <Users className="w-5 h-5" /> My Students
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl font-medium transition-colors">
            <GraduationCap className="w-5 h-5" /> Applications
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl font-medium transition-colors">
            <DollarSign className="w-5 h-5" /> Commissions
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl font-medium transition-colors">
            <PieChart className="w-5 h-5" /> Analytics
          </a>
        </nav>

        <div className="px-4 mt-auto">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-white/50 hover:text-red-400 rounded-xl font-medium transition-colors">
            <LogOut className="w-5 h-5" /> Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-12 px-6 lg:px-12 max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#333] mb-2">Partner Dashboard</h1>
            <p className="text-[#666]">Overview of your pipeline and commissions.</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-[#eee] flex items-center justify-center text-[#666] hover:text-[#FD7E14] hover:border-[#FD7E14]/30 transition-all shadow-sm">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eee]">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-[#666] font-medium">Total Students</span>
            </div>
            <div className="text-3xl font-bold text-[#333]">42</div>
            <div className="text-xs text-green-500 mt-2 font-semibold">↑ 12% this month</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eee]">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-5 h-5 text-orange-500" />
              <span className="text-[#666] font-medium">Active Applications</span>
            </div>
            <div className="text-3xl font-bold text-[#333]">18</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eee]">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-5 h-5 text-green-500" />
              <span className="text-[#666] font-medium">Offers Received</span>
            </div>
            <div className="text-3xl font-bold text-[#333]">24</div>
          </div>
          <div className="bg-gradient-to-br from-[#1A0A00] to-[#2D1200] p-6 rounded-2xl shadow-lg text-white border border-[#FD7E14]/20">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-[#FFC107]" />
              <span className="text-white/80 font-medium">Pending Commission</span>
            </div>
            <div className="text-3xl font-bold text-[#FFC107]">₹4,50,000</div>
          </div>
        </div>

        {/* Pipeline Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden">
          <div className="p-6 border-b border-[#eee] flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#333]">Recent Applications Pipeline</h2>
            <button className="text-sm font-semibold text-[#FD7E14] bg-[#FD7E14]/10 px-4 py-2 rounded-lg hover:bg-[#FD7E14]/20 transition-colors">
              + New Student Lead
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#666] text-sm">
                  <th className="p-4 font-medium">Student Name</th>
                  <th className="p-4 font-medium">University</th>
                  <th className="p-4 font-medium">Course</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-[#333] divide-y divide-[#eee]">
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="p-4 font-semibold">Ananya Sharma</td>
                  <td className="p-4">FH Kufstein Tirol</td>
                  <td className="p-4 text-[#666]">MSc Data Science and Intelligence Analytics</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Awaiting Decision</span>
                  </td>
                  <td className="p-4"><button className="text-[#FD7E14] hover:underline">View</button></td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="p-4 font-semibold">Rohit Verma</td>
                  <td className="p-4">EUAS</td>
                  <td className="p-4 text-[#666]">International Business Administration</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Offer Received</span>
                  </td>
                  <td className="p-4"><button className="text-[#FD7E14] hover:underline">View</button></td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="p-4 font-semibold">Meera Kapoor</td>
                  <td className="p-4">ICN Business School</td>
                  <td className="p-4 text-[#666]">International Business Studies</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Docs Verification</span>
                  </td>
                  <td className="p-4"><button className="text-[#FD7E14] hover:underline">View</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-[#eee] text-center">
            <button className="text-sm font-semibold text-[#666] hover:text-[#FD7E14]">View All Students</button>
          </div>
        </div>
      </main>
    </div>
  );
}