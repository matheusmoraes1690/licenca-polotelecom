import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  color?: string;
  bgColor?: string;
  delay?: number;
}

function useCountUp(end: number, duration: number = 1500, start: boolean = true) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [end, duration, start]);

  return count;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className,
  color = "#E8002D",
  bgColor = "#FFF0F3",
  delay = 0,
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const numericValue = typeof value === "string" ? parseFloat(value.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", ".")) || 0 : value;
  const isCurrency = typeof value === "string" && value.includes("R$");
  const displayValue = typeof value === "string" && !isCurrency ? value : undefined;
  const animatedCount = useCountUp(numericValue, 1500, isVisible);

  const formattedValue = isCurrency
    ? `R$ ${animatedCount.toLocaleString("pt-BR")}`
    : displayValue ?? animatedCount.toLocaleString("pt-BR");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-0 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Colored top border */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }} />

      <div className="p-5 pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <div className="text-[32px] font-bold leading-none" style={{ color }}>
              {formattedValue}
            </div>
            {(description || trendValue) && (
              <div className="flex items-center gap-2">
                {trendValue && (
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    trend === "up" ? "bg-[#E8F5E9] text-[#00C853]" :
                    trend === "down" ? "bg-[#FFF0F3] text-[#E8002D]" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
                  </span>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </div>
    </div>
  );
}
