import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { 
  useNotifications, 
  useUnreadCount, 
  useMarkRead, 
  useMarkReadAll 
} from '../hooks/useNotifications';
import { Bell, X, Check, CheckCircle2, FileText, Send, CreditCard, ShieldCheck, Settings } from 'lucide-react';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'documents', label: 'Documents' },
  { id: 'applications', label: 'Applications' },
  { id: 'payments', label: 'Payments' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'system', label: 'System' }
];

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'documents': return <FileText className="w-4 h-4 text-blue-500" />;
    case 'applications': return <Send className="w-4 h-4 text-purple-500" />;
    case 'payments': return <CreditCard className="w-4 h-4 text-green-500" />;
    case 'approvals': return <ShieldCheck className="w-4 h-4 text-amber-500" />;
    case 'system': return <Settings className="w-4 h-4 text-gray-500" />;
    default: return <Bell className="w-4 h-4 text-gray-400" />;
  }
};

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  
  const { data: unreadData } = useUnreadCount();
  const { data: notifications, isLoading } = useNotifications(activeCategory);
  const markRead = useMarkRead();
  const markReadAll = useMarkReadAll();

  const totalUnread = unreadData?.count || 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors dark:text-gray-300 dark:hover:bg-gray-800">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <motion.span 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }}
              className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </motion.span>
          )}
        </button>
      </Dialog.Trigger>

      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            
            <Dialog.Content asChild>
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-100 dark:border-gray-800 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => markReadAll.mutate(activeCategory)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      Mark all as read
                    </button>
                    <Dialog.Close asChild>
                      <button className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto px-4 py-2 border-b border-gray-100 dark:border-gray-800 scrollbar-hide">
                  <div className="flex gap-2">
                    {CATEGORIES.map((cat) => {
                      const isActive = activeCategory === cat.id;
                      const badgeCount = cat.id === '' 
                        ? totalUnread 
                        : unreadData?.by_category?.[cat.id] || 0;

                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className={`
                            relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200
                            ${isActive 
                              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm' 
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }
                          `}
                        >
                          {cat.label}
                          {badgeCount > 0 && (
                            <span className={`
                              flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] rounded-full
                              ${isActive 
                                ? 'bg-white/20 text-white dark:bg-black/10 dark:text-gray-900' 
                                : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                              }
                            `}>
                              {badgeCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                  {isLoading ? (
                    <div className="flex justify-center p-8">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : notifications?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
                      <Bell className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-700" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">All caught up!</p>
                      <p className="text-xs mt-1">You have no notifications in this category.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notifications?.map((notif: any) => (
                        <div 
                          key={notif.public_id}
                          className={`
                            relative group flex items-start gap-3 p-3 rounded-xl transition-all duration-200
                            ${!notif.read_at 
                              ? 'bg-blue-50/50 dark:bg-blue-900/10' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }
                          `}
                        >
                          <div className={`
                            flex-shrink-0 mt-0.5 p-2 rounded-full
                            ${!notif.read_at ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-100 dark:bg-gray-800'}
                          `}>
                            <CategoryIcon category={notif.category} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notif.read_at ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                              {notif.subject}
                            </p>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {notif.body?.split('\n').map((line: string, i: number) => (
                                <React.Fragment key={i}>
                                  {line}
                                  {i !== notif.body.split('\n').length - 1 && <br />}
                                </React.Fragment>
                              ))}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                              {new Date(notif.created_at).toLocaleString(undefined, { 
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                              })}
                            </p>
                          </div>

                          {!notif.read_at && (
                            <button
                              onClick={() => markRead.mutate(notif.public_id)}
                              className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 text-blue-600 hover:bg-blue-100 rounded-full transition-all dark:text-blue-400 dark:hover:bg-blue-900/50"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {!notif.read_at && (
                            <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full group-hover:opacity-0 transition-opacity"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
