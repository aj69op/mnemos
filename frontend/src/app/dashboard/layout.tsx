"use client";

import { Home, Network, Trash2, Upload, Users, Zap, ChevronsLeft, ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import React, { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home, exact: true },
    { href: "/dashboard/entities", label: "Entities", icon: Users, match: ["/dashboard/entities", "/dashboard/customer"] },
    { href: "/dashboard/import", label: "Import", icon: Upload, exact: true },
    { href: "/dashboard/graph", label: "Knowledge Graph", icon: Network, exact: true },
    { href: "/dashboard/memify", label: "Memify", icon: Zap, exact: true },
    { href: "/dashboard/forget", label: "Forget", icon: Trash2, exact: true },
  ];

  const isActive = (link: typeof navLinks[0]) => {
    if (link.match) return link.match.some(p => pathname?.startsWith(p));
    if (link.exact) return pathname === link.href;
    return pathname?.startsWith(link.href);
  };

  const lifecycleSteps = ["Remember", "Recall", "Memify", "Forget"];
  const lifecycleMap: Record<string, number> = {
    "/dashboard/import": 0,
    "/dashboard/graph": 1,
    "/dashboard/entities": 1,
    "/dashboard/customer": 1,
    "/dashboard/memify": 2,
    "/dashboard/forget": 3,
  };
  const activeLifecycleIndex = Object.entries(lifecycleMap).find(([path]) =>
    pathname?.startsWith(path)
  )?.[1] ?? 1;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="w-14 h-14 rounded-[14px] bg-black flex justify-center items-center overflow-hidden p-0">
              <Image src="/logo_transparent.png" alt="Mnemos" width={64} height={64} className="object-cover min-w-[64px] min-h-[64px]" />
            </div>
            <div className="leading-tight flex flex-col">
              <span className="font-bold text-gray-900 text-[15px]">
                Mnemos
              </span>
              <span className="text-gray-500 text-[11px] font-medium tracking-wide">
                Relationship Intelligence
              </span>
            </div>
          </Link>
          <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors hidden lg:flex">
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <nav className="flex flex-col gap-1.5 px-4 mt-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  active
                    ? "bg-[#F7F7F8] text-gray-900 font-bold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#0A3020] rounded-r-full" />
                )}
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[14px]">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-6 flex flex-col gap-6 mt-auto">
        <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A3020]/5 border border-[#0A3020]/10 rounded-xl">
          {lifecycleSteps.map((step, i) => (
            <React.Fragment key={step}>
              {i > 0 && <span className="text-[#0A3020]/20 text-[10px] font-light select-none">·</span>}
              <span className={`text-[10px] font-bold tracking-wider transition-all duration-300 ${
                i === activeLifecycleIndex
                  ? "text-[#0A3020] scale-105"
                  : "text-[#0A3020]/40"
              }`}>
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="rounded-[1.25rem] border border-[#E8F3EF] bg-[#F4FAF7] p-5 flex flex-col gap-2 relative overflow-hidden">
          <span className="font-bold text-gray-900 text-[13px]">
            AI Agent Status
          </span>
          <div className="flex items-center gap-2 text-[13px] text-gray-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live — scanning
          </div>
        </div>

        <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-2xl transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0A3020] text-white flex items-center justify-center font-semibold text-[13px]">
              AC
            </div>
            <div className="flex flex-col leading-tight gap-0.5">
              <span className="text-[13px] font-bold text-gray-900">Arkajit Chowdhury</span>
              <span className="text-[11px] text-gray-500 font-medium">Admin</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#FDFDFD] flex text-gray-900 font-sans">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="w-[280px] shrink-0 bg-white border-r border-gray-100 flex flex-col justify-between h-screen sticky top-0 hidden lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-gray-100 transform transition-transform duration-300 lg:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {sidebarContent}
      </aside>

      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 lg:hidden">
        <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black flex justify-center items-center overflow-hidden">
            <Image src="/logo_transparent.png" alt="Mnemos" width={32} height={32} className="object-cover min-w-[32px] min-h-[32px]" />
          </div>
          <span className="font-bold text-gray-900 text-[14px]">Mnemos</span>
        </Link>
      </div>

      <main className="flex-1 overflow-auto bg-[#FAFAFA] pt-[56px] lg:pt-0">
        {children}
      </main>
    </div>
  );
}
