"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, Zap } from "lucide-react";
import { api, Conflict } from "@/lib/api";

interface ConflictBannerProps {
  onDraftFollowup?: (entityId: string, context: string) => void;
}

export default function ConflictBanner({ onDraftFollowup }: ConflictBannerProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchConflicts = () => {
      api.getConflicts()
        .then(res => {
          if (res?.conflicts) setConflicts(res.conflicts);
        })
        .catch(() => {});
    };

    fetchConflicts();
    const interval = setInterval(fetchConflicts, 3000);
    return () => clearInterval(interval);
  }, []);

  const visible = conflicts.filter(c => !dismissed.has(c.id));
  if (visible.length === 0) {
    return (
      <div className="flex flex-col gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 border-dashed p-6 text-center text-gray-500 font-medium text-sm">
          Scanning for conflicts... (No active contradictions found)
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mb-6">
      {visible.map(conflict => (
        <div
          key={conflict.id}
          className="relative bg-white rounded-2xl border-2 border-red-200 p-6 shadow-[0_4px_24px_rgba(239,68,68,0.08)] overflow-hidden"
        >
          {/* Pulsing glow accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />

          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              {/* Pulsing warning icon */}
              <div className="relative shrink-0 mt-1">
                <div className="absolute inset-0 w-10 h-10 rounded-full bg-red-400/20 animate-ping" />
                <div className="relative w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-bold text-gray-900 text-[16px]">
                    {conflict.entity_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                    Contradiction
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                    {conflict.attribute_type.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Conflicting values with VS divider */}
                <div className="bg-gray-50/80 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {conflict.source_a}
                      </div>
                      <div className="text-[14px] font-bold text-gray-900">
                        {conflict.value_a}
                      </div>
                    </div>

                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 border border-red-100 shrink-0">
                      <span className="text-[11px] font-black text-red-500">VS</span>
                    </div>

                    <div className="flex-1 bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {conflict.source_b}
                      </div>
                      <div className="text-[14px] font-bold text-gray-900">
                        {conflict.value_b}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onDraftFollowup?.(
                      conflict.entity_id,
                      `Contradiction detected on ${conflict.attribute_type}: ${conflict.source_a} says "${conflict.value_a}" but ${conflict.source_b} says "${conflict.value_b}"`
                    )}
                    className="flex items-center gap-2 bg-[#0A3020] text-white px-4 py-2 rounded-xl text-[12px] font-bold shadow-sm hover:bg-[#072418] transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Draft Follow-up
                  </button>
                  <button
                    onClick={() => setDismissed(prev => new Set(prev).add(conflict.id))}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(conflict.id))}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
