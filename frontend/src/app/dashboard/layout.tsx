"use client";

import { Home, Network, Trash2, Upload, Users, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="bg-white text-neutral-950 w-full min-h-screen overflow-visible">
      <div className="min-h-screen bg-white flex w-full">
        <aside className="shrink-0 bg-gray-50 border-gray-200 border-r flex flex-col justify-between w-64">
          <div className="flex p-6 flex-col gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 shadow-[0_12px_30px_rgba(30,58,47,0.18)] rounded-2xl bg-[#1E3A2F] flex justify-center items-center">
                <div className="relative w-5 h-5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-50 absolute left-0 top-1.5" />
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-50 absolute left-3 top-0" />
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-50 absolute left-4.5 top-3.5" />
                  <span className="rotate-[-28deg] bg-gray-50/80 absolute left-1.5 top-2.5 w-4 h-px" />
                  <span className="rotate-[28deg] bg-gray-50/80 absolute left-2.5 top-1.5 w-4 h-px" />
                </div>
              </div>
              <div className="leading-tight flex flex-col">
                <span className="font-semibold text-[#111111] text-sm">
                  Mnemos
                </span>
                <span className="text-gray-500 text-[10px]">
                  relationship intelligence
                </span>
              </div>
            </Link>
            <nav className="flex flex-col gap-1">
              <Link href="/dashboard" className={`transition-all duration-300 rounded-md flex px-3 py-2 items-center gap-3 ${pathname === '/dashboard' ? 'shadow-[0_14px_30px_rgba(17,17,17,0.10)] bg-white text-[#111111] border-l-2 border-[#1E3A2F] font-semibold' : 'text-gray-500 hover:text-black'}`}>
                <Home className="w-4 h-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <Link href="/dashboard/entities" className={`transition-all duration-300 rounded-md flex px-3 py-2 items-center gap-3 ${pathname.startsWith('/dashboard/entities') || pathname.startsWith('/dashboard/customer') ? 'shadow-[0_14px_30px_rgba(17,17,17,0.10)] bg-white text-[#111111] border-l-2 border-[#1E3A2F] font-semibold' : 'text-gray-500 hover:text-black'}`}>
                <Users className="w-4 h-4" />
                <span className="text-sm">Entities</span>
              </Link>
              <Link href="/dashboard/import" className={`transition-all duration-300 rounded-md flex px-3 py-2 items-center gap-3 ${pathname === '/dashboard/import' ? 'shadow-[0_14px_30px_rgba(17,17,17,0.10)] bg-white text-[#111111] border-l-2 border-[#1E3A2F] font-semibold' : 'text-gray-500 hover:text-black'}`}>
                <Upload className="w-4 h-4" />
                <span className="text-sm">Import</span>
              </Link>
              <button className="transition-all duration-300 rounded-md text-gray-500 flex px-3 py-2 items-center gap-3 hover:text-black">
                <Network className="w-4 h-4" />
                <span className="text-sm">Knowledge Graph</span>
              </button>
              <button className="transition-all duration-300 rounded-md text-gray-500 flex px-3 py-2 items-center gap-3 hover:text-black">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Memify</span>
              </button>
              <button className="transition-all duration-300 rounded-md text-gray-500 flex px-3 py-2 items-center gap-3 hover:text-black">
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Forget</span>
              </button>
            </nav>
          </div>
          <div className="p-4">
            <div className="shadow-[0_12px_30px_rgba(17,17,17,0.06)] rounded-2xl bg-white border-gray-200 border p-4">
              <p className="uppercase text-gray-400 text-[10px] tracking-widest mb-2">
                Memory Lifecycle
              </p>
              <div className="text-[10px] flex flex-wrap gap-1">
                <span className="font-medium text-[#1E3A2F]">Remember</span>
                <span className="text-gray-400">·</span>
                <span className="font-medium text-[#1E3A2F]">Recall</span>
                <span className="text-gray-400">·</span>
                <span className="font-medium text-[#1E3A2F]">Memify</span>
                <span className="text-gray-400">·</span>
                <span className="font-medium text-[#1E3A2F]">Forget</span>
              </div>
            </div>
          </div>
        </aside>
        <main className="min-w-0 bg-white flex-1 relative overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
