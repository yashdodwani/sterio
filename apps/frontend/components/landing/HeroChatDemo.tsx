"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BorderBeam } from "@/components/ui/border-beam";
import { BlurFade } from "@/components/ui/blur-fade";

// 0 idle → 1 user msg → 2 typing → 3 ai text → 4 product card
const SEQUENCE = [
  { step: 1, delay: 700 },
  { step: 2, delay: 1500 },
  { step: 3, delay: 3100 },
  { step: 4, delay: 3800 },
  { step: 0, delay: 9200 },
];

function TypingDots() {
  return (
    <div className="flex gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand-primary/70"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, delay: i * 0.14, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function ProductCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Product image */}
      <div
        className="h-36 relative flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f0b2a 0%, #1e1550 45%, #130f38 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(167,139,250,0.18) 0%, transparent 65%)" }}
        />
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
          <path d="M32 38 C32 26 37 18 45 18 C53 18 58 26 58 38" stroke="#c4b5fd" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <rect x="18" y="38" width="54" height="36" rx="6" fill="rgba(139,92,246,0.12)" stroke="#a78bfa" strokeWidth="1.5" />
          <line x1="18" y1="52" x2="72" y2="52" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.5" />
          <rect x="37" y="50" width="16" height="6" rx="3" fill="rgba(196,181,253,0.4)" stroke="#c4b5fd" strokeWidth="1" />
          <circle cx="45" cy="53" r="1.5" fill="#e9d5ff" />
          <line x1="28" y1="42" x2="28" y2="70" stroke="#a78bfa" strokeWidth="0.5" strokeOpacity="0.3" />
          <line x1="62" y1="42" x2="62" y2="70" stroke="#a78bfa" strokeWidth="0.5" strokeOpacity="0.3" />
        </svg>
        <div className="absolute top-2.5 right-2.5 bg-green-500/20 border border-green-400/30 rounded-full px-2 py-0.5 text-[10px] text-green-400 font-semibold">
          In Stock
        </div>
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mb-0.5">Hermès</p>
            <p className="text-sm font-semibold text-white leading-tight">Birkin 35 — Noir</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-white">480 USDC</p>
            <p className="text-[10px] text-gray-500 mt-0.5">≈ $480</p>
          </div>
        </div>
        <button className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold py-2.5 rounded-xl transition-all">
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
}

export function HeroChatDemo() {
  const [step, setStep] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    function run() {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
      SEQUENCE.forEach(({ step: s, delay }) => {
        const t = setTimeout(() => {
          setStep(s);
          if (s === 0) run();
        }, delay);
        timeouts.current.push(t);
      });
    }
    run();
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  return (
    <BlurFade delay={0.4} className="w-full max-w-[380px] lg:max-w-[420px]">
      <div className="relative w-full">
        {/* Glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: -60,
            background: "radial-gradient(ellipse at center, rgba(91,77,244,0.18) 0%, transparent 65%)",
            filter: "blur(24px)",
          }}
        />

        {/* Glass chat panel */}
        <div className="relative landing-glass-card rounded-3xl overflow-hidden shadow-2xl shadow-brand-primary/10">
          <BorderBeam duration={10} colorFrom="#5B4DF4" colorTo="#a78bfa" />

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-primary/40">
              C
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none mb-1">Sterio AI</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[11px] text-gray-500">Always on</span>
              </div>
            </div>
          </div>

          {/* Messages — fixed height, no layout shift */}
          <div className="px-4 py-5 h-[400px] sm:h-[480px] overflow-hidden space-y-3">

            {/* User message */}
            <AnimatePresence>
              {step >= 1 && (
                <motion.div
                  key="user-msg"
                  className="flex justify-end"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-brand-primary/20 border border-brand-primary/25 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[88%]">
                    <p className="text-sm text-white leading-relaxed">
                      Find me a luxury leather bag under 500 USDC
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typing / AI response */}
            <AnimatePresence mode="wait">
              {step === 2 && (
                <motion.div
                  key="typing"
                  className="flex items-end gap-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-brand-primary flex-shrink-0">
                    C
                  </div>
                  <div className="bg-white/[0.05] border border-white/8 rounded-2xl rounded-bl-sm">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
              {step >= 3 && (
                <motion.div
                  key="ai-text"
                  className="flex items-end gap-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-brand-primary flex-shrink-0">
                    C
                  </div>
                  <div className="bg-white/[0.05] border border-white/8 rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <p className="text-sm text-gray-200 leading-relaxed">Found the perfect match for you ✨</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Product card */}
            <AnimatePresence>
              {step >= 4 && (
                <div key="product" className="ml-9">
                  <ProductCard />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Input bar */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3">
              <p className="flex-1 text-sm text-gray-600 select-none">Ask anything...</p>
              <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges — row below the panel */}
        <motion.div
          className="flex items-center justify-between mt-4 px-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
        >
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-full px-3.5 py-2">
            <span className="text-yellow-400 text-sm leading-none">★</span>
            <span className="text-[11px] font-semibold text-gray-300">AI-Curated Results</span>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-full px-3.5 py-2">
            <span className="w-2 h-2 rounded-full bg-[#E6007A] animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-semibold text-gray-300">Secured by Polkadot</span>
          </div>
        </motion.div>
      </div>
    </BlurFade>
  );
}
