"use client";

import { useEffect, useState } from "react";
import { api, Alert, Summary, Entity } from "@/lib/api";
import Link from "next/link";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const [alertsData, entitiesData] = await Promise.all([
        api.getAlerts(),
        api.getEntities(),
      ]);
      setAlerts(alertsData.alerts || []);
      setSummary(alertsData.summary || null);
      setEntities(entitiesData.entities || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const severityConfig: Record<string, { dot: string; badge: string; bar: string; glow: string }> = {
    critical: { dot: "bg-red-500", badge: "bg-red-500/20 text-red-400 border-red-500/30", bar: "bg-gradient-to-r from-red-600 to-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.6)]", glow: "shadow-red-500/20" },
    high:     { dot: "bg-orange-500", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30", bar: "bg-gradient-to-r from-orange-600 to-amber-400", glow: "shadow-orange-500/20" },
    medium:   { dot: "bg-yellow-500", badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", bar: "bg-gradient-to-r from-yellow-600 to-yellow-400", glow: "shadow-yellow-500/20" },
    low:      { dot: "bg-electric-500", badge: "bg-electric-500/20 text-electric-400 border-electric-500/30", bar: "bg-gradient-to-r from-electric-600 to-blue-400", glow: "shadow-electric-500/20" },
  };

  const stateConfig: Record<string, { label: string; cls: string }> = {
    TRUSTED:  { label: "TRUSTED",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    ENGAGED:  { label: "ENGAGED",  cls: "bg-electric-500/15 text-blue-400 border-electric-500/30" },
    PROSPECT: { label: "PROSPECT", cls: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
    AT_RISK:  { label: "AT RISK",  cls: "bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" },
    CHURNED:  { label: "CHURNED",  cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  };

  const atRiskCount = entities.filter(e => e.state === "AT_RISK").length;
  const criticalCount = summary?.critical || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 border-2 border-electric-500/30 border-t-electric-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase">Initializing Mnemos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200">
      <main className="w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Live · refreshes every 30s</span>
            </div>
            {/* Critical badge */}
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {criticalCount} Critical
              </div>
            )}
          </div>
        </div>


        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Alerts", value: summary?.total ?? 0, sub: "open commitments", color: "text-white", glow: "hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]" },
            { label: "Critical", value: summary?.critical ?? 0, sub: "require immediate action", color: "text-red-400", glow: "hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:border-red-500/30" },
            { label: "At Risk Entities", value: atRiskCount, sub: "relationships degrading", color: "text-orange-400", glow: "hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:border-orange-500/30" },
            { label: "Total Entities", value: entities.length, sub: "tracked relationships", color: "text-electric-400", glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:border-electric-500/30" },
          ].map((kpi, i) => (
            <div key={i} className={`stat-card p-5 animate-fade-in ${kpi.glow}`} style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{kpi.label}</p>
              <p className={`text-4xl font-bold ${kpi.color} leading-none mb-1`}>{kpi.value}</p>
              <p className="text-xs text-slate-500">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Active Alerts ── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-white tracking-tight">Active Alerts</h2>
              <span className="text-[10px] font-semibold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {alerts.length} open
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Last scan: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>

          {alerts.length === 0 ? (
            <div className="glass-panel p-12 text-center space-y-2">
              <div className="text-2xl mb-3 text-emerald-400">✓</div>
              <p className="text-white font-medium">All relationships healthy</p>
              <p className="text-sm text-slate-400">No open promises past their due date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => {
                const cfg = severityConfig[alert.severity] || severityConfig.low;
                const entropyPct = Math.min((alert.entropy_score / 1.5) * 100, 100);
                return (
                  <Link key={i} href={`/customer/${alert.entity_id}`}>
                    <div
                      className="group glass-panel glass-panel-hover p-5 flex items-center gap-6 cursor-pointer animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
                    >
                      {/* Severity dot */}
                      <div className="hidden md:flex flex-col items-center gap-1.5 w-14 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shadow-[0_0_8px_currentColor] ${alert.severity === 'critical' ? 'animate-[glowCritical_1.5s_ease-in-out_infinite_alternate]' : ''}`} />
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${cfg.badge.split(' ')[1]}`}>{alert.severity}</span>
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-semibold text-white group-hover:text-electric-400 transition-colors">
                            {alert.entity_id}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.badge}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] font-medium text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase tracking-wider">
                            {alert.promise_type?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-snug truncate">{alert.promise_description}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {alert.days_elapsed}d elapsed {alert.due_date ? `· due ${alert.due_date}` : ""}  · made by <span className="text-slate-400">{alert.made_by}</span>
                        </p>
                      </div>

                      {/* Entropy meter */}
                      <div className="hidden md:block w-44 shrink-0 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 uppercase tracking-wider font-semibold">Entropy</span>
                          <span className="font-mono text-white font-semibold">{alert.entropy_score.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 border border-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                            style={{ width: `${entropyPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>0</span><span>1.5</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg className="w-4 h-4 text-slate-500 group-hover:text-electric-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Entities Table ── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white tracking-tight">Relationship Registry</h2>
            <span className="text-[11px] text-slate-500">{entities.length} entities tracked</span>
          </div>

          <div className="glass-panel overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  {["Entity", "Type", "State", "Events", "Open Promises", "Last Interaction"].map(h => (
                    <th key={h} className="px-5 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-sm">
                      No entities yet — import your first CSV to get started.
                    </td>
                  </tr>
                ) : (
                  entities.map((e, i) => {
                    const sc = stateConfig[e.state] || { label: e.state, cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
                    return (
                      <tr key={e.entity_id} className="table-row-hover border-b border-white/5 transition-colors animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                        <td className="px-5 py-4">
                          <Link href={`/customer/${e.entity_id}`} className="font-semibold text-white hover:text-electric-400 transition-colors">
                            {e.entity_id}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                            {e.entity_type}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-300 font-mono text-xs">{e.event_count}</td>
                        <td className="px-5 py-4">
                          {e.open_promises > 0 ? (
                            <span className="text-red-400 font-semibold font-mono text-xs">{e.open_promises}</span>
                          ) : (
                            <span className="text-emerald-400 font-mono text-xs">0</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">
                          {new Date(e.last_interaction).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
