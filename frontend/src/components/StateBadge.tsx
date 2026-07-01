"use client";

interface StateBadgeProps {
  state: string;
  size?: "sm" | "md" | "lg";
}

const stateConfig: Record<string, { color: string; bg: string; border: string; glow: string; icon: string }> = {
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    glow: "shadow-red-500/10",
    icon: "🔴",
  },
  at_risk: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    glow: "shadow-orange-500/10",
    icon: "🟠",
  },
  churning: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    glow: "shadow-orange-500/10",
    icon: "🟠",
  },
  drifting: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    glow: "shadow-yellow-500/10",
    icon: "🟡",
  },
  neutral: {
    color: "text-stone-600",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    glow: "shadow-slate-500/10",
    icon: "⚪",
  },
  stable: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/10",
    icon: "🟢",
  },
  trusted: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/10",
    icon: "🟢",
  },
  engaged: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    glow: "shadow-blue-500/10",
    icon: "🔵",
  },
  new: {
    color: "text-amber-600",
    bg: "bg-indigo-500/10",
    border: "border-amber-600/20",
    glow: "shadow-indigo-500/10",
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
        border backdrop-blur-sm transition-all duration-300
        ${config.color} ${config.bg} ${config.border}
        shadow-lg ${config.glow}
        ${sizeClass}
      `}
    >
      <span className="text-[8px]">{config.icon}</span>
      {state.replace(/_/g, " ")}
    </span>
  );
}
