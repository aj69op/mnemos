"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // In a real app we would load dynamic metrics here
    // api.getMetrics().then(setMetrics);
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
            128
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
            12
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
            34
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
            82
          </div>
          <div className="rounded-full bg-gray-200 mt-4 h-1.5 overflow-hidden">
            <div className="w-[84%] shadow-[0_0_0_1px_rgba(234,179,8,0.08)] animate-[pulse_3.4s_ease-in-out_infinite] rounded-full bg-yellow-500 h-full" />
          </div>
        </div>
      </section>
      <section className="overflow-x-auto flex mt-8 pb-1 items-center gap-3">
        {['CUST-1042', 'VEND-2210', 'CUST-0087', 'VEND-0344', 'PROSPECT-0091', 'CUST-3391'].map(id => (
          <div key={id} className="shrink-0 shadow-[0_10px_24px_rgba(17,17,17,0.08)] font-medium rounded-full bg-white text-[#111111] text-xs border-amber-600 border px-3 py-1.5">
            {id}
          </div>
        ))}
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
        {[
          { id: 'CUST-1042', type: 'Customer', color: 'red-600', shadow: 'rgba(220,38,38,0.25)', desc: 'Promised revised proposal and 8% discount by Friday — 5 days elapsed, no follow-up.', score: 0.72, width: '72%' },
          { id: 'VEND-2210', type: 'Vendor', color: 'amber-600', shadow: 'rgba(217,119,6,0.25)', desc: 'Shipment confirmation pending after revised delivery window; relationship signal trending high risk.', score: 0.58, width: '58%' },
          { id: 'CUST-0087', type: 'Customer', color: 'yellow-500', shadow: 'rgba(234,179,8,0.25)', desc: 'Follow-up requested on invoice clarification and next-step commitment for the current quarter.', score: 0.41, width: '41%' }
        ].map((alert, i) => (
          <div key={i} className="group shadow-[0_16px_38px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-2xl bg-white border-gray-200 border p-5">
            <div className="flex items-start gap-4">
              <div className={`shadow-[0_0_14px_${alert.shadow}] rounded-full bg-${alert.color} mt-1 w-1 h-20`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-[#111111] text-[15px]">
                    {alert.id}
                  </div>
                  <div className="shadow-[0_8px_18px_rgba(17,17,17,0.04)] font-medium rounded-full bg-white text-gray-500 text-[11px] border-gray-200 border px-2.5 py-1">
                    {alert.type}
                  </div>
                </div>
                <p className="text-gray-700 text-sm leading-6 mt-2">
                  {alert.desc}
                </p>
                <div className="flex mt-4 items-center gap-3">
                  <div className="rounded-full bg-gray-200 w-full h-1.5 overflow-hidden">
                    <div className="shadow-[0_0_0_1px_rgba(30,58,47,0.08)] rounded-full bg-[#1E3A2F] h-full" style={{ width: alert.width }} />
                  </div>
                  <div className="text-gray-500 text-xs">
                    {alert.score}
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
        ))}
      </section>
    </div>
  );
}
