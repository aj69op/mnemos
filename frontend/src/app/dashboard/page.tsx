"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([]);

  useEffect(() => {
    api.getAlerts().then(res => {
      setMetrics(res.summary);
      setAlerts(res.alerts);
      setAtRisk(res.at_risk_entities || []);
    });
  }, []);

  return (
    <div className="px-8 py-6 h-full">
      <div className="text-gray-500 text-xs flex justify-end items-center gap-2">
        <span className="relative w-2.5 h-2.5 flex justify-center items-center">
          <span className="inline-flex w-full h-full animate-ping rounded-full bg-[#1E3A2F]/30 absolute" />
          <span className="relative inline-flex w-2.5 h-2.5 shadow-[0_0_0_4px_rgba(30,58,47,0.08)] rounded-full bg-[#1E3A2F]" />
        </span>
        <span>Agent Live — scanning</span>
      </div>
      <div className="flex mt-8 flex-col gap-2">
        <h1 className="font-bold text-[#111111] text-2xl tracking-tight">
          Dashboard
        </h1>
        <p className="text-gray-500 text-sm">
          A clean overview of alerts, risk, and relationship signals.
        </p>
      </div>
      <section className="grid grid-cols-4 mt-8 gap-4">
        <div className="group shadow-[0_14px_34px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-4">
          <div className="uppercase text-gray-400 text-[11px] tracking-[2.24px]">
            Total Alerts
          </div>
          <div className="leading-none transition-transform duration-300 font-semibold text-[#111111] text-[32px] mt-3">
            {metrics?.total || 0}
          </div>
          <div className="rounded-full bg-gray-200 mt-4 h-1.5 overflow-hidden">
            <div className="w-[78%] shadow-[0_0_0_1px_rgba(30,58,47,0.08)] animate-[pulse_2.8s_ease-in-out_infinite] rounded-full bg-[#1E3A2F] h-full" />
          </div>
        </div>
        <div className="group border-t-[#DC2626] border-t-2 shadow-[0_14px_34px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-4">
          <div className="uppercase text-gray-400 text-[11px] tracking-[2.24px]">
            Critical
          </div>
          <div className="leading-none transition-transform duration-300 font-semibold text-[#111111] text-[32px] mt-3">
            {metrics?.critical || 0}
          </div>
          <div className="rounded-full bg-gray-200 mt-4 h-1.5 overflow-hidden">
            <div className="w-[42%] shadow-[0_0_0_1px_rgba(220,38,38,0.08)] animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-red-600 h-full" />
          </div>
        </div>
        <div className="group border-t-[#D97706] border-t-2 shadow-[0_14px_34px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-4">
          <div className="uppercase text-gray-400 text-[11px] tracking-[2.24px]">
            High
          </div>
          <div className="leading-none transition-transform duration-300 font-semibold text-[#111111] text-[32px] mt-3">
            {metrics?.high || 0}
          </div>
          <div className="rounded-full bg-gray-200 mt-4 h-1.5 overflow-hidden">
            <div className="w-[58%] shadow-[0_0_0_1px_rgba(217,119,6,0.08)] animate-[pulse_3.2s_ease-in-out_infinite] rounded-full bg-amber-600 h-full" />
          </div>
        </div>
        <div className="group border-t-[#EAB308] border-t-2 shadow-[0_14px_34px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-4">
          <div className="uppercase text-gray-400 text-[11px] tracking-[2.24px]">
            Medium
          </div>
          <div className="leading-none transition-transform duration-300 font-semibold text-[#111111] text-[32px] mt-3">
            {metrics?.medium || 0}
          </div>
          <div className="rounded-full bg-gray-200 mt-4 h-1.5 overflow-hidden">
            <div className="w-[84%] shadow-[0_0_0_1px_rgba(234,179,8,0.08)] animate-[pulse_3.4s_ease-in-out_infinite] rounded-full bg-yellow-500 h-full" />
          </div>
        </div>
      </section>
      <section className="overflow-x-auto flex mt-8 pb-1 items-center gap-3">
        {atRisk.length > 0 ? (
          atRisk.map((entity: any) => (
            <div key={entity.entity_id} className="shrink-0 shadow-[0_10px_24px_rgba(17,17,17,0.08)] font-medium rounded-full bg-white text-[#111111] text-xs border-amber-600 border px-3 py-1.5">
              {entity.entity_id}
            </div>
          ))
        ) : (
          <div className="text-gray-400 text-sm">No at-risk entities detected.</div>
        )}
      </section>
      <section className="border-b border-gray-200 flex mt-8 items-center gap-6">
        <button className="relative font-semibold text-[#111111] text-sm pb-3 border-b-2 border-black -mb-[1px]">
          All
        </button>
        <button className="font-medium text-gray-500 text-sm pb-3 hover:text-black">
          Critical
        </button>
        <button className="font-medium text-gray-500 text-sm pb-3 hover:text-black">
          High
        </button>
        <button className="font-medium text-gray-500 text-sm pb-3 hover:text-black">
          Medium
        </button>
      </section>
      <section className="flex mt-6 flex-col gap-4">
        {alerts.length > 0 ? (
          alerts.map((alert, i) => {
            const isCritical = alert.severity === 'critical';
            const isHigh = alert.severity === 'high';
            const isMedium = alert.severity === 'medium';
            const color = isCritical ? 'red-600' : isHigh ? 'amber-600' : isMedium ? 'yellow-500' : 'blue-500';
            const shadow = isCritical ? 'rgba(220,38,38,0.25)' : isHigh ? 'rgba(217,119,6,0.25)' : 'rgba(234,179,8,0.25)';
            
            return (
              <div key={i} className="group shadow-[0_16px_38px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-5">
                <div className="flex items-start gap-4">
                  <div className={`shadow-[0_0_14px_${shadow}] rounded-full bg-${color} mt-1 w-1 h-20`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-[#111111] text-[15px]">
                        {alert.entity_id}
                      </div>
                      <div className="shadow-[0_8px_18px_rgba(17,17,17,0.04)] font-medium rounded-full bg-white text-gray-500 text-[11px] border-gray-200 border px-2.5 py-1">
                        {alert.entity_type}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-6 mt-2">
                      {alert.promise_description}
                    </p>
                    <div className="flex mt-4 items-center gap-3">
                      <div className="rounded-full bg-gray-200 w-full h-1.5 overflow-hidden">
                        <div className="shadow-[0_0_0_1px_rgba(30,58,47,0.08)] rounded-full bg-[#1E3A2F] h-full" style={{ width: `${Math.min(alert.entropy_score * 100, 100)}%` }} />
                      </div>
                      <div className="text-gray-500 text-xs">
                        {alert.entropy_score.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex mt-4 items-center gap-4">
                      <button className="transition-all duration-300 font-medium text-[#111111] text-[13px] hover:underline">
                        View Entity
                      </button>
                      <button className="transition-all duration-300 font-medium text-gray-500 text-[13px] hover:text-black">
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-gray-400 text-sm p-4 text-center">No alerts at this time.</div>
        )}
      </section>
    </div>
  );
}
