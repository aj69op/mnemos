"use client";

interface EntropyBarProps {
  score: number; // 0 to 1
  severity?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function EntropyBar({ score, severity, showLabel = true, size = "md" }: EntropyBarProps) {
  const pct = Math.min(Math.max(score * 100, 0), 100);

  const getColor = () => {
    if (severity) {
      switch (severity.toLowerCase()) {
        case "critical": return { bar: "from-red-500 to-red-600", bg: "bg-red-500/5", text: "text-red-400" };
        case "high": return { bar: "from-orange-500 to-orange-600", bg: "bg-orange-500/5", text: "text-orange-400" };
        case "medium": return { bar: "from-yellow-500 to-amber-500", bg: "bg-yellow-500/5", text: "text-yellow-400" };
        default: return { bar: "from-indigo-500 to-violet-500", bg: "bg-indigo-500/5", text: "text-amber-600" };
      }
    }
    if (pct >= 75) return { bar: "from-red-500 to-red-600", bg: "bg-red-500/5", text: "text-red-400" };
    if (pct >= 50) return { bar: "from-orange-500 to-orange-600", bg: "bg-orange-500/5", text: "text-orange-400" };
    if (pct >= 25) return { bar: "from-yellow-500 to-amber-500", bg: "bg-yellow-500/5", text: "text-yellow-400" };
    return { bar: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/5", text: "text-emerald-400" };
  };

  const colors = getColor();
  const isCritical = pct >= 75;

  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
            Entropy Decay
          </span>
          <span className={`text-xs font-bold tabular-nums ${colors.text}`}>
            {pct.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={`relative w-full ${heightClass} rounded-full ${colors.bg} overflow-hidden backdrop-blur-sm`}>
        <div
          className={`
            absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${colors.bar}
            transition-all duration-700 ease-out
            ${isCritical ? "entropy-critical" : ""}
          `}
          style={{ width: `${pct}%` }}
        >
          {/* Shimmer overlay on the bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
}
