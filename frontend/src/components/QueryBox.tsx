"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface QueryBoxProps {
  entityId: string;
}

export default function QueryBox({ entityId }: QueryBoxProps) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{ answer: string; search_mode: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await api.queryEntity(entityId, query.trim());
      setResponse(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-electric-500/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(129, 140, 248)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Natural Language Query</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ask anything about this entity</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What promises have we broken? How is sentiment trending?"
            className="w-full !bg-white border border-gray-200/50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-slate-400 focus:!bg-white focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200 outline-none shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Thinking...
              </span>
            ) : (
              "Ask"
            )}
          </button>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="mt-4 animate-slide-up">
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border border-electric-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              <span className="text-[10px] text-electric-400 uppercase tracking-wider font-semibold">
                AI Response · {response.search_mode} mode
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {response.answer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
