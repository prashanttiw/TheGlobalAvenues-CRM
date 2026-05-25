import { useState } from 'react';
import { MessageCircle, X, HelpCircle, Phone, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SupportFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      icon: HelpCircle,
      label: 'Quick FAQ',
      description: 'AI-driven answers',
      color: 'from-[#FF9800] to-[#FF6F00]',
      action: () => alert('Opening AI FAQ...'),
    },
    {
      icon: Send,
      label: 'Instant WhatsApp',
      description: 'Direct WhatsApp link',
      color: 'from-[#4CAF50] to-[#388E3C]',
      notification: true,
      action: () => window.open('https://wa.me/1234567890', '_blank'),
    },
    {
      icon: Phone,
      label: 'Schedule Zoom',
      description: 'Book 15-min call',
      color: 'from-[#FD7E14] to-[#FF8C42]',
      action: () => alert('Opening scheduler...'),
    },
    {
      icon: AlertCircle,
      label: 'Emergency Visa Help',
      description: 'Urgent support',
      color: 'from-[#D32F2F] to-[#FF5722]',
      action: () => alert('Connecting to emergency support...'),
    },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 space-y-3"
          >
            {options.map((option, index) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={option.action}
                  whileHover={{ scale: 1.05, x: -8 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-[0_8px_24px_rgba(253,126,20,0.2)] hover:shadow-[0_12px_32px_rgba(253,126,20,0.3)] transition-all border border-[#FD7E14]/20 hover:border-[#FFC107] group min-w-[280px]"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-[0_4px_12px_rgba(253,126,20,0.3)]`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-[#222222] group-hover:text-[#FD7E14] transition-colors">
                      {option.label}
                    </div>
                    <div className="text-xs text-[#666666]">
                      {option.description}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D32F2F] to-[#FF5722] flex items-center justify-center shadow-[0_8px_24px_rgba(211,47,47,0.4)] hover:shadow-[0_12px_32px_rgba(211,47,47,0.5)] transition-all group relative"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-7 h-7 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse Animation */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#FD7E14] animate-ping opacity-30" />
        )}

        {/* Notification Badge */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFC107] rounded-full flex items-center justify-center text-[#333333] text-xs font-bold border-2 border-white shadow-[0_0_12px_rgba(255,193,7,0.5)]">
            1
          </span>
        )}
      </motion.button>

      {/* Tooltip */}
      {!isOpen && (
        <motion.div
          className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-[#222222] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-[0_4px_16px_rgba(0,0,0,0.2)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          initial={{ opacity: 0, y: 5 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          Need Help? Chat with us!
          <div className="absolute top-full right-6 -mt-1">
            <div className="w-2 h-2 bg-[#222222] transform rotate-45" />
          </div>
        </motion.div>
      )}
    </div>
  );
}