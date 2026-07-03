"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, RotateCcw } from "lucide-react";
import { api, Entity, Alert } from "@/lib/api";

const STATE_STYLES: Record<
  string,
  { dot: string; text: string; glow: string; border: string }
> = {
  TRUSTED: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    glow: "shadow-[0_0_10px_rgba(52,211,153,0.6)]",
    border: "border-emerald-500/30",
  },
  ENGAGED: {
    dot: "bg-teal-400",
    text: "text-teal-300",
    glow: "shadow-[0_0_10px_rgba(45,212,191,0.6)]",
    border: "border-teal-500/30",
  },
  PROSPECT: {
    dot: "bg-slate-400",
    text: "text-slate-300",
    glow: "shadow-[0_0_8px_rgba(148,163,184,0.4)]",
    border: "border-slate-500/30",
  },
  AT_RISK: {
    dot: "bg-amber-400",
    text: "text-amber-300",
    glow: "shadow-[0_0_10px_rgba(251,191,36,0.6)]",
    border: "border-amber-500/30",
  },
  CHURNED: {
    dot: "bg-red-500",
    text: "text-red-400",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.5)]",
    border: "border-red-500/30",
  },
};
const DEFAULT_STYLE = {
  dot: "bg-white/40",
  text: "text-white/50",
  glow: "",
  border: "border-white/10",
};

export default function KnowledgeGraphPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([api.getEntities(), api.getAlerts()])
      .then(([e, a]) => {
        setEntities(e.entities || []);
        setAlerts(a.alerts || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const alertsByEntity = useMemo(() => {
    const map: Record<string, Alert[]> = {};
    alerts.forEach((a) => {
      if (!map[a.entity_id]) map[a.entity_id] = [];
      map[a.entity_id].push(a);
    });
    return map;
  }, [alerts]);

  const hierarchy = useMemo(() => {
    const byType: Record<string, Record<string, Entity[]>> = {};
    entities.forEach((e) => {
      const type = e.entity_type || "Unknown";
      const state = e.state || "UNKNOWN";
      byType[type] = byType[type] || {};
      byType[type][state] = byType[type][state] || [];
      byType[type][state].push(e);
    });
    return byType;
  }, [entities]);

  const totalEvents = useMemo(
    () => entities.reduce((sum, e) => sum + (e.event_count || 0), 0),
    [entities]
  );

  const selected = entities.find((e) => e.entity_id === selectedId) || null;
  const selectedAlerts = selectedId ? alertsByEntity[selectedId] || [] : [];
  const topAlert = selectedAlerts
    .slice()
    .sort((a, b) => b.entropy_score - a.entropy_score)[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const match = entities.find((en) =>
      en.entity_id.toLowerCase().includes(search.trim().toLowerCase())
    );
    if (match) setSelectedId(match.entity_id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-8 pt-8 pb-6 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative w-2.5 h-2.5 flex justify-center items-center">
              <span className="inline-flex w-full h-full animate-ping rounded-full bg-red-500/40 absolute" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-gray-500 text-xs tracking-wide">
              Agent Live — scanning
            </span>
          </div>
          <h1 className="font-bold text-[#111111] text-2xl tracking-tight">
            Knowledge Graph
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Live hierarchy of every entity Mnemos is tracking, grouped by
            type and relationship state.
          </p>
        </div>
        <div className="bg-[#111111] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] font-semibold rounded-full text-sm px-5 py-2">
          {entities.length} entities live
        </div>
      </div>

      <div className="px-8 py-6 flex-1 min-h-0">
        <div className="relative rounded-2xl bg-[#0a0c0e] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)] h-full min-h-[600px] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center min-h-[600px]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
                  <p className="text-white/40 text-sm tracking-widest uppercase">
                    Loading graph
                  </p>
                </div>
              </div>
            ) : entities.length === 0 ? (
              <div className="flex h-full items-center justify-center flex-col gap-3 text-center px-8 min-h-[600px]">
                <p className="text-white/60 text-sm">
                  No entities tracked yet.
                </p>
                <Link
                  href="/dashboard/import"
                  className="text-white text-sm font-semibold underline underline-offset-4"
                >
                  Import interactions to build the graph
                </Link>
              </div>
            ) : (
              <div className="p-10 flex flex-col items-center gap-10 min-w-max">
                {/* Layer 1 — Core */}
                <div className="flex flex-col items-center gap-2">
                  <span className="uppercase text-white/30 text-[10px] tracking-[6px]">
                    Layer 1 — Core
                  </span>
                  <div className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.6)] px-10 py-5 text-center min-w-[240px]">
                    <div className="font-bold text-white text-xl">
                      Mnemos Memory Core
                    </div>
                    <div className="text-white/45 text-xs mt-1">
                      {entities.length} entities · {totalEvents} events
                    </div>
                  </div>
                </div>

                <div className="w-px h-6 bg-white/15" />

                {/* Layers 2-4 — Type -> State -> Entities */}
                <div className="flex gap-16 items-start">
                  {Object.entries(hierarchy).map(([type, states]) => {
                    const typeCount = Object.values(states).flat().length;
                    return (
                      <div
                        key={type}
                        className="flex flex-col items-center gap-6"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="uppercase text-white/25 text-[9px] tracking-[4px]">
                            Entity Type
                          </span>
                          <div className="rounded-xl bg-[#111315] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] px-6 py-3 text-center min-w-[140px]">
                            <div className="font-semibold text-white text-sm">
                              {type}s ({typeCount})
                            </div>
                          </div>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex gap-6">
                          {Object.entries(states).map(([state, list]) => {
                            const style = STATE_STYLES[state] || DEFAULT_STYLE;
                            return (
                              <div
                                key={state}
                                className="flex flex-col items-center gap-4"
                              >
                                <div
                                  className={`rounded-xl bg-[#0d1210] border ${style.border} shadow-[0_8px_28px_rgba(0,0,0,0.5)] px-4 py-3 text-center`}
                                >
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <span
                                      className={`w-2 h-2 rounded-full ${style.dot} ${style.glow}`}
                                    />
                                    <span
                                      className={`font-semibold text-xs ${style.text}`}
                                    >
                                      {state}
                                    </span>
                                  </div>
                                  <div className="text-white/30 text-[10px] mt-0.5">
                                    {list.length}{" "}
                                    {list.length === 1 ? "entity" : "entities"}
                                  </div>
                                </div>
                                <div className="w-px h-5 bg-white/10" />
                                <div className="flex flex-col gap-2 max-w-[180px]">
                                  {list.slice(0, 6).map((e) => {
                                    const hasAlert = !!alertsByEntity[
                                      e.entity_id
                                    ]?.length;
                                    const isSelected = e.entity_id === selectedId;
                                    return (
                                      <button
                                        key={e.entity_id}
                                        onClick={() => setSelectedId(e.entity_id)}
                                        className={`font-medium rounded-full text-xs px-3 py-1.5 border transition-all duration-200 text-left ${
                                          isSelected
                                            ? "bg-white text-black border-white"
                                            : hasAlert
                                            ? "bg-[#1a0808] text-red-400 border-red-500/40 hover:border-red-400"
                                            : "bg-[#111315] text-white/70 border-white/10 hover:border-white/30"
                                        }`}
                                      >
                                        {e.entity_id}
                                      </button>
                                    );
                                  })}
                                  {list.length > 6 && (
                                    <span className="text-white/25 text-[10px] text-center">
                                      +{list.length - 6} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="hidden md:block absolute left-6 top-6 z-10 rounded-2xl bg-[#0f1113] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-5 w-52">
            <div className="uppercase text-white/30 text-[9px] tracking-[4px] mb-4">
              Legend
            </div>
            <div className="flex flex-col gap-3">
              {Object.entries(STATE_STYLES).map(([state, style]) => (
                <div key={state} className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${style.dot} ${style.glow}`}
                  />
                  <span className={`text-xs ${style.text}`}>
                    {state.replace("_", " ")}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1 border-t border-white/8 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="text-xs text-red-400/80">Has open alert</span>
              </div>
            </div>
          </div>

          {/* Focused node panel */}
          {selected && (
            <div className="absolute right-6 top-6 z-10 rounded-2xl bg-[#0f1113] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-5 w-72">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="uppercase text-white/30 text-[9px] tracking-[4px]">
                    Focused Node
                  </div>
                  <div className="font-bold text-white text-lg mt-0.5">
                    {selected.entity_id}
                  </div>
                </div>
                <div
                  className={`font-bold rounded-full text-[10px] px-2.5 py-1 border bg-white/5 ${
                    (STATE_STYLES[selected.state] || DEFAULT_STYLE).border
                  } ${(STATE_STYLES[selected.state] || DEFAULT_STYLE).text}`}
                >
                  {selected.state}
                </div>
              </div>
              <div className="text-white/40 text-xs mt-2">
                {selected.entity_type} · {selected.event_count} events ·{" "}
                {selected.open_promises} open promises
              </div>
              {topAlert ? (
                <div className="rounded-xl bg-[#0a0c0e] border border-white/6 mt-3 p-4">
                  <div className="text-white/60 text-xs leading-5">
                    {topAlert.promise_description}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-white/30 text-[10px]">
                      Entropy score
                    </span>
                    <span className="font-bold text-red-400 text-xs">
                      {topAlert.entropy_score.toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded-full bg-white/8 mt-1.5 h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{
                        width: `${Math.min(topAlert.entropy_score * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-white/25 text-[10px] mt-2">
                    {topAlert.days_elapsed} days elapsed
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-[#0a0c0e] border border-white/6 mt-3 p-4 text-white/30 text-xs text-center">
                  No open promises tracked.
                </div>
              )}
              <Link
                href={`/dashboard/customer/${selected.entity_id}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white text-black text-sm font-bold py-2.5 shadow-[0_8px_24px_rgba(255,255,255,0.15)] hover:bg-neutral-200 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                View Timeline
              </Link>
            </div>
          )}

          {/* Footer controls */}
          <div className="shrink-0 backdrop-blur-md bg-[#0a0c0e]/95 border-t border-white/8 flex justify-between items-center px-6 py-3">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-2 rounded-full bg-white/10 text-white/70 text-xs font-medium border border-white/10 px-4 py-2 hover:bg-white/15 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Clear selection
            </button>
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2 rounded-full bg-[#111315] border border-white/10 px-4 py-2"
            >
              <Search className="w-3.5 h-3.5 text-white/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Focus on entity…"
                className="bg-transparent outline-none text-white/70 text-xs placeholder:text-white/30 w-40"
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
