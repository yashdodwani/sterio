"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface ParticlesProps {
  className?: string;
  quantity?: number;
  color?: string;
  ease?: number;
  refresh?: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [255, 255, 255];
}

export function Particles({
  className,
  quantity = 60,
  color = "#a78bfa",
  ease = 80,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animFrame = useRef<number>(0);
  const [rgb] = useState(() => hexToRgb(color));

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = container.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    particles.current = Array.from({ length: quantity }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }));
  }, [quantity]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles.current) {
      // Subtle mouse repulsion
      const dx = p.x - mouse.current.x;
      const dy = p.y - mouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const force = (120 - dist) / ease;
        p.vx += (dx / dist) * force * 0.05;
        p.vy += (dy / dist) * force * 0.05;
      }

      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${p.alpha})`;
      ctx.fill();
    }

    animFrame.current = requestAnimationFrame(draw);
  }, [ease, rgb]);

  useEffect(() => {
    init();
    draw();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onResize = () => {
      cancelAnimationFrame(animFrame.current);
      init();
      draw();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animFrame.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, [init, draw]);

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
