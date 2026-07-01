"use client";

interface StateBadgeProps {
  state: string;
  size?: "sm" | "md" | "lg";
}

const stateConfig: Record<string, { color: string; bg: string; border: string; glow: string; icon: string }> = {
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.2)]",
    icon: "🔴",
  },
  at_risk: {
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    glow: "shadow-[0_0_10px_rgba(249,115,22,0.2)]",
    icon: "🟠",
  },
  churning: {
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    glow: "shadow-[0_0_10px_rgba(249,115,22,0.2)]",
    icon: "🟠",
  },
  drifting: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
    glow: "shadow-[0_0_10px_rgba(234,179,8,0.2)]",
    icon: "🟡",
  },
  neutral: {
    color: "text-slate-400",
    bg: "bg-slate-500/15",
    border: "border-slate-500/30",
    glow: "shadow-none",
    icon: "⚪",
  },
  stable: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    icon: "🟢",
  },
  trusted: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    icon: "🟢",
  },
  engaged: {
    color: "text-electric-400",
    bg: "bg-electric-500/15",
    border: "border-electric-500/30",
    glow: "shadow-[0_0_10px_rgba(59,130,246,0.2)]",
    icon: "🔵",
  },
  new: {
    color: "text-violet-400",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_10px_rgba(139,92,246,0.2)]",
    icon: "🟣",
  },
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-3 py-1",
  lg: "text-sm px-4 py-1.5",
};

export default function StateBadge({ state, size = "md" }: StateBadgeProps) {
  const config = stateConfig[state.toLowerCase()] || stateConfig.neutral;
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider
        border transition-all duration-300
        ${config.color} ${config.bg} ${config.border}
        ${config.glow}
        ${sizeClass}
      `}
    >
      <span className="text-[8px]">{config.icon}</span>
      {state.replace(/_/g, " ")}
    </span>
  );
}
