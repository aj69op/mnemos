"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Bell, ChevronDown, Filter, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

export default function EntitiesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Last Interaction");
  const [activeState, setActiveState] = useState("All");

  useEffect(() => {
    api.getEntities().then(res => {
      if (res && res.entities) {
        setEntities(res.entities);
      }
    });
  }, []);

  const filteredAndSortedEntities = useMemo(() => {
    let result = entities.filter(e => {
      if (activeState !== "All" && e.state !== activeState) return false;
      if (search.trim() !== "") {
        return e.entity_id.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "Entity ID") {
        return a.entity_id.localeCompare(b.entity_id);
      } else if (sortBy === "Open Promises") {
        return b.open_promises - a.open_promises;
      } else if (sortBy === "Event Count") {
        return b.event_count - a.event_count;
      } else {
        // Last Interaction
        return new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime();
      }
    });

    return result;
  }, [entities, search, sortBy, activeState]);

  const stateFilters = [
    { label: "All", class: "bg-[#0A3020] text-white border-transparent shadow-sm" },
    { label: "Prospect", class: "bg-white text-gray-500 border-gray-200 hover:bg-gray-50" },
    { label: "Engaged", class: "bg-[#F3FAF7] text-emerald-600 border-[#E8F3EF] hover:bg-[#EAF5F0]" },
    { label: "Trusted", class: "bg-[#F0FDF4] text-green-600 border-[#DCFCE7] hover:bg-[#DCFCE7]" },
    { label: "At Risk", class: "bg-[#FFF8F1] text-orange-600 border-[#FFEDD5] hover:bg-[#FFEDD5]" },
    { label: "Churned", class: "bg-[#FEF2F2] text-red-500 border-[#FEE2E2] hover:bg-[#FEE2E2]" },
  ];

  return (
    <div className="p-10 h-full min-h-full bg-[#FAFAFA] font-sans flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bold text-gray-900 text-[28px] tracking-tight">Entities</h1>
          <p className="text-gray-500 text-[14px] mt-1 font-medium">All tracked customers and vendors</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by entity ID or name..." 
              className="pl-10 pr-12 py-2 bg-white border border-gray-200 rounded-xl text-[13px] w-[280px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400 shadow-sm font-medium"
            />
            <div className="absolute right-3 flex items-center gap-1 text-[11px] text-gray-400 font-bold border border-gray-100 bg-gray-50 px-1.5 py-0.5 rounded-md">
              <span>⌘</span><span>K</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-gray-500">Sort by</span>
            <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50">
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-transparent outline-none cursor-pointer appearance-none pr-2 font-bold"
              >
                <option>Last Interaction</option>
                <option>Entity ID</option>
                <option>Open Promises</option>
                <option>Event Count</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 -ml-1 pointer-events-none" />
            </div>
          </div>

          <button className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center relative hover:bg-gray-50 transition-colors shadow-sm ml-2">
            <Bell className="w-[18px] h-[18px] text-gray-600" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white box-content" />
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {stateFilters.map(filter => {
            const mappedState = filter.label.toUpperCase().replace(" ", "_");
            const isActive = activeState === mappedState || (activeState === "All" && filter.label === "All");
            
            return (
              <button
                key={filter.label}
                onClick={() => setActiveState(filter.label === "All" ? "All" : mappedState)}
                className={`px-4 py-1.5 rounded-xl text-[13px] font-bold border transition-all ${filter.class} ${isActive ? 'ring-2 ring-offset-1 ring-[#1E3A2F]/20' : ''}`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        
        <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-[13px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4 text-gray-400" />
          <span>Filters</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex-1 flex flex-col">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="font-bold text-gray-400 text-[10px] tracking-widest uppercase px-8 py-5">Entity</th>
              <th className="font-bold text-gray-400 text-[10px] tracking-widest uppercase px-6 py-5">Type</th>
              <th className="font-bold text-gray-400 text-[10px] tracking-widest uppercase px-6 py-5">State</th>
              <th className="font-bold text-gray-400 text-[10px] tracking-widest uppercase px-6 py-5 text-center">Events</th>
              <th className="font-bold text-gray-400 text-[10px] tracking-widest uppercase px-6 py-5">Last Interaction</th>
              <th className="font-bold text-gray-400 text-[10px] tracking-widest uppercase px-6 py-5">Open Promises</th>
              <th className="font-bold text-gray-400 text-[10px] tracking-widest uppercase px-8 py-5">Action</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {filteredAndSortedEntities.length > 0 ? (
              filteredAndSortedEntities.map((e, i) => {
                const isCustomer = e.entity_type === 'Customer' || !e.entity_type; // default to customer for demo
                const isAtRisk = e.state === 'AT_RISK';
                const isEngaged = e.state === 'ENGAGED' || (!isAtRisk); // default engaged
                
                const bgClass = isAtRisk ? 'bg-[#FFFBF5]' : 'bg-white hover:bg-gray-50/50';
                
                // Avatar derived from first letter
                const firstLetter = e.entity_id.charAt(0).toUpperCase();
                const avatarBg = isAtRisk ? 'bg-[#FFEDD5] text-orange-600' : 'bg-[#E5F5EF] text-emerald-700';

                // Progress Bar
                const maxPromises = 5;
                const pWidth = `${Math.min((e.open_promises / maxPromises) * 100, 100)}%`;
                const pColor = isAtRisk ? 'bg-orange-500' : 'bg-emerald-600';

                // Format Date
                const dateObj = new Date(e.last_interaction);
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

                return (
                  <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors ${bgClass}`}>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] ${avatarBg}`}>
                          {firstLetter}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-[14px]">{e.entity_id}</span>
                          <span className="text-gray-400 text-[11px] font-medium mt-0.5">ID: ENT-{String(i + 100).padStart(4, '0')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold rounded-md text-[11px] px-2.5 py-1 text-emerald-600 bg-emerald-50 border border-emerald-100/50">
                        {isCustomer ? 'Customer' : 'Vendor'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isAtRisk ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                        <span className={`font-bold text-[11px] ${isAtRisk ? 'text-orange-500' : 'text-emerald-600'}`}>
                          {e.state}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-gray-700">
                      {e.event_count}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-gray-700 font-medium text-[13px]">{dateStr}</span>
                        <span className="text-gray-400 text-[11px] font-medium mt-0.5">{timeStr}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${pColor}`} style={{ width: pWidth }} />
                        </div>
                        <span className="font-medium text-gray-700">{e.open_promises}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <a 
                          href={`/dashboard/customer/${e.entity_id}`}
                          className="bg-white border border-gray-200 rounded-xl px-4 py-1.5 text-[12px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                        >
                          View Timeline
                        </a>
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-gray-500 text-sm">
                  No entities found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="mt-auto border-t border-gray-100 px-8 py-4 flex items-center justify-between">
          <span className="text-[13px] font-medium text-gray-500">
            Showing 1 to {Math.min(6, filteredAndSortedEntities.length)} of {entities.length || 45} entities
          </span>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-[#0A3020] text-white font-bold text-[13px] flex items-center justify-center shadow-sm">
              1
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-gray-50 text-gray-600 font-medium text-[13px] flex items-center justify-center transition-colors">
              2
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-gray-50 text-gray-600 font-medium text-[13px] flex items-center justify-center transition-colors">
              3
            </button>
            <span className="w-8 text-center text-gray-400 text-[13px]">...</span>
            <button className="w-8 h-8 rounded-lg hover:bg-gray-50 text-gray-600 font-medium text-[13px] flex items-center justify-center transition-colors">
              8
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
