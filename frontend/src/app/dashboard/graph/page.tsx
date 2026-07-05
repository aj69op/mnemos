"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Search, RotateCcw, Sparkles, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { api, Entity, Alert } from "@/lib/api";

/* ── colour config per relationship state ────────────────────────── */
const STATE_STYLES: Record<
  string,
  { dot: string; text: string; glow: string; border: string; bg: string; rgb: string }
> = {
  TRUSTED: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    glow: "shadow-[0_0_14px_rgba(52,211,153,0.7)]",
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/40",
    rgb: "52,211,153",
  },
  ENGAGED: {
    dot: "bg-teal-400",
    text: "text-teal-300",
    glow: "shadow-[0_0_14px_rgba(45,212,191,0.7)]",
    border: "border-teal-500/30",
    bg: "bg-teal-950/40",
    rgb: "45,212,191",
  },
  PROSPECT: {
    dot: "bg-slate-400",
    text: "text-slate-300",
    glow: "shadow-[0_0_10px_rgba(148,163,184,0.5)]",
    border: "border-slate-500/30",
    bg: "bg-slate-900/40",
    rgb: "148,163,184",
  },
  AT_RISK: {
    dot: "bg-red-500",
    text: "text-red-400",
    glow: "shadow-[0_0_18px_rgba(239,68,68,0.8)]",
    border: "border-red-500/40",
    bg: "bg-red-950/50",
    rgb: "239,68,68",
  },
  CHURNED: {
    dot: "bg-white/25",
    text: "text-white/40",
    glow: "",
    border: "border-white/8",
    bg: "bg-white/[0.02]",
    rgb: "120,120,120",
  },
};
const DEFAULT_STYLE = {
  dot: "bg-white/40",
  text: "text-white/50",
  glow: "",
  border: "border-white/10",
  bg: "bg-white/[0.03]",
  rgb: "255,255,255",
};

/* ── layer visibility keys ───────────────────────────────────────── */
type Layer = "CORE" | "ENTITY_TYPE" | "REL_STATE" | "ENTITIES";
const ALL_LAYERS: Layer[] = ["CORE", "ENTITY_TYPE", "REL_STATE", "ENTITIES"];

/* ── animated edge component ─────────────────────────────────────── */
function AnimatedEdge({ color = "255,255,255", alert = false, delay = 0 }: { color?: string; alert?: boolean; delay?: number }) {
  return (
    <div className="relative w-px flex flex-col items-center" style={{ height: 32 }}>
      {/* Main line */}
      <div
        className="absolute inset-0 w-px"
        style={{
          background: `linear-gradient(to bottom, rgba(${color},${alert ? 0.7 : 0.35}), rgba(${color},${alert ? 0.25 : 0.08}))`,
        }}
      />
      {/* Travelling particle */}
      <div
        className="absolute w-1 h-1 rounded-full"
        style={{
          background: `rgba(${color},${alert ? 1 : 0.8})`,
          boxShadow: `0 0 8px rgba(${color},${alert ? 0.9 : 0.6})`,
          animation: `edgeParticle 2s ease-in-out ${delay}s infinite`,
        }}
      />
    </div>
  );
}

export default function KnowledgeGraphPage() {
  /* ── data state ────────────────────────────────────────────────── */
  const [entities, setEntities] = useState<Entity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── interaction state ─────────────────────────────────────────── */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleLayers, setVisibleLayers] = useState<Set<Layer>>(new Set(ALL_LAYERS));
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  /* ── fetch data on mount ───────────────────────────────────────── */
  useEffect(() => {
    Promise.all([api.getEntities(), api.getAlerts()])
      .then(([e, a]) => {
        setEntities(e.entities || []);
        setAlerts(a.alerts || []);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
      });
  }, []);

  /* ── derived data ──────────────────────────────────────────────── */
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
  const topAlert = selectedAlerts.slice().sort((a, b) => b.entropy_score - a.entropy_score)[0];

  /* ── handlers ──────────────────────────────────────────────────── */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    const match = entities.find((en) => en.entity_id.toLowerCase().includes(q));
    if (match) setSelectedId(match.entity_id);
  };

  const toggleLayer = (layer: Layer) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const collapseAll = () => setVisibleLayers(new Set());
  const resetSelection = () => {
    setSelectedId(null);
    setSearch("");
    setVisibleLayers(new Set(ALL_LAYERS));
    setZoom(1);
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.4));

  let typeIndex = 0;

  /* ── render ────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">
      {/* Inject keyframes */}
      <style>{`
        @keyframes edgeParticle {
          0%, 100% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes coreBreath {
          0%, 100% { box-shadow: 0 0 40px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06); transform: scale(1); }
          50% { box-shadow: 0 0 70px rgba(255,255,255,0.14), 0 24px 70px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1); transform: scale(1.02); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes panelSlide {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.4), 0 8px 28px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 22px rgba(239,68,68,0.7), 0 8px 28px rgba(0,0,0,0.5); }
        }
      `}</style>

      {/* ── header ───────────────────────────────────────────── */}
      <div className="border-b border-gray-200 px-4 md:px-6 lg:px-8 pt-8 pb-6 flex justify-between items-start">
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
            Hierarchical flow with dynamic focus, layered depth, and live relationship signals.
          </p>
        </div>
        <div className="bg-[#111111] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] font-semibold rounded-full text-sm px-5 py-2 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white/60" />
          {entities.length} entities live
        </div>
      </div>

      {/* ── graph canvas ─────────────────────────────────────── */}
      <div className={`px-4 md:px-6 lg:px-8 py-6 flex-1 min-h-0 ${isFullscreen ? 'fixed inset-0 z-50 p-0' : ''}`}>
        <div className={`relative bg-[#060809] border border-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.04)] h-full min-h-[600px] flex flex-col overflow-hidden ${isFullscreen ? 'rounded-none' : 'rounded-2xl'}`}>
          {/* Background graph grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px, 40px 40px, 10px 10px, 10px 10px",
            }}
          />
          {/* Background radial glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-white/[0.02] blur-[120px] pointer-events-none" />

          {/* scrollable graph area */}
          <div className="flex-1 overflow-auto relative z-10">
            {loading ? (
              <div className="flex h-full items-center justify-center min-h-[600px]">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-2 border-white/5 rounded-full" />
                    <div className="absolute inset-0 border-2 border-transparent border-t-white/60 rounded-full animate-spin" />
                    <div className="absolute inset-2 border border-transparent border-t-white/30 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                  </div>
                  <p className="text-white/40 text-sm tracking-widest uppercase">
                    Loading graph
                  </p>
                </div>
              </div>
            ) : entities.length === 0 ? (
              <div className="flex h-full items-center justify-center flex-col gap-3 text-center px-8 min-h-[600px]">
                <p className="text-white/60 text-sm">No entities tracked yet.</p>
                <Link href="/dashboard/import" className="text-white text-sm font-semibold underline underline-offset-4 hover:text-white/80 transition-colors">
                  Import interactions to build the graph
                </Link>
              </div>
            ) : (
              <div 
                className="p-10 flex flex-col items-center gap-0 min-w-max transition-transform duration-300 origin-top"
                style={{ transform: `scale(${zoom})` }}
              >
                {/* ── Layer 1 — Core ─────────────────────── */}
                {visibleLayers.has("CORE") && (
                  <div
                    className="flex flex-col items-center gap-3"
                    style={{
                      animation: mounted ? "floatIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards" : "none",
                      opacity: mounted ? 1 : 0,
                    }}
                  >
                    <span className="uppercase text-white/20 text-[9px] tracking-[8px] font-medium">
                      Layer 1 — Core
                    </span>
                    <div
                      className="relative rounded-2xl border border-white/[0.12] backdrop-blur-xl px-12 py-6 text-center min-w-[280px] group cursor-default"
                      style={{ animation: "coreBreath 4s ease-in-out infinite" }}
                    >
                      {/* Shimmer overlay */}
                      <div
                        className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
                        style={{
                          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 6s ease-in-out infinite",
                        }}
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02]" />
                      <div className="relative">
                        <div className="font-bold text-white text-xl tracking-tight">
                          Mnemos Memory Core
                        </div>
                        <div className="text-white/40 text-xs mt-1.5 font-medium">
                          {entities.length} entities · {totalEvents} events
                        </div>
                      </div>
                      {/* Bottom glow dot */}
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.7)]" />
                    </div>
                  </div>
                )}

                {visibleLayers.has("CORE") && visibleLayers.has("ENTITY_TYPE") && (
                  <AnimatedEdge delay={0} />
                )}

                {/* ── Layer 2-4: Type → State → Entities ── */}
                {visibleLayers.has("ENTITY_TYPE") && (
                  <div className="flex gap-20 items-start">
                    {Object.entries(hierarchy).map(([type, states]) => {
                      const currentTypeIndex = typeIndex++;
                      const typeCount = Object.values(states).flat().length;
                      return (
                        <div
                          key={type}
                          className="flex flex-col items-center gap-0"
                          style={{
                            animation: mounted
                              ? `floatIn 0.7s cubic-bezier(0.16,1,0.3,1) ${0.2 + currentTypeIndex * 0.15}s forwards`
                              : "none",
                            opacity: 0,
                          }}
                        >
                          {/* Type node */}
                          <div className="flex flex-col items-center gap-2">
                            <span className="uppercase text-white/15 text-[8px] tracking-[6px] font-medium">
                              Entity Type
                            </span>
                            <div className="group relative rounded-xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.08] shadow-[0_16px_50px_rgba(0,0,0,0.7)] px-8 py-4 text-center min-w-[160px] hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-500 cursor-default">
                              <div className="font-semibold text-white text-sm tracking-tight">
                                {type}s
                              </div>
                              <div className="text-white/30 text-[10px] mt-0.5 font-medium">
                                {typeCount} {typeCount === 1 ? "entity" : "entities"}
                              </div>
                            </div>
                          </div>

                          {visibleLayers.has("REL_STATE") && (
                            <>
                              <AnimatedEdge delay={0.3 + currentTypeIndex * 0.2} />

                              {/* State nodes row */}
                              <div className="flex gap-4">
                                {Object.entries(states).map(([state, list], stateIdx) => {
                                  const style = STATE_STYLES[state] || DEFAULT_STYLE;
                                  const isAtRisk = state === "AT_RISK";
                                  return (
                                    <div key={state} className="flex flex-col items-center gap-0">
                                      <div
                                        className={`relative rounded-xl ${style.bg} border ${style.border} px-5 py-3.5 text-center transition-all duration-500 hover:scale-105 cursor-default`}
                                        style={{
                                          animation: isAtRisk ? "glowPulse 2.5s ease-in-out infinite" : undefined,
                                          boxShadow: isAtRisk
                                            ? undefined
                                            : `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(${style.rgb},0.05)`,
                                        }}
                                      >
                                        {/* Pulse ring for AT_RISK */}
                                        {isAtRisk && (
                                          <div className="absolute inset-0 rounded-xl pointer-events-none">
                                            <div
                                              className="absolute inset-0 rounded-xl border border-red-500/30"
                                              style={{ animation: "pulseRing 3s ease-out infinite" }}
                                            />
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 justify-center relative">
                                          <span className={`w-2 h-2 rounded-full ${style.dot} ${style.glow} ${isAtRisk ? "animate-pulse" : ""}`} />
                                          <span className={`font-bold text-xs tracking-wide ${style.text}`}>
                                            {state.replace("_", " ")}
                                          </span>
                                        </div>
                                        <div className="text-white/25 text-[10px] mt-1 font-medium relative">
                                          {list.length} {list.length === 1 ? "entity" : "entities"}
                                        </div>
                                      </div>

                                      {/* Entity pills */}
                                      {visibleLayers.has("ENTITIES") && (
                                        <>
                                          <AnimatedEdge
                                            color={style.rgb}
                                            alert={isAtRisk}
                                            delay={0.5 + stateIdx * 0.15}
                                          />
                                          <div className="flex flex-col gap-2 max-w-[200px]">
                                            {list.slice(0, 6).map((e, eIdx) => {
                                              const hasAlert = !!alertsByEntity[e.entity_id]?.length;
                                              const isSelected = e.entity_id === selectedId;
                                              return (
                                                <button
                                                  key={e.entity_id}
                                                  onClick={() => setSelectedId(isSelected ? null : e.entity_id)}
                                                  className={`group/pill relative font-medium rounded-full text-xs px-4 py-2 border transition-all duration-300 text-left cursor-pointer ${
                                                    isSelected
                                                      ? "bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-105"
                                                      : hasAlert
                                                      ? "bg-red-950/60 text-red-400 border-red-500/40 hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:scale-105"
                                                      : "bg-white/[0.04] text-white/60 border-white/[0.08] hover:border-white/25 hover:bg-white/[0.08] hover:text-white/90 hover:scale-105"
                                                  }`}
                                                  style={{
                                                    animation: mounted
                                                      ? `floatIn 0.5s cubic-bezier(0.16,1,0.3,1) ${0.6 + eIdx * 0.08}s forwards`
                                                      : "none",
                                                    opacity: 0,
                                                  }}
                                                >
                                                  {/* Active indicator dot */}
                                                  {isSelected && (
                                                    <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                                                  )}
                                                  {e.entity_id}
                                                </button>
                                              );
                                            })}
                                            {list.length > 6 && (
                                              <span className="text-white/20 text-[10px] text-center font-medium">
                                                +{list.length - 6} more
                                              </span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Legend panel (left) ───────────────────────────── */}
          <div className="hidden md:block absolute left-6 top-6 z-10 rounded-2xl bg-[#0c0e10]/90 backdrop-blur-xl border border-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-5 w-52">
            <div className="uppercase text-white/25 text-[8px] tracking-[6px] mb-4 font-bold">
              Layer Guide
            </div>
            <div className="flex flex-col gap-3">
              {Object.entries(STATE_STYLES).map(([state, style]) => (
                <div key={state} className="flex items-center gap-3 group/legend cursor-default">
                  <span className={`w-2.5 h-2.5 rounded-full ${style.dot} ${style.glow} transition-transform duration-300 group-hover/legend:scale-125`} />
                  <span className={`text-xs font-medium ${style.text} transition-all duration-300 group-hover/legend:translate-x-0.5`}>
                    {state.replace("_", " ")}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/[0.06] mt-1 pt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-px bg-gradient-to-r from-white/40 to-transparent" />
                  <span className="text-white/25 text-[10px]">Normal edge</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-px bg-gradient-to-r from-red-500/70 to-transparent" />
                  <span className="text-red-400/50 text-[10px]">Risk edge</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Focused node panel (right) ────────────────────── */}
          {selected && (
            <div
              className="absolute right-6 top-6 z-10 rounded-2xl bg-[#0c0e10]/90 backdrop-blur-xl border border-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-5 w-72"
              style={{ animation: "panelSlide 0.4s cubic-bezier(0.16,1,0.3,1) forwards" }}
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="uppercase text-white/25 text-[8px] tracking-[6px] font-bold">
                    Focused Node
                  </div>
                  <div className="font-bold text-white text-lg mt-1 tracking-tight">
                    {selected.entity_id}
                  </div>
                </div>
                <div
                  className={`font-bold rounded-full text-[10px] px-2.5 py-1 border ${
                    (STATE_STYLES[selected.state] || DEFAULT_STYLE).border
                  } ${(STATE_STYLES[selected.state] || DEFAULT_STYLE).bg} ${
                    (STATE_STYLES[selected.state] || DEFAULT_STYLE).text
                  }`}
                >
                  {selected.state?.replace("_", " ")}
                </div>
              </div>
              <div className="text-white/35 text-xs mt-2 font-medium">
                {selected.entity_type} · {selected.event_count} events · {selected.open_promises} open promises
              </div>

              {topAlert ? (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] mt-4 p-4">
                  <div className="text-white/55 text-xs leading-5">
                    {topAlert.promise_description}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-white/25 text-[10px] font-medium">Entropy score</span>
                    <span className="font-bold text-red-400 text-xs">{topAlert.entropy_score.toFixed(2)}</span>
                  </div>
                  <div className="rounded-full bg-white/[0.06] mt-2 h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(topAlert.entropy_score * 100, 100)}%`,
                        boxShadow: "0 0 12px rgba(239,68,68,0.5)",
                      }}
                    />
                  </div>
                  <div className="text-white/20 text-[10px] mt-2 font-medium">
                    {topAlert.days_elapsed} days elapsed
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] mt-4 p-4 text-white/25 text-xs text-center">
                  No open promises tracked.
                </div>
              )}

              <Link
                href={`/dashboard/customer/${selected.entity_id}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white text-black text-sm font-bold py-2.5 shadow-[0_8px_30px_rgba(255,255,255,0.15)] hover:bg-neutral-100 hover:shadow-[0_12px_40px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all duration-300"
              >
                <ArrowRight className="w-4 h-4" />
                View Entity
              </Link>
            </div>
          )}

          {/* ── Footer toolbar ────────────────────────────────── */}
          <div className="shrink-0 backdrop-blur-xl bg-[#060809]/90 border-t border-white/[0.06] flex justify-between items-center px-6 py-3 relative z-20">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.04] text-white/60 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white transition-all duration-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetSelection}
                className="flex items-center gap-2 rounded-full bg-white text-[#111111] text-xs font-bold border border-white px-4 py-2 shadow-[0_4px_20px_rgba(255,255,255,0.12)] hover:shadow-[0_8px_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Zoom to Fit
              </button>
              <button
                onClick={handleZoomIn}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.04] text-white/60 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white transition-all duration-200"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-5 bg-white/[0.08] mx-1" />
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="flex items-center gap-2 rounded-full bg-white/[0.04] text-white/80 text-xs font-medium border border-white/[0.06] px-3 py-1.5 hover:bg-white/[0.08] hover:text-white transition-all duration-200 cursor-pointer"
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="w-3.5 h-3.5" /> Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize className="w-3.5 h-3.5" /> Fullscreen
                  </>
                )}
              </button>
            </div>

            {/* Layer toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={collapseAll}
                className={`rounded-full text-[10px] font-medium border px-3 py-1.5 transition-all duration-300 cursor-pointer ${
                  visibleLayers.size === 0
                    ? "bg-white/15 text-white border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                    : "bg-white/[0.04] text-white/35 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/50"
                }`}
              >
                Collapse
              </button>
              {([
                ["CORE", "CORE"],
                ["ENTITY_TYPE", "ENTITY TYPE"],
                ["REL_STATE", "REL. STATE"],
                ["ENTITIES", "ENTITIES"],
              ] as [Layer, string][]).map(([key, label]) => {
                const active = visibleLayers.has(key);
                const isEntities = key === "ENTITIES";
                return (
                  <button
                    key={key}
                    onClick={() => toggleLayer(key)}
                    className={`rounded-full text-[10px] font-medium border px-3 py-1.5 transition-all duration-300 cursor-pointer ${
                      active
                        ? isEntities
                          ? "bg-red-500/15 text-red-400 border-red-500/25 shadow-[0_0_14px_rgba(239,68,68,0.2)]"
                          : "bg-white/15 text-white border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                        : "bg-white/[0.04] text-white/35 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.06] px-4 py-2 focus-within:border-white/20 focus-within:bg-white/[0.06] transition-all duration-300"
            >
              <Search className="w-3.5 h-3.5 text-white/25" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Focus on entity…"
                className="bg-transparent outline-none text-white/70 text-xs placeholder:text-white/25 w-40"
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
