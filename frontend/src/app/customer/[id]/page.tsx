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
      case "TRUSTED": return <span className="px-3 py-1 rounded text-sm font-semibold bg-green-500/20 text-green-700">TRUSTED</span>;
      case "ENGAGED": return <span className="px-3 py-1 rounded text-sm font-semibold bg-blue-500/20 text-blue-700">ENGAGED</span>;
      case "PROSPECT": return <span className="px-3 py-1 rounded text-sm font-semibold bg-yellow-500/20 text-yellow-700">PROSPECT</span>;
      case "AT_RISK": return <span className="px-3 py-1 rounded text-sm font-semibold bg-red-500/20 text-red-700">AT_RISK</span>;
      case "CHURNED": return <span className="px-3 py-1 rounded text-sm font-semibold bg-gray-500/20 text-gray-700">CHURNED</span>;
      default: return <span className="px-3 py-1 rounded text-sm font-semibold bg-stone-200 text-stone-800">{st}</span>;
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

  if (loading) return <div className="min-h-screen bg-stone-50 text-amber-950 p-8 flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen text-stone-900 font-sans">
      <main className="w-full space-y-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-amber-950 hover:text-amber-600 transition">Mnemos</Link>
            <span className="text-stone-400">/</span>
            <h1 className="text-2xl font-bold text-stone-900">{id}</h1>
          </div>
          {getStateBadge(state)}
        </div>
        {/* Commitments Section */}
        <section>
          <h2 className="text-xl font-semibold text-amber-950 mb-4">Open Commitments</h2>
          {commitments.filter(c => !c.resolved).length === 0 ? (
            <div className="p-6 rounded-lg bg-white border border-stone-200 text-stone-600">
              No open commitments.
            </div>
          ) : (
            <div className="grid gap-4">
              {commitments.filter(c => !c.resolved).map((c, i) => (
                <div key={i} className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-700 uppercase">{c.promise_type}</span>
                      <p className="text-stone-900 font-medium">{c.description}</p>
                    </div>
                    <span className="text-sm text-stone-600">Made by {c.made_by}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-stone-600">
                      <span>Entropy Score: {c.entropy_score.toFixed(2)}</span>
                      <span>Severity: {c.severity.toUpperCase()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          c.severity === 'critical' ? 'bg-red-500' :
                          c.severity === 'high' ? 'bg-orange-500' :
                          c.severity === 'medium' ? 'bg-yellow-500' : 'bg-stone-400'
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
          <h2 className="text-xl font-semibold text-amber-950 mb-4">Interaction Timeline</h2>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-300 before:to-transparent">
            {timeline.map((t, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-stone-200 bg-white text-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow z-10">
                  {getSentimentIcon(t.sentiment)}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg bg-white border border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-stone-600">{new Date(t.timestamp).toLocaleString()}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-700 uppercase">{t.event_type}</span>
                  </div>
                  <p className="text-stone-800 text-sm mb-3">{t.raw_text}</p>
                  {t.promises.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-200/50 space-y-2">
                      <span className="text-xs font-semibold text-amber-600">Extracted Promises:</span>
                      {t.promises.map((p, j) => (
                        <div key={j} className="text-xs text-stone-600 pl-2 border-l-2 border-stone-300">
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
        <section className="pt-8 border-t border-stone-200">
          <h2 className="text-xl font-semibold text-amber-950 mb-4">Query Entity</h2>
          <form onSubmit={handleQuery} className="flex gap-3">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask a question about their interactions..."
              className="flex-1 bg-white border border-stone-200 rounded-lg px-4 py-2 text-stone-900 focus:outline-none focus:border-amber-600 transition"
            />
            <button 
              type="submit" 
              disabled={querying || !query.trim()}
              className="bg-amber-800 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition"
            >
              {querying ? "Searching..." : "Ask"}
            </button>
          </form>
          {answer && (
            <div className="mt-6 p-5 rounded-lg bg-white border border-stone-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-600 font-semibold">Mnemos AI</span>
              </div>
              <p className="text-stone-800 whitespace-pre-wrap">{answer}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
