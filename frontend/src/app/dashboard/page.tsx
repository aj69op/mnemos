"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, CrossEntityQueryResponse } from "@/lib/api";
import { Building2, Search, Bell, Shield, AlertOctagon, Flag, ShieldCheck, ChevronDown, Filter, Calendar, MoreHorizontal, X, ArrowRight, Tag, Zap, Mail, Layers, Loader2 } from "lucide-react";
import ConflictBanner from "@/components/ConflictBanner";
import DraftFollowupModal from "@/components/DraftFollowupModal";
import EntropyTicker from "@/components/EntropyTicker";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>({ total: 10, critical: 9, high: 1, medium: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([{entity_id: 'ananya_foods_pvt'}, {entity_id: 'priya_pharma'}]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "critical">("latest");
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Draft Follow-up modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntityId, setModalEntityId] = useState("");
  const [modalDraft, setModalDraft] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Cross-Entity Insights
  const [crossQuery, setCrossQuery] = useState("");
  const [crossResult, setCrossResult] = useState<CrossEntityQueryResponse | null>(null);
  const [crossLoading, setCrossLoading] = useState(false);
  const [crossError, setCrossError] = useState<string | null>(null);

  const sampleQueries = [
    "Which vendors have delivery issues?",
    "What customers are at risk?",
    "Who has payment problems?",
    "Show me all referrals",
    "List contracts & renewals",
  ];

  const handleCrossQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crossQuery.trim()) return;
    setCrossLoading(true);
    setCrossError(null);
    setCrossResult(null);
    try {
      const res = await api.queryCrossEntity(crossQuery.trim());
      setCrossResult(res);
    } catch (err) {
      setCrossError(err instanceof Error ? err.message : "Cross-entity query failed");
    } finally {
      setCrossLoading(false);
    }
  };

  const handleBellClick = () => {
    setActiveFilter("critical");
  };

  const handleClearAtRisk = (entityId: string) => {
    setAtRisk(prev => prev.filter(e => e.entity_id !== entityId));
  };

  useEffect(() => {
    api.getAlerts().then(res => {
      if (res.summary) setMetrics(res.summary);
      if (res.alerts) setAlerts(res.alerts);
      if (res.at_risk_entities) setAtRisk(res.at_risk_entities);
    });
  }, []);

  const filteredAlerts = alerts.filter((alert, i) => {
    if (dismissedIds.has(i)) return false;
    if (activeFilter === "all") return true;
    return alert.severity === activeFilter;
  }).filter(alert => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return alert.entity_id.toLowerCase().includes(q) ||
           (alert.promise_description || "").toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sortOrder === "critical") {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity as keyof typeof sev] ?? 4) - (sev[b.severity as keyof typeof sev] ?? 4);
    }
    return 0; // latest = keep original order (chronological)
  });

  const handleDismiss = (index: number) => {
    setDismissedIds(prev => new Set(prev).add(index));
  };

  const handleDraftFollowup = async (entityId: string, context: string) => {
    setModalEntityId(entityId);
    setModalDraft("");
    setModalLoading(true);
    setModalOpen(true);
    try {
      const res = await api.draftFollowup(entityId, context);
      setModalDraft(res.draft);
    } catch {
      setModalDraft(`Dear ${entityId.replace(/_/g, ' ')}, I wanted to follow up regarding this matter. Could we schedule a call to discuss? Best regards.`);
    } finally {
      setModalLoading(false);
    }
  };

  const filterTabs = [
    { key: "all", label: "All", count: alerts.filter((_, i) => !dismissedIds.has(i)).length, dotColor: "bg-transparent", countColor: "text-white/70" },
    { key: "critical", label: "Critical", count: alerts.filter((a, i) => !dismissedIds.has(i) && a.severity === "critical").length, dotColor: "bg-red-500", countColor: "text-red-500" },
    { key: "high", label: "High", count: alerts.filter((a, i) => !dismissedIds.has(i) && a.severity === "high").length, dotColor: "bg-blue-500", countColor: "text-blue-500" },
    { key: "medium", label: "Medium", count: alerts.filter((a, i) => !dismissedIds.has(i) && a.severity === "medium").length, dotColor: "bg-emerald-500", countColor: "text-emerald-500" },
  ];

  return (
    <div className="p-10 h-full min-h-full bg-[#FAFAFA] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bold text-gray-900 text-[28px] tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-[14px] mt-1 font-medium">A live overview of alerts, risk signals, and relationship health.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search entities, alerts..." 
              className="pl-10 pr-12 py-2 !bg-white border border-gray-200 rounded-xl text-[13px] w-[280px] focus:outline-none focus:!bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400 shadow-sm font-medium"
            />
            <div className="absolute right-3 flex items-center gap-1 text-[11px] text-gray-400 font-bold border border-gray-100 bg-gray-50 px-1.5 py-0.5 rounded-md">
              <span>⌘</span><span>K</span>
            </div>
          </div>
          <button onClick={handleBellClick} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center relative hover:bg-gray-50 transition-colors shadow-sm" title="Show critical alerts">
            <Bell className="w-[18px] h-[18px] text-gray-600" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white box-content" />
          </button>
        </div>
      </div>

      {/* Main layout: content + sidebar */}
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Metrics */}
          <section className="grid grid-cols-4 gap-4 mb-8">
            {/* Total Alerts */}
            <div className="bg-white rounded-[20px] border border-gray-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start mb-4">
                <div className="uppercase text-gray-500 text-[11px] font-bold tracking-wider">Total Alerts</div>
                <div className="w-10 h-10 rounded-xl bg-[#E8F3EF] flex items-center justify-center text-emerald-600">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[40px] font-bold text-gray-900 leading-none mb-4">{metrics.total || 0}</div>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 mb-8">
                <span className="text-emerald-500 text-[15px]">↗</span>
                <span>25% from last 7 days</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[3px] bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0A3020] rounded-full w-[100%]" />
                </div>
                <span className="text-[11px] text-gray-500 font-bold">{metrics.total || 0} alerts</span>
              </div>
            </div>

            {/* Critical */}
            <div className="bg-white rounded-[20px] border border-red-100 p-6 shadow-[0_4px_24px_rgba(239,68,68,0.06)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/40 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="uppercase text-gray-500 text-[11px] font-bold tracking-wider">Critical</div>
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                    <AlertOctagon className="w-5 h-5 fill-red-100" />
                  </div>
                </div>
                <div className="text-[40px] font-bold text-gray-900 leading-none mb-4">{metrics.critical || 0}</div>
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-red-600 mb-8">
                  <span className="text-red-500 text-[15px]">↗</span>
                  <span>12% from last 7 days</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[3px] bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full w-[90%]" />
                  </div>
                  <span className="text-[11px] text-gray-500 font-bold">90%</span>
                </div>
              </div>
            </div>

            {/* High */}
            <div className="bg-white rounded-[20px] border border-gray-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start mb-4">
                <div className="uppercase text-gray-500 text-[11px] font-bold tracking-wider">High</div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <Flag className="w-5 h-5 fill-blue-100" />
                </div>
              </div>
              <div className="text-[40px] font-bold text-gray-900 leading-none mb-4">{metrics.high || 0}</div>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-blue-600 mb-8">
                <span className="text-blue-500 text-[15px]">↗</span>
                <span>5% from last 7 days</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[3px] bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-[10%]" />
                </div>
                <span className="text-[11px] text-gray-500 font-bold">10%</span>
              </div>
            </div>

            {/* Medium */}
            <div className="bg-white rounded-[20px] border border-gray-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start mb-4">
                <div className="uppercase text-gray-500 text-[11px] font-bold tracking-wider">Medium</div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <ShieldCheck className="w-5 h-5 fill-emerald-100" />
                </div>
              </div>
              <div className="text-[40px] font-bold text-gray-900 leading-none mb-4">{metrics.medium || 0}</div>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 mb-8">
                <span className="text-emerald-500 text-[15px]">→</span>
                <span>0% from last 7 days</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[3px] bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-200 rounded-full w-[0%]" />
                </div>
                <span className="text-[11px] text-gray-500 font-bold">0%</span>
              </div>
            </div>
          </section>

          {/* At-risk Entities & Filters */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {atRisk.map((entity, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-gray-700 shadow-sm">
                  <Building2 className="w-[14px] h-[14px] text-gray-400" />
                  <span>{entity.entity_id}</span>
                  <button onClick={() => handleClearAtRisk(entity.entity_id)} className="text-gray-400 hover:text-gray-600 ml-1" title="Remove from view">
                    <X className="w-3 h-3" strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { setActiveFilter("all"); setSortOrder("latest"); }} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-[13px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>May 6 – May 13, 2025</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
              </button>
              <button onClick={() => { const el = document.querySelector('[data-cross-input]'); if (el) (el as HTMLInputElement).focus(); }} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-[13px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4 text-gray-400" />
                <span>Cross-Query</span>
              </button>
            </div>
          </div>

          {/* List Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              {filterTabs.map(tab => {
                const isActive = activeFilter === tab.key;
                const activeBg = tab.key === "critical" ? "bg-red-600"
                  : tab.key === "high" ? "bg-blue-600"
                  : tab.key === "medium" ? "bg-emerald-600"
                  : "bg-[#0A3020]";
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
                      isActive ? `${activeBg} text-white shadow-md` : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                    <span className={`px-2 py-0.5 rounded-full text-[11px] flex items-center justify-center ${isActive ? "bg-white/10 text-white/90" : "bg-gray-200 text-gray-500"}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setSortOrder(prev => prev === "latest" ? "critical" : "latest")}>
              <span>Sort by: {sortOrder === "critical" ? "Critical First" : "Latest"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* Conflict Banners — rendered ABOVE alerts */}
          <ConflictBanner onDraftFollowup={handleDraftFollowup} />

          {/* Alert List */}
          <div className="flex flex-col gap-4">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert, i) => {
                const originalIndex = alerts.indexOf(alert);
                const isCritical = alert.severity === 'critical';
                const isHigh = alert.severity === 'high';
                const isMedium = alert.severity === 'medium';
                const borderColor = isCritical ? 'border-l-red-500' : isHigh ? 'border-l-blue-500' : isMedium ? 'border-l-emerald-500' : 'border-l-gray-300';
                
                return (
                  <div
                    key={originalIndex}
                    className={`bg-white rounded-2xl border border-gray-100 border-l-2 ${borderColor} p-6 shadow-sm hover:shadow-md transition-shadow relative`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-5 flex-1">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2.5">
                            <h3 className="font-bold text-gray-900 text-[16px]">{alert.entity_id}</h3>
                            <div className="px-2.5 py-0.5 rounded-full bg-gray-100/80 text-gray-600 text-[11px] font-bold tracking-wide">{alert.entity_type || 'Customer'}</div>
                            <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCritical ? 'bg-red-50 text-red-600' :
                              isHigh ? 'bg-blue-50 text-blue-600' :
                              isMedium ? 'bg-emerald-50 text-emerald-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {alert.severity}
                            </div>
                          </div>
                          <p className="text-gray-600 text-[14px] leading-relaxed max-w-3xl font-medium">
                            {alert.promise_description}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-50 text-[12px] text-gray-500 font-bold">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-[14px] h-[14px]" />
                              <span>May 13, 2025 • {isCritical ? '8:13 AM' : '7:45 AM'}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-2">
                              <Tag className="w-[14px] h-[14px] text-gray-400" />
                              <span>{isCritical ? 'Contract • SLA Risk' : 'Follow-up • Commitment Risk'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 mt-4">
                            <Link href={`/dashboard/customer/${alert.entity_id}`} className="flex items-center gap-1.5 text-[13px] font-bold text-[#0A3020] hover:text-[#1E3A2F] transition-colors">
                              View Entity <ArrowRight className="w-[14px] h-[14px]" />
                            </Link>
                            <button
                              onClick={() => handleDraftFollowup(
                                alert.entity_id,
                                `${alert.severity} alert: ${alert.promise_description}`
                              )}
                              className="flex items-center gap-1.5 text-[13px] font-bold text-amber-600 hover:text-amber-700 transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" /> Draft Follow-up
                            </button>
                            <button
                              onClick={() => handleDismiss(originalIndex)}
                              className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              Dismiss <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Risk Score */}
                      <div className="flex flex-col items-center justify-center bg-red-50/50 rounded-2xl px-8 py-4 ml-6 mr-10 min-w-[120px]">
                        <span className="text-[11px] font-bold text-red-700/80 mb-1">Risk Score</span>
                        <span className="text-[26px] font-bold text-red-600 leading-none mb-2">{alert.entropy_score ? (alert.entropy_score * 10).toFixed(2) : (isCritical ? '8.13' : '7.60')}</span>
                        <span className="text-[11px] font-bold text-red-700">Very High</span>
                      </div>
                      
                      <button onClick={() => handleDraftFollowup(alert.entity_id, alert.promise_description)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600" title="Draft follow-up">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500 text-sm p-12 text-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                {activeFilter === "all" ? "No alerts at this time." : `No ${activeFilter} alerts.`}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — Entropy Ticker + Cross-Entity Insights */}
        <div className="w-[320px] shrink-0 space-y-4">
          <EntropyTicker />

          {/* Cross-Entity Insights */}
          <div className="bg-white rounded-[20px] border border-gray-200 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[13px] font-bold text-gray-900">Cross-Entity Insights</h3>
            </div>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              Ask questions spanning multiple entities at once.
            </p>
            <form onSubmit={handleCrossQuery} className="space-y-2">
              <input
                data-cross-input
                type="text"
                value={crossQuery}
                onChange={e => setCrossQuery(e.target.value)}
                placeholder="e.g. Which vendors have delivery issues?"
                className="w-full !bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:!bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 transition-all"
              />
              <button
                type="submit"
                disabled={crossLoading || !crossQuery.trim()}
                className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 text-white text-[12px] font-bold px-3 py-2 rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                {crossLoading ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Searching...</>
                ) : (
                  <><Layers className="w-3 h-3" /> Ask Across All Entities</>
                )}
              </button>
            </form>

            {/* Sample queries */}
            {!crossResult && !crossError && (
              <div className="mt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Try asking:</p>
                <div className="flex flex-wrap gap-1.5">
                  {sampleQueries.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCrossQuery(sq);
                        setCrossLoading(true);
                        setCrossError(null);
                        setCrossResult(null);
                        api.queryCrossEntity(sq).then(res => {
                          setCrossResult(res);
                          setCrossLoading(false);
                        }).catch(err => {
                          setCrossError(err instanceof Error ? err.message : "Query failed");
                          setCrossLoading(false);
                        });
                      }}
                      className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[10px] text-gray-600 font-medium hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {crossError && (
              <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium">
                {crossError}
              </div>
            )}

            {crossResult && (
              <div className="mt-3 animate-fade-in max-h-[400px] overflow-y-auto">
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">
                      {crossResult.search_mode === "cognee_cross_entity_graph_completion" ? "Cognee Graph" :
                       crossResult.search_mode === "cognee_cross_entity_insights" ? "Cognee Insights" :
                       crossResult.search_mode === "cognee_cross_entity_chunks" ? "Cognee Chunks" :
                       crossResult.search_mode === "local_overview" ? "Local Overview" : "AI Response"}
                    </span>
                    <button onClick={() => setCrossResult(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {crossResult.answer}
                  </p>
                  {crossResult.entities_searched.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Searched entities</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {crossResult.entities_searched.map(eid => (
                          <span key={eid} className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                            {eid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Draft Follow-up Modal */}
      <DraftFollowupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        entityId={modalEntityId}
        draft={modalDraft}
        isLoading={modalLoading}
      />
    </div>
  );
}
