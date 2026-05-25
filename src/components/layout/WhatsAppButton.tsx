import { useState } from 'react';
import { X, MessageCircle, Phone, HelpCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COMPANY } from '@/data/company';

export function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      icon: Send,
      label: 'WhatsApp Us',
      description: 'Chat instantly',
      color: 'from-[#25D366] to-[#128C7E]',
      action: () => window.open(`https://wa.me/${COMPANY.whatsapp}?text=Hi%2C%20I%20want%20to%20know%20more%20about%20study%20abroad%20options.`, '_blank'),
    },
    {
      icon: Phone,
      label: 'Call Us',
      description: COMPANY.phone,
      color: 'from-[#FD7E14] to-[#C94D1B]',
      action: () => window.open(`tel:${COMPANY.phone}`, '_self'),
    },
    {
      icon: HelpCircle,
      label: 'Book Counselling',
      description: 'Free 30-min session',
      color: 'from-[#D32F2F] to-[#FF5722]',
      action: () => window.location.href = '/contact',
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="flex flex-col gap-2"
          >
            {options.map((opt, i) => {
              const Icon = opt.icon;
              return (
                <motion.button
                  key={opt.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={opt.action}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(253,126,20,0.2)] border border-[#FD7E14]/10 hover:border-[#FD7E14]/30 transition-all group min-w-[220px]"
                  whileHover={{ x: -4 }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-[#333] group-hover:text-[#FD7E14] transition-colors">{opt.label}</div>
                    <div className="text-xs text-[#999]">{opt.description}</div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-[0_8px_24px_rgba(37,211,102,0.45)] hover:shadow-[0_12px_32px_rgba(37,211,102,0.6)] transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Contact support"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />}
      </motion.button>
    </div>
  );
}
