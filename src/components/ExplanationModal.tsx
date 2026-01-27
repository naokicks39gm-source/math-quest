import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type CharacterType = 'warrior' | 'mage';

interface ExplanationModalProps {
  val1: number;
  val2: number;
  character: CharacterType;
  onClose: () => void;
}

const CHAR_CONFIG = {
  warrior: {
    name: 'Warrior',
    emoji: '⚔️',
    colors: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      highlight: 'bg-red-100',
      button: 'bg-red-500 hover:bg-red-600'
    },
    dialogue: {
      intro: "Don't give up! Let's smash this problem with the Cherry Method!",
      step1: (v1: number, need: number) => `Look at ${v1}! We need ${need} more to make a strong 10!`,
      step2: (v2: number, need: number, rest: number) => `Split the ${v2}! Break it into ${need} and ${rest}!`,
      step3: (v1: number, need: number) => `Combine ${v1} and ${need} to forge a 10!`,
      step4: (total: number, rest: number) => `Now add the remaining ${rest}. 10 + ${rest} = ${total}! Victory!`,
    }
  },
  mage: {
    name: 'Mage',
    emoji: '🪄',
    colors: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      highlight: 'bg-blue-100',
      button: 'bg-blue-500 hover:bg-blue-600'
    },
    dialogue: {
      intro: "A calculation error. Let us analyze using the Cherry Method logic.",
      step1: (v1: number, need: number) => `First, observe ${v1}. It requires ${need} to complete the base 10.`,
      step2: (v2: number, need: number, rest: number) => `Deconstruct ${v2}. We separate it into ${need} and ${rest}.`,
      step3: (v1: number, need: number) => `Synthesize ${v1} and ${need}. This forms a perfect 10.`,
      step4: (total: number, rest: number) => `Finally, append the remaining ${rest}. 10 + ${rest} = ${total}. Logic prevails.`,
    }
  }
};

export default function ExplanationModal({ val1, val2, character, onClose }: ExplanationModalProps) {
  const [step, setStep] = useState(0);
  const config = CHAR_CONFIG[character];

  // Logic for Cherry Calculation
  // We want to make the Next Ten for val1.
  // e.g. 8 -> 10 (need 2). 18 -> 20 (need 2).
  // But typically Sakuranbo is taught with single digits or making the *nearest* 10.
  // Let's assume val1 is the base.
  // If val1 is 8, base is 10.
  // If val1 is 18, base is 20.
  
  // Calculate "distance to next ten"
  const distToNextTen = 10 - (val1 % 10); 
  // If val1 is 10, 20, etc, dist is 10 (which is weird, but handled by logic check before opening modal)
  // Actually, if val1 % 10 === 0, we shouldn't be here ideally, but if we are:
  const need = distToNextTen === 10 ? 0 : distToNextTen;
  
  const rest = val2 - need;
  const targetTen = val1 + need; // e.g. 8+2=10, 18+2=20
  const total = val1 + val2;

  const nextStep = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full max-w-md rounded-2xl border-4 ${config.colors.border} ${config.colors.bg} p-6 shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-4xl">{config.emoji}</div>
          <h2 className={`text-xl font-bold ${config.colors.text}`}>
            Let's Review!
          </h2>
        </div>

        {/* Dynamic Content Area */}
        <div className="min-h-[200px] flex flex-col items-center justify-center mb-6 relative">
          
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center text-lg font-medium"
              >
                 {config.dialogue.intro}
              </motion.div>
            )}

            {step >= 1 && (
               <motion.div 
                key="vis"
                className="relative flex items-start justify-center gap-8 text-4xl font-black text-slate-700"
                layout
               >
                 {/* Number 1 Block */}
                 <div className="flex flex-col items-center gap-2">
                    <motion.div 
                      className={`w-16 h-16 flex items-center justify-center rounded-xl border-2 ${config.colors.border} bg-white z-10`}
                      animate={step === 3 ? { scale: 1.1, borderColor: '#fbbf24', backgroundColor: '#fffbeb' } : {}}
                    >
                      {step >= 3 ? targetTen : val1}
                    </motion.div>
                    <span className="text-xs text-slate-400">Base</span>
                 </div>

                 <div className="pt-4">+</div>

                 {/* Number 2 Block (The Cherry) */}
                 <div className="flex flex-col items-center relative">
                    <motion.div 
                      className="w-16 h-16 flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white z-10"
                      animate={step === 2 ? { y: -10 } : step === 3 ? { opacity: 0 } : {}}
                    >
                      {val2}
                    </motion.div>

                    {/* Cherry Lines */}
                    {(step >= 2) && (
                      <svg className="absolute top-14 w-24 h-16 pointer-events-none" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                        <motion.path 
                           d="M 48 0 L 20 40" 
                           fill="none" 
                           stroke="#cbd5e1" 
                           strokeWidth="3" 
                           initial={{ pathLength: 0 }} 
                           animate={{ pathLength: 1 }}
                        />
                        <motion.path 
                           d="M 48 0 L 76 40" 
                           fill="none" 
                           stroke="#cbd5e1" 
                           strokeWidth="3" 
                           initial={{ pathLength: 0 }} 
                           animate={{ pathLength: 1 }}
                        />
                      </svg>
                    )}

                    {/* Cherry Fruits (Split Numbers) */}
                    {(step >= 2) && (
                      <div className="absolute top-24 w-32 flex justify-between px-2">
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className={`w-10 h-10 flex items-center justify-center rounded-full ${config.colors.highlight} font-bold text-lg border ${config.colors.border}`}
                        >
                          {need}
                        </motion.div>
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 font-bold text-lg border border-slate-200"
                        >
                          {rest}
                        </motion.div>
                      </div>
                    )}
                 </div>
               </motion.div>
            )}
          </AnimatePresence>

          {/* Animation Overlays for Step 3 (Merging) */}
           <AnimatePresence>
            {step === 3 && (
               <motion.div
                 className={`absolute top-0 right-[4.5rem] w-10 h-10 flex items-center justify-center rounded-full ${config.colors.highlight} font-bold text-lg border ${config.colors.border} z-20`}
                 initial={{ top: '6rem', right: '3.5rem', opacity: 1 }} // Approximate position of left cherry
                 animate={{ top: '0rem', right: '8rem', opacity: 0 }} // Move to val1
                 transition={{ duration: 0.8 }}
               >
                 {need}
               </motion.div>
            )}
           </AnimatePresence>

          {/* Step Text */}
          <div className="mt-12 h-16 text-center px-4">
             <AnimatePresence mode="wait">
               <motion.p
                  key={step}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`text-sm ${config.colors.text} font-medium`}
               >
                 {step === 0 && ""}
                 {step === 1 && config.dialogue.step1(val1, need)}
                 {step === 2 && config.dialogue.step2(val2, need, rest)}
                 {step === 3 && config.dialogue.step3(val1, need)}
                 {step === 4 && config.dialogue.step4(total, rest)}
               </motion.p>
             </AnimatePresence>
          </div>
        </div>

        {/* Footer / Controls */}
        <div className="flex justify-end">
          <button
            onClick={nextStep}
            className={`px-6 py-2 rounded-lg text-white font-bold shadow-md active:scale-95 transition-transform ${config.colors.button}`}
          >
            {step === 4 ? 'Got it!' : 'Next'}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
