"use client";

import type { Alert } from "@/lib/api";
import EntropyBar from "./EntropyBar";
import StateBadge from "./StateBadge";
import Link from "next/link";

interface AlertCardProps {
  alert: Alert;
  index: number;
}

const severityConfig: Record<string, { accent: string; icon: string; ring: string }> = {
  critical: {
    accent: "border-l-red-500",
    icon: "🚨",
    ring: "ring-red-500/30",
  },
  high: {
    accent: "border-l-orange-500",
    icon: "⚠️",
    ring: "ring-orange-500/30",
  },
  medium: {
    accent: "border-l-yellow-500",
    icon: "📋",
    ring: "ring-yellow-500/30",
  },
  low: {
    accent: "border-l-electric-500",
    icon: "ℹ️",
    ring: "ring-electric-500/30",
  },
};

export default function AlertCard({ alert, index }: AlertCardProps) {
  const config = severityConfig[alert.severity?.toLowerCase()] || severityConfig.medium;

  return (
    <Link href={`/customer/${encodeURIComponent(alert.entity_id)}`}>
      <div
        className={`
          glass-panel glass-panel-hover border-l-4 ${config.accent}
          p-5 cursor-pointer animate-slide-up
          ring-1 ${config.ring}
        `}
        style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{config.icon}</span>
            <div>
              <h3 className="font-semibold text-white text-sm tracking-tight">
                {alert.entity_id}
              </h3>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {alert.entity_type}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SeverityPill severity={alert.severity} />
          </div>
        </div>

        {/* Promise description */}
        <p className="text-sm text-slate-300 mb-3 leading-relaxed line-clamp-2">
          {alert.promise_description}
        </p>

        {/* Entropy bar */}
        <div className="mb-3">
          <EntropyBar score={alert.entropy_score} severity={alert.severity} size="sm" />
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            {alert.promise_type?.replace(/_/g, " ")}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span className="tabular-nums font-medium">
              {alert.days_elapsed}d ago
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const colorMap: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    low: "bg-electric-500/15 text-electric-400 border-electric-500/30",
  };
  const cls = colorMap[severity?.toLowerCase()] || colorMap.medium;

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${cls}`}>
      {severity}
    </span>
  );
}
