"use client";

import { useState } from "react";
import { Zap, AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { api, MemifyResponse } from "@/lib/api";

export default function MemifyPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoBanner, setDemoBanner] = useState(false);

  const handleRunMemify = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDemoBanner(false);

    try {
      const res = await api.runMemify();
      setResult(res);
    } catch (err: any) {
      if (err?.status === 403) {
        setDemoBanner(true);
      } else {
        console.error(err);
        setError("Failed to run Memify pass. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setDemoBanner(false);
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#111111]">
      <div className="border-b border-gray-200 px-4 md:px-6 lg:px-8 pt-6 pb-4 md:pt-8 md:pb-6">
        <h1 className="font-bold text-2xl leading-8 flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#1E3A2F]" />
          Memify
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Entropy-weighted pruning that compacts low-signal graph nodes to keep memory sharp.
        </p>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-8 space-y-8 max-w-4xl">
        {/* Demo Mode Banner */}
        {demoBanner && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-amber-800 text-sm font-medium">
                Demo mode is active — write operations are disabled on the public instance.
              </span>
            </div>
            <button
              onClick={() => setDemoBanner(false)}
              className="text-amber-600 hover:text-amber-800 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-sm font-medium animate-fade-in">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {!result ? (
          /* Run Memify Card */
          <div className="shadow-[0_16px_38px_rgba(17,17,17,0.06)] rounded-2xl bg-white border border-gray-200 p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F3EF] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-[#1E3A2F]" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-[#111111]">Memory Optimization Pass</h2>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                  Memify scans all stored events and identifies <strong>low-signal noise</strong> — 
                  interactions with neutral sentiment, neutral type, and zero promises. These are 
                  soft-deleted from Mnemos's local memory layer. Cognee's own graph-enrichment
                  pipeline (<code>/cognify</code>) runs on every affected entity to keep the deeper graph current.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">What gets pruned?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-sm font-semibold text-[#111111]">Neutral Type</div>
                  <div className="text-xs text-gray-500 mt-1">Events classified as &quot;neutral&quot; with no action value</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-sm font-semibold text-[#111111]">Neutral Sentiment</div>
                  <div className="text-xs text-gray-500 mt-1">No emotional signal — neither positive nor negative</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-sm font-semibold text-[#111111]">Zero Promises</div>
                  <div className="text-xs text-gray-500 mt-1">No commitments extracted from the interaction</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunMemify}
                disabled={loading}
                className="bg-[#1E3A2F] hover:bg-[#152a22] text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-[0_8px_20px_rgba(30,58,47,0.3)] transition-all duration-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="relative w-3 h-3 flex">
                      <span className="inline-flex animate-ping opacity-70 rounded-full bg-white absolute w-full h-full" />
                      <span className="relative inline-flex w-3 h-3 rounded-full bg-white" />
                    </span>
                    Running Memify Pass...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Run Memify
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="animate-slide-up space-y-6">
            {/* Success Banner */}
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="text-emerald-800 font-bold">Memify Pass Complete</h3>
                <p className="text-emerald-600 text-sm">
                  {result.pruned_count > 0
                    ? `Successfully pruned ${result.pruned_count} low-signal event${result.pruned_count !== 1 ? "s" : ""} from Mnemos's local memory layer.`
                    : "No low-signal events found — your memory is already clean!"}
                </p>
              </div>
            </div>

            {/* Before/After Comparison */}
            <div className="shadow-[0_16px_38px_rgba(17,17,17,0.06)] rounded-2xl bg-white border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h3 className="font-bold text-[#111111]">Pruning Results</h3>
              </div>
              <div className="p-6">
                {/* Large Before → After */}
                <div className="flex items-center justify-center gap-6 py-6">
                  <div className="text-center">
                    <div className="uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2">Before</div>
                    <div className="font-bold text-4xl text-gray-400">{result.nodes_before}</div>
                    <div className="text-xs text-gray-400 mt-1">events</div>
                  </div>
                  <ArrowRight className="w-8 h-8 text-[#1E3A2F]" />
                  <div className="text-center">
                    <div className="uppercase text-[10px] tracking-widest text-[#1E3A2F] font-bold mb-2">After</div>
                    <div className="font-bold text-4xl text-[#1E3A2F]">{result.nodes_after}</div>
                    <div className="text-xs text-gray-500 mt-1">events</div>
                  </div>
                </div>

                {/* Pruned Count */}
                <div className="text-center py-4 border-t border-gray-100">
                  <span className="inline-flex items-center gap-2 bg-[#E8F3EF] text-[#1E3A2F] font-bold text-sm px-4 py-2 rounded-full">
                    <Zap className="w-4 h-4" />
                    {result.pruned_count} low-signal event{result.pruned_count !== 1 ? "s" : ""} pruned locally
                  </span>
                </div>

                {/* Cognee Enrichment */}
                {result.cognee_enriched_entities && result.cognee_enriched_entities.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 font-bold text-sm px-4 py-2 rounded-full">
                      <CheckCircle2 className="w-4 h-4" />
                      Cognee /cognify enriched {result.cognee_enriched_entities.length} entit{result.cognee_enriched_entities.length !== 1 ? "ies" : "y"}
                    </span>
                    {result.cognee_failed_entities && result.cognee_failed_entities.length > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600 text-xs">
                        {result.cognee_failed_entities.length} failed
                      </span>
                    )}
                  </div>
                )}

                {/* Affected Entities */}
                {result.pruned_entities.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h4 className="uppercase text-[11px] tracking-widest text-gray-400 font-bold mb-3">
                      Affected Entities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.pruned_entities.map((pe) => (
                        <span
                          key={pe.entity_id}
                          className="bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                        >
                          {pe.entity_id}
                          <span className="text-[#1E3A2F] bg-[#E8F3EF] px-1.5 py-0.5 rounded text-[10px] font-bold">
                            -{pe.pruned_events}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Run Again */}
            <div className="flex justify-center mt-6">
              <button
                onClick={handleReset}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 flex items-center gap-2"
              >
                Run Another Pass
              </button>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-6 flex items-start gap-4 text-sm text-gray-600">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-[#1E3A2F]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#111111]">How Memify Works</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Scans all events for low-signal noise (neutral type + neutral sentiment + zero promises).</li>
              <li>Soft-deletes matching events from Mnemos's local memory layer — excluded from timelines, alerts, and entity counts.</li>
              <li>Also calls Cognee's <code>/cognify</code> pipeline on each affected entity to keep derived graph embeddings current.</li>
              <li>Pruning is reversible at the database level (events are marked, not destroyed).</li>
              <li>Run multiple passes as new data is ingested to keep memory compact.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
