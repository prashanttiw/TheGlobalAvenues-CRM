import { useMemo, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  BookOpenCheck,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Users2,
  X,
} from 'lucide-react';
import { useStore } from '../hooks/useStore';

type InternalRole = 'counsellor' | 'visa_officer' | 'admin' | 'super_admin';

type MenuItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: InternalRole[];
};

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Operations Overview',
    href: '/portal/admin',
    icon: LayoutDashboard,
    roles: ['counsellor', 'visa_officer', 'admin', 'super_admin'],
  },
  {
    label: 'Pipeline Control',
    href: '/portal/admin/pipeline',
    icon: ClipboardList,
    roles: ['counsellor', 'visa_officer', 'admin', 'super_admin'],
  },
  {
    label: 'Users & Agents',
    href: '/portal/admin/users',
    icon: Users2,
    roles: ['counsellor', 'admin', 'super_admin'],
  },
  {
    label: 'Document Queue',
    href: '/portal/admin/documents',
    icon: Briefcase,
    roles: ['visa_officer', 'admin', 'super_admin'],
  },
  {
    label: 'University Catalog',
    href: '/portal/admin/universities',
    icon: BookOpenCheck,
    roles: ['counsellor', 'admin', 'super_admin'],
  },
  {
    label: 'Audit Trail',
    href: '/portal/admin/audit',
    icon: ShieldCheck,
    roles: ['admin', 'super_admin'],
  },
];

export function AdminLayout() {
  const currentUser = useStore((state) => state.currentUser);
  const logout = useStore((state) => state.logout);
  const notifications = useStore((state) => state.notifications);
  const markNotificationRead = useStore((state) => state.markNotificationRead);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (!currentUser) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  if (!['counsellor', 'visa_officer', 'admin', 'super_admin'].includes(currentUser.role)) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-red-100 flex flex-col items-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
          <h1 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500 mb-6">
            This internal portal is reserved for authorised TGA operations staff.
          </p>
          <button
            onClick={() => {
              logout();
              navigate('/portal/login');
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-[#2D1B69] to-[#C94D1B] text-white rounded-xl font-bold shadow-lg"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const role = currentUser.role as InternalRole;
  const menuItems = MENU_ITEMS.filter((item) => item.roles.includes(role));
  const activeLabel = menuItems.find((item) => item.href === location.pathname)?.label ?? 'Operations Overview';
  const unreadNotifications = notifications.filter((item) => item.userId === currentUser.id && !item.readAt).length;

  const roleMeta = useMemo(() => {
    if (role === 'super_admin') {
      return { label: 'Super Admin', badge: 'Governance', accent: 'text-[#FFD700]' };
    }

    if (role === 'admin') {
      return { label: 'Admin', badge: 'Operations', accent: 'text-[#FFD700]' };
    }

    if (role === 'visa_officer') {
      return { label: 'Visa Officer', badge: 'Compliance', accent: 'text-blue-300' };
    }

    return { label: 'Counsellor', badge: 'Admissions', accent: 'text-green-300' };
  }, [role]);

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex text-[#222]">
      <aside className="hidden lg:flex flex-col w-72 bg-[#0F0B1F] text-white shrink-0 shadow-2xl relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />

        <div className="p-6 border-b border-white/5 flex items-center gap-3 relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#2D1B69] to-[#FFD700] flex items-center justify-center shadow-lg border border-white/10">
              <ShieldCheck className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-white leading-none">TGA COMMAND</div>
              <div className="text-[10px] font-bold text-white/60 mt-1 uppercase tracking-[0.22em]">
                {roleMeta.badge}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 relative z-10">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2D1B69] to-[#3B2B85] text-white border border-[#FFD700]/30 shadow-[0_8px_24px_rgba(45,27,105,0.4)] scale-[1.01]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#FFD700]' : 'text-white/40'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 relative z-10 bg-black/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-extrabold text-[#FFD700]">
              {currentUser.firstName.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black truncate">
                {currentUser.firstName} {currentUser.lastName}
              </div>
              <div className={`text-[10px] truncate mt-0.5 font-bold uppercase tracking-[0.18em] ${roleMeta.accent}`}>
                {roleMeta.label}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white/90 rounded-xl text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebar(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="hidden sm:block text-base font-bold text-gray-800 tracking-tight">{activeLabel}</h1>
              <p className="hidden sm:block text-[11px] text-gray-400 uppercase tracking-[0.18em] mt-0.5">
                {roleMeta.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-[#2D1B69] hover:bg-gray-50 rounded-xl transition-all relative cursor-pointer"
            >
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          <Outlet />
        </main>
      </div>

      {mobileSidebar && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div onClick={() => setMobileSidebar(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

          <div className="relative flex flex-col w-72 max-w-[82vw] bg-[#0F0B1F] text-white z-10">
            <button
              onClick={() => setMobileSidebar(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2D1B69] to-[#FFD700] flex items-center justify-center shadow-lg border border-white/10">
                  <ShieldCheck className="w-4.5 h-4.5 text-[#FFD700]" />
                </div>
                <div>
                  <div className="font-extrabold text-sm tracking-tight text-white leading-none">TGA COMMAND</div>
                  <div className="text-[10px] font-bold text-white/60 mt-1 uppercase tracking-[0.22em]">
                    {roleMeta.badge}
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5">
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
                        ? 'bg-gradient-to-r from-[#2D1B69] to-[#3B2B85] text-white border border-[#FFD700]/30 shadow-lg'
                        : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#FFD700]' : 'text-white/40'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/5 bg-black/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-extrabold text-[#FFD700]">
                  {currentUser.firstName.slice(0, 1)}
                </div>
                <div>
                  <div className="text-xs font-black">
                    {currentUser.firstName} {currentUser.lastName}
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${roleMeta.accent}`}>
                    {roleMeta.label}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 border border-white/10 bg-white/5 text-white/90 rounded-xl text-xs font-bold"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

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
  markRead,
}: {
  show: boolean;
  onClose: () => void;
  userId: string;
  notifications: any[];
  markRead: (id: string) => void;
}) {
  const myNotifications = notifications.filter((item) => item.userId === userId);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-80 bg-white shadow-2xl h-full z-10 flex flex-col border-l border-gray-200 text-[#222]"
          >
            <div className="p-5 bg-[#0F0B1F] text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm">Internal Alerts</h3>
                <p className="text-[10px] text-white/70">Portal-side notifications</p>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {myNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.readAt) {
                      markRead(notification.id);
                    }
                  }}
                  className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${
                    notification.readAt
                      ? 'border-gray-100 bg-gray-50 text-gray-450'
                      : 'border-purple-100 bg-purple-50/30 text-gray-800 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-extrabold text-[11px] leading-tight text-gray-900">{notification.title}</div>
                    {!notification.readAt && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0 mt-1" />}
                  </div>
                  <div className="text-[10px] text-gray-500 leading-normal">{notification.message}</div>
                  <div className="text-[8px] text-gray-400 font-bold mt-2 font-mono">
                    {new Date(notification.createdAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
