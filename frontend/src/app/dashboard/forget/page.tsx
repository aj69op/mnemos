"use client";

import { useEffect, useState, useMemo } from "react";
import { Trash2, AlertTriangle, Search, X, Shield } from "lucide-react";
import { api, Entity } from "@/lib/api";

const STATE_STYLES: Record<string, string> = {
  TRUSTED: "bg-green-50 text-green-800",
  AT_RISK: "bg-amber-50 text-amber-700",
  ENGAGED: "bg-cyan-50 text-teal-700",
  PROSPECT: "bg-slate-50 text-slate-700",
  CHURNED: "bg-red-50 text-red-700",
};

export default function ForgetPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [forgettingId, setForgettingId] = useState<string | null>(null);
  const [forgottenIds, setForgottenIds] = useState<Set<string>>(new Set());
  const [animatingOutId, setAnimatingOutId] = useState<string | null>(null);
  const [demoBanner, setDemoBanner] = useState(false);

  useEffect(() => {
    api
      .getEntities()
      .then((res) => {
        if (res && res.entities) {
          setEntities(res.entities);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter to CHURNED entities only, then apply search + forgotten filter
  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      if (e.state !== "CHURNED") return false;
      if (forgottenIds.has(e.entity_id)) return false;
      if (search.trim()) {
        return e.entity_id.toLowerCase().includes(search.trim().toLowerCase());
      }
      return true;
    });
  }, [entities, forgottenIds, search]);

  const totalOpenPromises = useMemo(
    () => filteredEntities.reduce((sum, e) => sum + e.open_promises, 0),
    [filteredEntities]
  );

  const handleConfirmForget = async (entityId: string) => {
    setAnimatingOutId(entityId);
    try {
      await api.forgetEntity(entityId);
    } catch (err: any) {
      if (err?.status === 403) {
        setDemoBanner(true);
      } else {
        console.error(err);
      }
      setAnimatingOutId(null);
      setForgettingId(null);
      return;
    }
    setTimeout(() => {
      setForgottenIds((prev) => new Set(prev).add(entityId));
      setForgettingId(null);
      setAnimatingOutId(null);
    }, 300);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 pt-8 pb-6">
        <h1 className="font-bold text-[#111111] text-2xl leading-8">Forget</h1>
        <p className="text-gray-500 text-sm mt-1">
          Remove churned entities from active tracking. Historical data is preserved.
        </p>
      </div>

      <div className="px-8 py-6 flex-1 overflow-y-auto">
        {/* Demo Mode Banner */}
        {demoBanner && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 animate-fade-in">
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

        {/* Warning Banner */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800 text-sm leading-relaxed">
            Only <strong>CHURNED</strong> entities are shown here. Forgetting an entity removes it 
            from your active dashboard, alerts, and entity list. Historical data is preserved in the backend 
            and can still be accessed via direct URL.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="outline-none shadow-[0_14px_30px_rgba(17,17,17,0.10)] transition-all duration-300 rounded-md !bg-white text-[#111111] text-sm border-gray-200 border pl-9 pr-10 py-2 w-full focus:!bg-white focus:border-[#1E3A2F]"
            placeholder="Filter churned entities by ID…"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 mt-6 gap-4">
          <div className="shadow-[0_14px_34px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-4">
            <div className="uppercase text-gray-400 text-[11px] tracking-[2.24px]">
              Churned Entities
            </div>
            <div className="leading-none font-semibold text-red-600 text-[28px] mt-3">
              {loading ? "—" : filteredEntities.length}
            </div>
          </div>
          <div className="shadow-[0_14px_34px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-4">
            <div className="uppercase text-gray-400 text-[11px] tracking-[2.24px]">
              Open Promises (Churned)
            </div>
            <div className="leading-none font-semibold text-[#111111] text-[28px] mt-3">
              {loading ? "—" : totalOpenPromises}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1E3A2F] rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Loading entities…</span>
          </div>
        )}

        {/* Entity List */}
        {!loading && filteredEntities.length > 0 && (
          <div className="flex flex-col mt-6 gap-3">
            {filteredEntities.map((entity) => {
              const isConfirming = forgettingId === entity.entity_id;
              const isAnimatingOut = animatingOutId === entity.entity_id;
              const stateStyle =
                STATE_STYLES[entity.state] || "bg-gray-50 text-gray-700";
              const typeClass =
                entity.entity_type === "Customer"
                  ? "text-green-800 border-green-200"
                  : "text-orange-800 border-orange-200";

              return (
                <div
                  key={entity.entity_id}
                  className={`
                    shadow-[0_14px_34px_rgba(17,17,17,0.08)] rounded-2xl bg-white border border-gray-200 p-5
                    transition-all duration-300 border-l-[3px] border-l-red-400
                    ${isAnimatingOut ? "opacity-0 scale-95 translate-y-6" : "opacity-100 scale-100 translate-y-0"}
                  `}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Entity Info */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-[#111111] text-[15px] truncate">
                            {entity.entity_id}
                          </span>
                          <span
                            className={`font-medium rounded-sm text-xs border px-2 py-0.5 shrink-0 ${typeClass}`}
                          >
                            {entity.entity_type}
                          </span>
                          <span
                            className={`font-medium rounded-full text-xs px-2.5 py-0.5 shrink-0 ${stateStyle}`}
                          >
                            {entity.state}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-gray-500 text-xs">
                            <span className="text-gray-400">Events:</span>{" "}
                            <span className="text-[#111111] font-medium">
                              {entity.event_count}
                            </span>
                          </span>
                          <span className="text-gray-500 text-xs">
                            <span className="text-gray-400">
                              Open Promises:
                            </span>{" "}
                            <span className="text-[#111111] font-medium">
                              {entity.open_promises}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isConfirming && (
                      <button
                        onClick={() => setForgettingId(entity.entity_id)}
                        className="flex items-center gap-2 shrink-0 rounded-lg border border-red-200 text-red-600 text-xs font-medium px-3.5 py-2 transition-all duration-200 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-[0_8px_20px_rgba(220,38,38,0.25)] active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Forget Entity
                      </button>
                    )}
                  </div>

                  {/* Confirmation Overlay */}
                  {isConfirming && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="text-red-800 text-sm">
                            Are you sure? This will remove{" "}
                            <strong>{entity.entity_id}</strong> from active tracking.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setForgettingId(null)}
                            className="rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium px-3.5 py-2 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() =>
                              handleConfirmForget(entity.entity_id)
                            }
                            className="rounded-lg bg-red-600 text-white text-xs font-medium px-3.5 py-2 transition-all duration-200 hover:bg-red-700 hover:shadow-[0_8px_20px_rgba(220,38,38,0.3)] active:scale-95"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEntities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="shadow-[0_14px_34px_rgba(17,17,17,0.08)] rounded-full bg-white border border-gray-200 p-5">
              <Shield className="w-8 h-8 text-[#1E3A2F]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[#111111] text-sm">
                {search
                  ? "No churned entities match your search"
                  : "No churned entities found"}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {search
                  ? "Try adjusting your filter criteria."
                  : "Only entities with CHURNED state appear here for cleanup."}
              </p>
            </div>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium px-4 py-2 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
