import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { 
  LayoutDashboard, Users, GitMerge, DollarSign, LogOut, Menu, X, 
  Globe, Bell, Sparkles, Award, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AgentLayout() {
  const currentUser = useStore((state) => state.currentUser);
  const logout = useStore((state) => state.logout);
  const agents = useStore((state) => state.agents);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = useStore((state) => state.notifications);
  const markNotificationRead = useStore((state) => state.markNotificationRead);

  // RBAC safety check: Redirect to login if user is not authenticated or not authorized
  if (!currentUser) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  if (currentUser.role !== 'agent' && currentUser.role !== 'sub_agent') {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-red-100 flex flex-col items-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
          <h1 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500 mb-6">You do not have access rights to the Partner portal. Please log in with an authorized partner account.</p>
          <button onClick={() => { logout(); navigate('/portal/login'); }} className="px-6 py-2.5 bg-gradient-to-r from-[#2D1B69] to-[#C94D1B] text-white rounded-xl font-bold shadow-lg">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const agentData = agents.find((a) => a.userId === currentUser.id) || agents[0];

  const menuItems = [
    { label: 'Overview', href: '/portal/agent', icon: LayoutDashboard },
    { label: 'Student Leads', href: '/portal/agent/leads', icon: Users },
    { label: 'Application Pipeline', href: '/portal/agent/pipeline', icon: GitMerge },
    { label: 'Commissions', href: '/portal/agent/commissions', icon: DollarSign },
  ];

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const getTierIconAndColor = (tier: string) => {
    if (tier === 'gold') return { icon: Sparkles, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', label: 'Gold Partner' };
    if (tier === 'silver') return { icon: Award, color: 'text-slate-300 bg-slate-300/10 border-slate-300/20', label: 'Silver Partner' };
    return { icon: Award, color: 'text-amber-600 bg-amber-600/10 border-amber-600/20', label: 'Bronze Partner' };
  };

  const tier = getTierIconAndColor(agentData.tier);
  const TierIcon = tier.icon;

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex text-[#222]">
      
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#2D1B69] text-white shrink-0 shadow-2xl relative overflow-hidden">
        {/* Subtle mesh background grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3 relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#FFD700] flex items-center justify-center shadow-lg">
              <Globe className="w-4.5 h-4.5 text-[#2D1B69]" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight leading-none text-white">The Global Avenues</div>
              <div className="text-[10px] font-bold text-[#FFD700] mt-0.5 tracking-wider uppercase">Partner Portal</div>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1 relative z-10">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  isActive 
                    ? 'bg-[#FFD700] text-[#2D1B69] shadow-[0_8px_20px_rgba(255,215,0,0.25)] scale-[1.01]' 
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#2D1B69]' : 'text-white/60'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer profile segment */}
        <div className="p-4 border-t border-white/10 relative z-10 bg-black/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-extrabold text-white">
              {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black truncate">{currentUser.firstName} {currentUser.lastName}</div>
              <div className="text-[10px] text-white/50 truncate mt-0.5">{agentData.agencyName}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 border border-white/15 bg-white/5 hover:bg-white/10 text-white/90 rounded-xl text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      {/* ── Main Panel Workspace ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top navbar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger trigger for mobile */}
            <button 
              onClick={() => setMobileSidebar(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="hidden sm:block text-base font-bold text-gray-800 tracking-tight">
              {menuItems.find((item) => item.href === location.pathname)?.label || 'Overview'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Partner Level Tier Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black shadow-sm ${tier.color}`}>
              <TierIcon className="w-3.5 h-3.5" />
              <span>{tier.label}</span>
            </div>

            {/* Notification triggers */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-[#2D1B69] hover:bg-gray-50 rounded-xl transition-all relative cursor-pointer"
            >
              {notifications.filter(n => n.userId === currentUser.id && !n.readAt).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileSidebar && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setMobileSidebar(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Sidebar panel */}
          <div className="relative flex flex-col w-72 max-w-[80vw] bg-[#2D1B69] text-white z-10">
            <button 
              onClick={() => setMobileSidebar(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#FFD700] flex items-center justify-center shadow-lg">
                  <Globe className="w-4.5 h-4.5 text-[#2D1B69]" />
                </div>
                <div>
                  <div className="font-extrabold text-sm tracking-tight text-white leading-none">The Global Avenues</div>
                  <div className="text-[10px] font-bold text-[#FFD700] mt-0.5 uppercase">Partner Portal</div>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileSidebar(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                      isActive 
                        ? 'bg-[#FFD700] text-[#2D1B69] shadow-lg' 
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#2D1B69]' : 'text-white/60'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/10 bg-black/15">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-extrabold text-white">
                  {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-black">{currentUser.firstName} {currentUser.lastName}</div>
                  <div className="text-[10px] text-white/50">{agentData.agencyName}</div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 border border-white/15 bg-white/5 text-white/90 rounded-xl text-xs font-bold"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Notifications Drawer */}
      <NotificationsDrawer 
        show={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        userId={currentUser.id} 
        notifications={notifications} 
        markRead={markNotificationRead} 
      />
    </div>
  );
}

function NotificationsDrawer({ 
  show, 
  onClose, 
  userId, 
  notifications, 
  markRead 
}: { 
  show: boolean; 
  onClose: () => void; 
  userId: string; 
  notifications: any[]; 
  markRead: (id: string) => void;
}) {
  const myNotifications = notifications.filter(n => n.userId === userId);
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />
          
          {/* Slider Drawer Panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-80 bg-white shadow-2xl h-full z-10 flex flex-col border-l border-gray-200"
          >
            {/* Header */}
            <div className="p-5 bg-[#2D1B69] text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm">Notifications</h3>
                <p className="text-[10px] text-white/70">TGA System Alerts</p>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {myNotifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => { if (!n.readAt) markRead(n.id); }}
                  className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${
                    n.readAt 
                      ? 'border-gray-100 bg-gray-50 text-gray-450'
                      : 'border-purple-100 bg-purple-50/30 text-gray-800 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-extrabold text-[11px] leading-tight text-gray-900">{n.title}</div>
                    {!n.readAt && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 leading-normal">{n.message}</div>
                  <div className="text-[8px] text-gray-400 font-bold mt-2 font-mono">
                    {new Date(n.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {myNotifications.length === 0 && (
                <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center">
                  <Bell className="w-8 h-8 text-gray-300 mb-2" />
                  <span className="text-xs font-bold">No active notifications</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
