"use client";

import { useRef } from "react";
import { motion, useInView, Variants } from "motion/react";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: Variants;
  duration?: number;
  delay?: number;
  offset?: number;
  inView?: boolean;
  inViewMargin?: string;
  blur?: string;
}

const defaultVariants: Variants = {
  hidden: { y: 6, opacity: 0, filter: "blur(6px)" },
  visible: { y: 0, opacity: 1, filter: "blur(0px)" },
};

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  offset = 6,
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin as any });
  const isVisible = !inView || inViewResult;

  const variants = variant ?? {
    hidden: { y: offset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: 0, opacity: 1, filter: "blur(0px)" },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={variants}
      transition={{ delay: 0.04 + delay, duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
