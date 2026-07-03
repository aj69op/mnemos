"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { api, EntityMetrics } from "@/lib/api";

export default function EntitiesPage() {
  const [entities, setEntities] = useState<EntityMetrics[]>([]);

  useEffect(() => {
    // We would fetch real entities here
    /*
    api.getEntities().then(res => {
      if (res && res.entities) setEntities(res.entities);
    });
    */
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-8 pt-8 pb-6">
        <div className="flex mb-6 justify-between items-start">
          <div>
            <h1 className="font-bold text-[#111111] text-2xl leading-8">
              Entities
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              All tracked customers and vendors
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Sort by</span>
            <select className="outline-none shadow-[0_12px_28px_rgba(17,17,17,0.08)] transition-all duration-300 rounded-md bg-white text-[#111111] text-sm border-gray-200 border px-3 py-1.5">
              <option>Last Interaction</option>
              <option>Entity ID</option>
              <option>Open Promises</option>
              <option>Event Count</option>
            </select>
          </div>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
          <input
            className="outline-none shadow-[0_14px_30px_rgba(17,17,17,0.10)] transition-all duration-300 rounded-md bg-white text-[#111111] text-sm border-gray-200 border pl-9 pr-4 py-2 w-full focus:border-[#1E3A2F]"
            placeholder="Search by entity ID or name…"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="shadow-[0_10px_24px_rgba(17,17,17,0.08)] font-medium rounded-full bg-white text-[#111111] text-xs border-gray-200 border px-3 py-1">
            All
          </button>
          <button className="shadow-[0_10px_24px_rgba(17,17,17,0.08)] font-medium rounded-full text-slate-600 text-xs border-slate-300 border px-3 py-1">
            PROSPECT
          </button>
          <button className="shadow-[0_10px_24px_rgba(17,17,17,0.08)] font-medium rounded-full text-teal-700 text-xs border-emerald-200 border px-3 py-1">
            ENGAGED
          </button>
          <button className="shadow-[0_10px_24px_rgba(17,17,17,0.08)] font-medium rounded-full text-green-800 text-xs border-green-200 border px-3 py-1">
            TRUSTED
          </button>
          <button className="shadow-[0_10px_24px_rgba(17,17,17,0.08)] font-medium rounded-full text-amber-700 text-xs border-amber-200 border px-3 py-1">
            AT_RISK
          </button>
          <button className="shadow-[0_10px_24px_rgba(17,17,17,0.08)] font-medium rounded-full text-red-600 text-xs border-red-200 border px-3 py-1">
            CHURNED
          </button>
        </div>
      </div>
      <div className="px-8 py-6">
        <table className="border-separate border-spacing-y-2 w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="font-semibold text-left uppercase text-gray-400 text-[11px] tracking-wider px-4 py-3 rounded-l-md">
                Entity ID
              </th>
              <th className="font-semibold text-left uppercase text-gray-400 text-[11px] tracking-wider px-4 py-3">
                Type
              </th>
              <th className="font-semibold text-left uppercase text-gray-400 text-[11px] tracking-wider px-4 py-3">
                State
              </th>
              <th className="font-semibold text-left uppercase text-gray-400 text-[11px] tracking-wider px-4 py-3">
                Events
              </th>
              <th className="font-semibold text-left uppercase text-gray-400 text-[11px] tracking-wider px-4 py-3">
                Last Interaction
              </th>
              <th className="font-semibold text-left uppercase text-gray-400 text-[11px] tracking-wider px-4 py-3">
                Open Promises
              </th>
              <th className="font-semibold text-left uppercase text-gray-400 text-[11px] tracking-wider px-4 py-3 rounded-r-md">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'CUST-0042', type: 'Customer', state: 'TRUSTED', stateClass: 'bg-green-50 text-green-800', typeClass: 'text-green-800 border-green-200', events: 84, time: '2 days ago', promises: 1, pColor: 'bg-green-500', pWidth: '85%' },
              { id: 'CUST-0087', type: 'Customer', state: 'AT_RISK', stateClass: 'bg-amber-50 text-amber-700', typeClass: 'text-amber-700 border-amber-200', events: 47, time: '18 days ago', promises: 3, pColor: 'bg-amber-500', pWidth: '75%', bg: 'bg-amber-50/50' },
              { id: 'VEND-1188', type: 'Vendor', state: 'TRUSTED', stateClass: 'bg-green-50 text-green-800', typeClass: 'text-orange-800 border-orange-200', events: 112, time: '1 day ago', promises: 0, pColor: 'bg-green-500', pWidth: '20%' },
              { id: 'CUST-1042', type: 'Customer', state: 'ENGAGED', stateClass: 'bg-cyan-50 text-teal-700', typeClass: 'text-green-800 border-green-200', events: 63, time: '5 days ago', promises: 2, pColor: 'bg-teal-500', pWidth: '60%', bg: 'bg-gray-50/50' },
            ].map((e, i) => (
              <tr key={i} className={`group shadow-[0_12px_28px_rgba(17,17,17,0.08)] transition-all duration-300 hover:scale-[1.01] ${e.bg || 'bg-white'}`}>
                <td className="p-4 rounded-l-xl">
                  <span className="font-semibold text-[#111111] text-sm">
                    {e.id}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`font-medium rounded-sm text-xs border px-2 py-0.5 ${e.typeClass}`}>
                    {e.type}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`font-medium rounded-full text-xs px-2 py-0.5 ${e.stateClass}`}>
                    {e.state}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-[#111111] text-sm">
                    {e.events}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-[#111111] text-sm">
                    {e.time}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-200 w-20 h-1.5 overflow-hidden">
                      <div className={`transition-all duration-300 rounded-full h-full ${e.pColor}`} style={{ width: e.pWidth }} />
                    </div>
                    <span className="text-[#111111] text-xs">
                      {e.promises}
                    </span>
                  </div>
                </td>
                <td className="p-4 rounded-r-xl">
                  <Link href={`/customer/${e.id}`}>
                    <button className="shadow-[0_12px_24px_rgba(17,17,17,0.12)] transition-all duration-300 font-medium rounded-md bg-white text-[#111111] text-xs border-[#1E3A2F] border px-3 py-1.5 hover:bg-neutral-50 hover:-translate-y-0.5">
                      View Timeline
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
