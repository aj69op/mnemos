"use client";

import { useEffect, useState } from "react";
import { api, TimelineEvent, Commitment } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";

export default function CustomerProfile() {
  const params = useParams();
  const id = params.id as string;

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [state, setState] = useState("");
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tl, cmts] = await Promise.all([
          api.getTimeline(id),
          api.getCommitments(id)
        ]);
        setTimeline(tl.timeline || []);
        setState(tl.relationship_state || "");
        setCommitments(cmts.commitments || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getStateBadge = (st: string) => {
    switch (st) {
      case "TRUSTED": return <span className="font-medium rounded-full text-xs px-2 py-0.5 bg-green-50 text-green-800">TRUSTED</span>;
      case "ENGAGED": return <span className="font-medium rounded-full text-xs px-2 py-0.5 bg-cyan-50 text-teal-700">ENGAGED</span>;
      case "PROSPECT": return <span className="font-medium rounded-full text-xs px-2 py-0.5 bg-slate-50 text-slate-700">PROSPECT</span>;
      case "AT_RISK": return <span className="font-medium rounded-full text-xs px-2 py-0.5 bg-amber-50 text-amber-700">AT_RISK</span>;
      case "CHURNED": return <span className="font-medium rounded-full text-xs px-2 py-0.5 bg-red-50 text-red-700">CHURNED</span>;
      default: return <span className="font-medium rounded-full text-xs px-2 py-0.5 bg-gray-50 text-gray-700">{st}</span>;
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === "positive") return "😊";
    if (sentiment === "negative") return "😠";
    return "😐";
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setQuerying(true);
    try {
      const res = await api.queryEntity(id, query);
      setAnswer(res.answer);
    } catch (err) {
      console.error(err);
      setAnswer("Failed to get answer.");
    } finally {
      setQuerying(false);
    }
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-[#1E3A2F] rounded-full animate-spin" />
        <p className="text-gray-400 text-sm tracking-widest uppercase">Loading Profile</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white text-[#111111]">
      <div className="border-b border-gray-200 px-8 pt-8 pb-6">
        <Link href="/dashboard/entities" className="flex items-center gap-2 text-gray-500 hover:text-black mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Entities</span>
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-2xl leading-8">
              Entity: {id}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-gray-500 text-sm">Relationship State:</span>
              {getStateBadge(state)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-8 py-6 space-y-10">
        
        {/* Open Commitments */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg tracking-tight text-[#111111]">Open Commitments</h2>
            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded-md text-gray-600">
              {commitments.filter(c => !c.resolved).length} ACTIVE
            </span>
          </div>
          {commitments.filter(c => !c.resolved).length === 0 ? (
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 text-sm">
              No open commitments.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {commitments.filter(c => !c.resolved).map((c, i) => {
                const isCritical = c.severity === 'critical';
                const isHigh = c.severity === 'high';
                const isMedium = c.severity === 'medium';
                const color = isCritical ? 'red-600' : isHigh ? 'amber-600' : isMedium ? 'yellow-500' : 'teal-500';
                const shadow = isCritical ? 'rgba(220,38,38,0.25)' : isHigh ? 'rgba(217,119,6,0.25)' : 'rgba(20,184,166,0.25)';

                return (
                  <div key={i} className="group shadow-[0_16px_38px_rgba(17,17,17,0.06)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-5 flex items-start gap-4">
                    <div className={`shadow-[0_0_14px_${shadow}] rounded-full bg-${color} mt-1 w-1 h-full min-h-[4rem]`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-600 border border-gray-200">{c.promise_type}</span>
                        <span className="text-xs font-medium text-gray-500">Made by: {c.made_by}</span>
                      </div>
                      <p className="text-gray-800 text-sm font-medium mt-3 leading-6">{c.description}</p>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 w-1/2">
                          <div className="rounded-full bg-gray-100 w-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full bg-${color}`} 
                              style={{ width: `${Math.min((c.entropy_score / 1.5) * 100, 100)}%` }} 
                            />
                          </div>
                          <span className="text-gray-500 text-xs font-medium">{c.entropy_score.toFixed(2)} score</span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider text-${color}`}>
                          {c.severity} SEVERITY
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Timeline */}
        <section>
          <h2 className="font-bold text-lg tracking-tight text-[#111111] mb-6">Interaction Timeline</h2>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-px before:bg-gray-200">
            {timeline.map((t, i) => (
              <div key={i} className="relative flex items-start gap-6 group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gray-100 text-lg shrink-0 z-10 shadow-sm">
                  {getSentimentIcon(t.sentiment)}
                </div>
                <div className="flex-1 shadow-[0_12px_28px_rgba(17,17,17,0.05)] rounded-2xl bg-white border border-gray-100 p-5 transition-all duration-300 hover:shadow-[0_16px_38px_rgba(17,17,17,0.08)]">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{new Date(t.timestamp).toLocaleString()}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-widest">{t.event_type}</span>
                  </div>
                  <p className="text-[#111111] text-sm leading-relaxed">{t.raw_text}</p>
                  
                  {t.promises.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A2F]">Extracted Promises</span>
                      {t.promises.map((p, j) => (
                        <div key={j} className="text-xs font-medium text-gray-600 pl-3 border-l-2 border-[#1E3A2F]/30 py-1">
                          {p.description} <span className="text-gray-400">({p.made_by})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Query Tool */}
        <section className="pt-6">
          <div className="shadow-[0_14px_34px_rgba(17,17,17,0.06)] rounded-2xl bg-gray-50 border border-gray-200 p-6">
            <h2 className="font-bold text-lg tracking-tight text-[#111111] mb-2">Mnemos Intelligence</h2>
            <p className="text-sm text-gray-500 mb-6">Ask natural language questions about this entity's history.</p>
            <form onSubmit={handleQuery} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Ask a question about their interactions..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm text-[#111111] shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] transition-all"
                />
              </div>
              <button 
                type="submit" 
                disabled={querying || !query.trim()}
                className="bg-[#1E3A2F] hover:bg-[#152a22] text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-[0_8px_20px_rgba(30,58,47,0.3)] transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
              >
                {querying ? (
                  <span className="flex items-center gap-2">
                    <span className="relative w-3 h-3 flex">
                      <span className="inline-flex animate-ping opacity-70 rounded-full bg-white absolute w-full h-full" />
                      <span className="relative inline-flex w-3 h-3 rounded-full bg-white" />
                    </span>
                    Searching
                  </span>
                ) : "Query Engine"}
              </button>
            </form>
            {answer && (
              <div className="mt-6 p-5 rounded-xl bg-white border border-[#1E3A2F]/20 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-[#1E3A2F] flex items-center justify-center shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </div>
                  <span className="text-[10px] text-[#1E3A2F] uppercase tracking-widest font-bold">Mnemos AI response</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{answer}</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
