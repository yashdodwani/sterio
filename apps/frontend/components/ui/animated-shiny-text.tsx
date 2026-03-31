import { cn } from "@/lib/utils";

interface AnimatedShinyTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export function AnimatedShinyText({ children, className, shimmerWidth = 100 }: AnimatedShinyTextProps) {
  return (
    <span
      style={{ "--shiny-width": `${shimmerWidth}px` } as React.CSSProperties}
      className={cn(
        "inline-flex items-center gap-2",
        "animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0]",
        "bg-[length:var(--shiny-width)_100%]",
        "[background-image:linear-gradient(110deg,transparent,45%,rgba(255,255,255,0.7),55%,transparent)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
