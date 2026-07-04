"use client";

import { useState } from "react";
import { Zap, Send, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { api, IngestResponse } from "@/lib/api";

export default function MemifyPage() {
  const [entityId, setEntityId] = useState("");
  const [entityType, setEntityType] = useState("Customer");
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !entityId.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.ingestEvent({
        text,
        entity_id: entityId,
        entity_type: entityType,
        date: date || undefined
      });
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError("Failed to memify interaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setText("");
    setResult(null);
    setError(null);
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === "positive") return "😊";
    if (sentiment === "negative") return "😠";
    return "😐";
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "TRUSTED": return "bg-green-50 text-green-800 border-green-200";
      case "ENGAGED": return "bg-cyan-50 text-teal-700 border-emerald-200";
      case "PROSPECT": return "bg-slate-50 text-slate-700 border-slate-300";
      case "AT_RISK": return "bg-amber-50 text-amber-700 border-amber-200";
      case "CHURNED": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#111111]">
      <div className="border-b border-gray-200 px-8 pt-8 pb-6">
        <h1 className="font-bold text-2xl leading-8 flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#1E3A2F]" />
          Memify
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Transform raw interactions into structured relationship memory.
        </p>
      </div>

      <div className="px-8 py-8 space-y-8 max-w-4xl">
        {!result ? (
          <form onSubmit={handleSubmit} className="shadow-[0_16px_38px_rgba(17,17,17,0.06)] rounded-2xl bg-white border border-gray-200 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="uppercase text-[11px] tracking-widest text-gray-400 font-bold block">Entity ID *</label>
                <input 
                  type="text" 
                  value={entityId}
                  onChange={e => setEntityId(e.target.value)}
                  placeholder="e.g. CUST-0123"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="uppercase text-[11px] tracking-widest text-gray-400 font-bold block">Entity Type</label>
                <select 
                  value={entityType}
                  onChange={e => setEntityType(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] outline-none transition-all"
                >
                  <option value="Customer">Customer</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Partner">Partner</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="uppercase text-[11px] tracking-widest text-gray-400 font-bold block">Date (Optional)</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="uppercase text-[11px] tracking-widest text-gray-400 font-bold block flex justify-between">
                <span>Interaction Text *</span>
                <span className="text-gray-300 font-normal normal-case">Paste conversation, email, or meeting notes</span>
              </label>
              <textarea 
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste the raw interaction here..."
                rows={6}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] outline-none transition-all resize-y"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-sm font-medium animate-fade-in">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button 
                type="submit" 
                disabled={loading || !text.trim() || !entityId.trim()}
                className="bg-[#1E3A2F] hover:bg-[#152a22] text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-[0_8px_20px_rgba(30,58,47,0.3)] transition-all duration-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="relative w-3 h-3 flex">
                      <span className="inline-flex animate-ping opacity-70 rounded-full bg-white absolute w-full h-full" />
                      <span className="relative inline-flex w-3 h-3 rounded-full bg-white" />
                    </span>
                    Memifying...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Memify This Interaction
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="animate-slide-up space-y-6">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="text-emerald-800 font-bold">Successfully Memified</h3>
                <p className="text-emerald-600 text-sm">Interaction processed and stored in the knowledge graph.</p>
              </div>
            </div>

            <div className="shadow-[0_16px_38px_rgba(17,17,17,0.06)] rounded-2xl bg-white border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-[#111111]">Analysis Results</h3>
                <span className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-1 rounded">{result.entity_id}</span>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                    <div className="uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2">Event Type</div>
                    <div className="font-bold text-[#111111] bg-gray-100 w-fit px-2.5 py-1 rounded-md text-sm">{result.event_type}</div>
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                    <div className="uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2">Sentiment</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getSentimentIcon(result.sentiment)}</span>
                      <div className="flex-1">
                        <div className="capitalize font-bold text-sm text-[#111111]">{result.sentiment}</div>
                        <div className="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${result.sentiment_intensity * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                    <div className="uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2">Promises Found</div>
                    <div className="font-bold text-3xl text-[#1E3A2F]">{result.promises_found}</div>
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                    <div className="uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2">State Result</div>
                    <div className={`font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border w-fit ${getStateColor(result.relationship_state)}`}>
                      {result.relationship_state}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="uppercase text-[11px] tracking-widest text-gray-400 font-bold mb-3 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> ERP Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.erp_tags.length > 0 ? result.erp_tags.map(tag => (
                        <span key={tag} className="bg-gray-100 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">{tag}</span>
                      )) : <span className="text-sm text-gray-400">None detected</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="uppercase text-[11px] tracking-widest text-gray-400 font-bold mb-3 flex items-center gap-2">
                      <Network className="w-3 h-3" /> Relationship Signals
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.relationship_signals.length > 0 ? result.relationship_signals.map(signal => (
                        <span key={signal} className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">{signal}</span>
                      )) : <span className="text-sm text-gray-400">None detected</span>}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                     <div className="text-xs text-gray-500 flex items-center gap-2">
                       Cognee Network Status: 
                       <span className={`font-bold ${result.cognee_status.includes('success') ? 'text-emerald-600' : 'text-amber-600'}`}>
                         {result.cognee_status}
                       </span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <button 
                onClick={handleReset}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 flex items-center gap-2"
              >
                Memify Another Interaction
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-6 flex items-start gap-4 text-sm text-gray-600">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-[#1E3A2F]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#111111]">Memify Tips</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Include specific dates, names, and commitments for best results.</li>
              <li>The AI engine extracts promises, sentiment, and relationship signals automatically.</li>
              <li>Each interaction updates the entity's relationship state in real-time.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
