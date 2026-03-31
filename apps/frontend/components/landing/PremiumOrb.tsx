"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

function PingRing({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{ border: "1px solid rgba(91,77,244,0.55)" }}
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{ scale: [0.88, 2.2], opacity: [0.6, 0] }}
      transition={{
        duration: 3.4,
        delay,
        repeat: Infinity,
        repeatDelay: 0.2,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  );
}

// Orbital ring tilted at rotateX angle, spinning in 2D
function TiltedRing({
  inset,
  tiltX,
  color,
  duration,
  reverse = false,
}: {
  inset: number;
  tiltX: number;
  color: string;
  duration: number;
  reverse?: boolean;
}) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ inset, transform: `rotateX(${tiltX}deg)` }}
    >
      <motion.div
        className="w-full h-full rounded-full"
        style={{ border: `1px solid ${color}` }}
        animate={{ rotate: reverse ? -360 : 360 }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// A glowing dot orbiting on a tilted (elliptical) orbital plane
function Satellite({
  tiltX = 65,
  duration,
  delay,
  color,
  size = 7,
  topOffset = -10,
}: {
  tiltX?: number;
  duration: number;
  delay: number;
  color: string;
  size?: number;
  topOffset?: number;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ transform: `rotateX(${tiltX}deg)` }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            top: topOffset,
            left: "50%",
            transform: "translateX(-50%)",
            background: color,
            boxShadow: `0 0 ${size * 3}px ${size * 1.5}px ${color}`,
          }}
        />
      </motion.div>
    </div>
  );
}

export function PremiumOrb() {
  const containerRef = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Spring-damped tilt follows the mouse — premium tactile feel
  const rotateX = useSpring(useTransform(rawY, [-250, 250], [14, -14]), {
    stiffness: 65,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(rawX, [-250, 250], [-14, 14]), {
    stiffness: 65,
    damping: 18,
  });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(e.clientX - rect.left - rect.width / 2);
    rawY.set(e.clientY - rect.top - rect.height / 2);
  }

  function onMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{ width: 500, height: 500 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Atmospheric haze — broad soft glow behind everything */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 740,
          height: 740,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(91,77,244,0.14) 0%, rgba(91,77,244,0.04) 45%, transparent 70%)",
          filter: "blur(32px)",
        }}
      />

      {/* Sonar pings — 3 staggered rings expanding & fading */}
      <PingRing delay={0} />
      <PingRing delay={1.13} />
      <PingRing delay={2.26} />

      {/* Tilted orbit rings — 3D-looking ellipses at different inclinations */}
      <TiltedRing inset={-24} tiltX={72} color="rgba(91,77,244,0.3)" duration={14} />
      <TiltedRing inset={-46} tiltX={64} color="rgba(167,139,250,0.14)" duration={26} reverse />
      <TiltedRing inset={-11} tiltX={80} color="rgba(91,77,244,0.18)" duration={9} />

      {/* Orbiting satellites — small glowing dots on inclined planes */}
      <Satellite tiltX={64} duration={10} delay={0} color="rgba(196,181,253,0.95)" size={8} topOffset={-10} />
      <Satellite tiltX={54} duration={17} delay={-5} color="rgba(91,77,244,1)" size={5} topOffset={-7} />
      <Satellite tiltX={78} duration={13} delay={-8} color="rgba(167,139,250,0.9)" size={4} topOffset={-5} />

      {/* Main sphere — mouse-tilt via spring, breathing glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ rotateX, rotateY }}
      >
        {/* Core with animated pulsing glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 33% 28%, #e2d9ff 0%, #b8a4fc 12%, #7c6af0 38%, #3d2db5 68%, #0f0c2e 100%)",
          }}
          animate={{
            boxShadow: [
              "0 0 45px 12px rgba(91,77,244,0.42), 0 0 90px 36px rgba(91,77,244,0.15), inset -22px -22px 44px rgba(0,0,0,0.58), inset 8px 8px 22px rgba(255,255,255,0.07)",
              "0 0 72px 24px rgba(108,92,231,0.62), 0 0 150px 65px rgba(91,77,244,0.24), inset -22px -22px 44px rgba(0,0,0,0.58), inset 8px 8px 22px rgba(255,255,255,0.13)",
              "0 0 45px 12px rgba(91,77,244,0.42), 0 0 90px 36px rgba(91,77,244,0.15), inset -22px -22px 44px rgba(0,0,0,0.58), inset 8px 8px 22px rgba(255,255,255,0.07)",
            ],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Specular highlight — glass-like top-left reflection */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 10,
            background:
              "linear-gradient(138deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 30%, transparent 52%)",
          }}
        />

        {/* Inner bright core spot — simulates subsurface light */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: "38%",
            height: "38%",
            top: "11%",
            left: "16%",
            background: "radial-gradient(circle, rgba(255,255,255,0.26) 0%, transparent 100%)",
            filter: "blur(14px)",
          }}
        />
      </motion.div>
    </div>
  );
}
