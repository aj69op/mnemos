"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { api, EntropyEntry } from "@/lib/api";

export default function EntropyTicker() {
  const [entities, setEntities] = useState<EntropyEntry[]>([]);

  useEffect(() => {
    const fetchEntropy = () => {
      api.getLiveEntropy()
        .then(res => {
          if (res?.entities) setEntities(res.entities);
        })
        .catch(() => {});
    };

    fetchEntropy();
    const interval = setInterval(fetchEntropy, 3000);
    return () => clearInterval(interval);
  }, []);

  const isEmpty = entities.length === 0;

  const getBarColor = (score: number) => {
    if (score >= 0.8) return "bg-red-500";
    if (score >= 0.5) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getTextColor = (score: number) => {
    if (score >= 0.8) return "text-red-600";
    if (score >= 0.5) return "text-amber-600";
    return "text-emerald-600";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-[#0A3020]" />
        <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">
          Live Entropy
        </span>
        <span className="relative flex h-2 w-2 ml-auto">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </div>

      <div className="space-y-3">
        {isEmpty ? (
          <div className="text-center py-6 text-[12px] text-gray-400 font-medium border border-dashed border-gray-200 rounded-xl">
            Waiting for signals...
          </div>
        ) : (
          entities.map((entity, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-bold text-gray-700 truncate max-w-[140px]">
                  {entity.entity_name}
                </span>
                <span className={`text-[12px] font-black ${getTextColor(entity.entropy_score)}`}>
                  {(entity.entropy_score * 10).toFixed(1)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(entity.entropy_score)}`}
                  style={{ width: `${Math.min(entity.entropy_score * 10, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
