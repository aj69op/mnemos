"use client";

import { useEffect, useState } from "react";
import { api, TimelineEvent, Commitment } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";

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
      case "TRUSTED": return <span className="px-3 py-1 rounded border border-emerald-500/30 text-sm font-bold bg-emerald-500/15 text-emerald-400">TRUSTED</span>;
      case "ENGAGED": return <span className="px-3 py-1 rounded border border-electric-500/30 text-sm font-bold bg-electric-500/15 text-electric-400">ENGAGED</span>;
      case "PROSPECT": return <span className="px-3 py-1 rounded border border-violet-500/30 text-sm font-bold bg-violet-500/15 text-violet-400">PROSPECT</span>;
      case "AT_RISK": return <span className="px-3 py-1 rounded border border-red-500/30 text-sm font-bold bg-red-500/15 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]">AT_RISK</span>;
      case "CHURNED": return <span className="px-3 py-1 rounded border border-slate-500/30 text-sm font-bold bg-slate-500/15 text-slate-400">CHURNED</span>;
      default: return <span className="px-3 py-1 rounded border border-slate-500/30 text-sm font-bold bg-white/5 text-slate-300">{st}</span>;
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-10 h-10 border-2 border-electric-500/30 border-t-electric-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm tracking-widest uppercase">Loading Profile</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-200 font-sans">
      <main className="w-full space-y-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 flex items-center justify-center drop-shadow-[0_0_5px_rgba(59,130,246,0.5)] group-hover:drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-300">
                <img src="/logo_transparent.png" alt="Mnemos Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-electric-400 transition-colors">Mnemos</span>
            </Link>
            <span className="text-slate-600">/</span>
            <h1 className="text-2xl font-bold text-white">{id}</h1>
          </div>
          {getStateBadge(state)}
        </div>
        {/* Commitments Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Open Commitments</h2>
          {commitments.filter(c => !c.resolved).length === 0 ? (
            <div className="p-6 rounded-lg glass-panel text-slate-400">
              No open commitments.
            </div>
          ) : (
            <div className="grid gap-4">
              {commitments.filter(c => !c.resolved).map((c, i) => (
                <div key={i} className="p-4 rounded-lg glass-panel space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-white/5 border border-white/10 text-slate-300 uppercase">{c.promise_type}</span>
                      <p className="text-slate-200 font-medium">{c.description}</p>
                    </div>
                    <span className="text-sm text-slate-400">Made by <span className="text-slate-300">{c.made_by}</span></span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Entropy Score: <span className="text-white font-mono">{c.entropy_score.toFixed(2)}</span></span>
                      <span>Severity: <span className="text-white">{c.severity.toUpperCase()}</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 border border-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          c.severity === 'critical' ? 'bg-gradient-to-r from-red-600 to-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                          c.severity === 'high' ? 'bg-gradient-to-r from-orange-600 to-amber-400' :
                          c.severity === 'medium' ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-electric-600 to-blue-400'
                        }`}
                        style={{ width: `${Math.min((c.entropy_score / 1.5) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Timeline Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Interaction Timeline</h2>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-gradient-to-b before:from-indigo-500/30 before:via-violet-500/20 before:to-transparent">
            {timeline.map((t, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-electric-500/50 bg-slate-900 text-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg shadow-indigo-500/20 z-10">
                  {getSentimentIcon(t.sentiment)}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg glass-panel glass-panel-hover">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400">{new Date(t.timestamp).toLocaleString()}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-white/5 border border-white/10 text-slate-300 uppercase">{t.event_type}</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">{t.raw_text}</p>
                  {t.promises.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <span className="text-xs font-semibold text-electric-400">Extracted Promises:</span>
                      {t.promises.map((p, j) => (
                        <div key={j} className="text-xs text-slate-300 pl-2 border-l-2 border-electric-500/30">
                          {p.description} ({p.made_by})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Query Box */}
        <section className="pt-8 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Query Entity</h2>
          <form onSubmit={handleQuery} className="flex gap-3">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask a question about their interactions..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
            />
            <button 
              type="submit" 
              disabled={querying || !query.trim()}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
            >
              {querying ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Searching...
                </span>
              ) : "Ask"}
            </button>
          </form>
          {answer && (
            <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border border-electric-500/20 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </div>
                <span className="text-[10px] text-electric-400 uppercase tracking-wider font-semibold">Mnemos AI</span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{answer}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
