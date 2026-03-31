"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { BlurFade } from "@/components/ui/blur-fade";

const STEPS = [
  {
    number: "01",
    title: "Connect",
    description: "Multi-wallet Polkadot integration for a frictionless start to your luxury journey.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Chat",
    description: "Describe what you desire. Your personal AI assistant finds the perfect match.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Purchase",
    description: "Secure USDC one-click buy. Transparent, fast, and cryptographically sound.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <div ref={ref}>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block">

        {/* Node row — grid so cards below align exactly */}
        <div className="relative grid grid-cols-3 mb-14">

          {/* Spine: spans from right edge of node 1 → left edge of node 3
              Grid cell centers: 16.67% | 50% | 83.33%
              Node radius: 32px  →  spine: calc(16.67%+32px) to calc(16.67%+32px) from right */}
          <div
            className="absolute top-1/2 -translate-y-1/2 z-0 overflow-hidden"
            style={{
              left: "calc(16.67% + 32px)",
              right: "calc(16.67% + 32px)",
              height: "20px",
            }}
          >
            {/* Dim static track */}
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2"
              style={{
                height: "1px",
                background:
                  "linear-gradient(90deg, rgba(91,77,244,0.25), rgba(91,77,244,0.5) 50%, rgba(91,77,244,0.25))",
              }}
            />
            {/* Animated sweep beam */}
            {isInView && (
              <motion.div
                className="absolute top-0 bottom-0"
                style={{
                  width: "38%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(91,77,244,0.6) 25%, rgba(167,139,250,1) 50%, rgba(91,77,244,0.6) 75%, transparent)",
                  filter: "blur(4px)",
                }}
                initial={{ left: "-38%" }}
                animate={{ left: "138%" }}
                transition={{
                  duration: 2.8,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 1.2,
                }}
              />
            )}
          </div>

          {/* Nodes */}
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex justify-center relative z-10">
              <div className="relative">
                {/* Outer pulse ring */}
                {isInView && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-brand-primary"
                    initial={{ scale: 1, opacity: 0.55 }}
                    animate={{ scale: 2.8, opacity: 0 }}
                    transition={{
                      duration: 2.4,
                      ease: "easeOut",
                      repeat: Infinity,
                      repeatDelay: 0.6,
                      delay: i * 0.9,
                    }}
                  />
                )}
                {/* Inner pulse ring */}
                {isInView && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-brand-primary/40"
                    initial={{ scale: 1, opacity: 0.35 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    transition={{
                      duration: 1.8,
                      ease: "easeOut",
                      repeat: Infinity,
                      repeatDelay: 0.6,
                      delay: i * 0.9 + 0.5,
                    }}
                  />
                )}
                {/* Node circle */}
                <motion.div
                  className="w-16 h-16 rounded-full bg-black border border-brand-primary flex items-center justify-center relative"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(91,77,244,0.15), 0 0 24px rgba(91,77,244,0.3), inset 0 0 16px rgba(91,77,244,0.06)",
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{
                    duration: 0.55,
                    delay: i * 0.18,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <span className="text-brand-primary font-bold text-base tracking-wider">
                    {step.number}
                  </span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>

        {/* Card row — same grid-cols-3, aligns under nodes */}
        <div className="grid grid-cols-3">
          {STEPS.map((step, i) => (
            <BlurFade key={step.number} inView delay={0.45 + i * 0.14}>
              <div className="flex flex-col items-center text-center px-10 group">
                <div className="w-10 h-10 mb-5 text-brand-primary/55 transition-colors duration-300 group-hover:text-brand-primary">
                  {step.icon}
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">{step.title}</h4>
                <p className="text-[--text-secondary] text-sm leading-relaxed">{step.description}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>

      {/* ── MOBILE: Vertical Timeline ── */}
      <div className="md:hidden">
        {STEPS.map((step, i) => (
          <BlurFade key={step.number} inView delay={i * 0.15}>
            <div className="flex gap-5">
              {/* Timeline spine column */}
              <div className="flex flex-col items-center flex-none w-12">
                {/* Node */}
                <div className="relative flex-none">
                  {isInView && (
                    <motion.div
                      className="absolute inset-0 rounded-full border border-brand-primary"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{
                        duration: 2,
                        ease: "easeOut",
                        repeat: Infinity,
                        delay: i * 0.8,
                      }}
                    />
                  )}
                  <div
                    className="w-12 h-12 rounded-full bg-black border border-brand-primary flex items-center justify-center relative z-10"
                    style={{ boxShadow: "0 0 16px rgba(91,77,244,0.25)" }}
                  >
                    <span className="text-brand-primary font-bold text-sm tracking-wider">
                      {step.number}
                    </span>
                  </div>
                </div>
                {/* Vertical connector */}
                {i < STEPS.length - 1 && (
                  <div
                    className="w-px flex-1 relative overflow-hidden my-2"
                    style={{
                      minHeight: "72px",
                      background: "rgba(91,77,244,0.12)",
                    }}
                  >
                    {isInView && (
                      <motion.div
                        className="absolute inset-x-0"
                        style={{
                          height: "55%",
                          background:
                            "linear-gradient(180deg, transparent, rgba(91,77,244,0.85), transparent)",
                        }}
                        animate={{ y: ["-55%", "155%"] }}
                        transition={{
                          duration: 1.6,
                          ease: "easeInOut",
                          repeat: Infinity,
                          delay: i * 0.5,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="pb-10 pt-1">
                <div className="w-8 h-8 mb-3 text-brand-primary/65">{step.icon}</div>
                <h4 className="text-lg font-bold mb-2 text-white">{step.title}</h4>
                <p className="text-[--text-secondary] text-sm leading-relaxed max-w-[260px]">
                  {step.description}
                </p>
              </div>
            </div>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}
