"use client";

import { RefObject, useEffect, useId, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedBeamProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}

function usePathCoords(
  containerRef: RefObject<HTMLElement | null>,
  fromRef: RefObject<HTMLElement | null>,
  toRef: RefObject<HTMLElement | null>,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  curvature = 0,
) {
  const [path, setPath] = useState({ d: "", cx: 0, cy: 0 });

  useEffect(() => {
    function update() {
      const container = containerRef.current;
      const from = fromRef.current;
      const to = toRef.current;
      if (!container || !from || !to) return;

      const cRect = container.getBoundingClientRect();
      const fRect = from.getBoundingClientRect();
      const tRect = to.getBoundingClientRect();

      const sx = fRect.left - cRect.left + fRect.width / 2 + startXOffset;
      const sy = fRect.top - cRect.top + fRect.height / 2 + startYOffset;
      const ex = tRect.left - cRect.left + tRect.width / 2 + endXOffset;
      const ey = tRect.top - cRect.top + tRect.height / 2 + endYOffset;

      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2 - curvature;

      setPath({ d: `M ${sx},${sy} Q ${mx},${my} ${ex},${ey}`, cx: mx, cy: my });
    }

    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [containerRef, fromRef, toRef, startXOffset, startYOffset, endXOffset, endYOffset, curvature]);

  return path;
}

export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 3,
  delay = 0,
  pathColor = "rgba(91,77,244,0.2)",
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = "#5B4DF4",
  gradientStopColor = "#a78bfa",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: AnimatedBeamProps) {
  const id = useId();
  const { d } = usePathCoords(
    containerRef, fromRef, toRef,
    startXOffset, startYOffset, endXOffset, endYOffset, curvature,
  );

  const gradientId = `grad-${id}`;

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gradientStartColor} stopOpacity="0" />
          <stop offset="50%" stopColor={gradientStartColor} stopOpacity="1" />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Track line */}
      <path d={d} stroke={pathColor} strokeWidth={pathWidth} fill="none" strokeOpacity={pathOpacity} />

      {/* Animated beam */}
      {d && (
        <motion.path
          d={d}
          stroke={`url(#${gradientId})`}
          strokeWidth={pathWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, pathOffset: reverse ? 1 : 0 }}
          animate={{ pathOffset: reverse ? [1, 0] : [0, 1] }}
          transition={{
            pathOffset: { duration, delay, repeat: Infinity, ease: "linear" },
          }}
          style={{ pathLength: 0.3 }}
        />
      )}
    </svg>
  );
}
