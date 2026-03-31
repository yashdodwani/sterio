"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 12,
  delay = 0,
  colorFrom = "#5B4DF4",
  colorTo = "#a78bfa",
}: BorderBeamProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]">
      <motion.div
        className={cn(
          "absolute aspect-square",
          "bg-gradient-to-l from-[--color-from] via-[--color-to] to-transparent",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round 24px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
          } as React.CSSProperties
        }
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
