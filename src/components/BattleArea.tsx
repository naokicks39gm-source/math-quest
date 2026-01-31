"use client";

import { motion } from "framer-motion";

type BattleAreaProps = {
  attackKey: number;
};

export default function BattleArea({ attackKey }: BattleAreaProps) {
  return (
    <div className="w-full border-4 border-red-500 rounded-2xl bg-red-50/40 p-4">
      <div className="relative h-28 flex items-center justify-between px-6">
        <motion.div
          key={attackKey}
          className="w-16 h-16"
          animate={{ x: [0, 18, 0] }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <circle cx="20" cy="16" r="8" fill="#4f46e5" />
            <rect x="16" y="24" width="12" height="24" rx="4" fill="#4338ca" />
            <rect x="10" y="34" width="20" height="6" rx="3" fill="#1e1b4b" />
            <rect x="30" y="30" width="20" height="4" rx="2" fill="#0f172a" />
          </svg>
        </motion.div>

        <motion.div
          key={attackKey}
          className="absolute left-1/2 -translate-x-1/2 w-16 h-16"
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.1, 0.9], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <path d="M8 36 L56 8 L40 56 Z" fill="#ef4444" opacity="0.85" />
          </svg>
        </motion.div>

        <motion.div
          key={attackKey}
          className="w-16 h-16"
          animate={{ x: [0, 8, 0], rotate: [0, -6, 0] }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <circle cx="42" cy="20" r="10" fill="#16a34a" />
            <rect x="32" y="28" width="20" height="20" rx="6" fill="#15803d" />
            <circle cx="38" cy="18" r="2" fill="#0f172a" />
            <circle cx="46" cy="18" r="2" fill="#0f172a" />
            <path d="M38 24 Q42 28 46 24" stroke="#0f172a" strokeWidth="2" fill="none" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
