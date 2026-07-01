"use client";

import type { TimelineEvent } from "@/lib/api";

interface TimelineViewProps {
  events: TimelineEvent[];
}

const sentimentConfig: Record<string, { color: string; icon: string }> = {
  positive: { color: "text-emerald-400", icon: "😊" },
  negative: { color: "text-red-400", icon: "😟" },
  neutral: { color: "text-stone-600", icon: "😐" },
  frustrated: { color: "text-orange-400", icon: "😤" },
  angry: { color: "text-red-500", icon: "😡" },
  satisfied: { color: "text-emerald-400", icon: "😌" },
  worried: { color: "text-yellow-400", icon: "😰" },
};

const eventTypeIcons: Record<string, string> = {
  email: "📧",
  call: "📞",
  meeting: "🤝",
  support_ticket: "🎫",
  complaint: "📢",
  feedback: "💬",
  purchase: "🛒",
  contract: "📄",
  invoice: "💰",
  chat: "💬",
};

export default function TimelineView({ events }: TimelineViewProps) {
  if (!events || events.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="text-3xl mb-3">📭</div>
        <p className="text-stone-500 text-sm">No interactions recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/30 via-violet-500/20 to-transparent" />

      <div className="space-y-1">
        {events.map((event, i) => {
          const sentiment = sentimentConfig[event.sentiment?.toLowerCase()] || sentimentConfig.neutral;
          const eventIcon = eventTypeIcons[event.event_type?.toLowerCase()] || "📋";
          const date = new Date(event.timestamp);
          const formattedDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const formattedTime = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={i}
              className="relative pl-14 py-3 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
            >
              {/* Timeline dot */}
              <div className="absolute left-[18px] top-5 w-3 h-3 rounded-full bg-stone-50 border-2 border-amber-600/50 z-10 shadow-lg shadow-indigo-500/20" />

              <div className="glass-panel glass-panel-hover p-4">
                {/* Event header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{eventIcon}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-800">
                      {event.event_type?.replace(/_/g, " ")}
                    </span>
                    <span className={`text-xs ${sentiment.color}`}>
                      {sentiment.icon}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-stone-500 font-medium">{formattedDate}</div>
                    <div className="text-[10px] text-stone-400">{formattedTime}</div>
                  </div>
                </div>

                {/* Raw text */}
                <p className="text-sm text-stone-800 leading-relaxed mb-2">
                  {event.raw_text}
                </p>

                {/* Promises extracted */}
                {event.promises && event.promises.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
                      Promises Detected
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {event.promises.map((p, j) => (
                        <span
                          key={j}
                          className="text-xs bg-indigo-500/10 text-indigo-300 border border-amber-600/20 px-2 py-0.5 rounded-md"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
