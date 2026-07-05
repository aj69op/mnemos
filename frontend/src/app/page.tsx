"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Network, Users } from "lucide-react";
import Image from "next/image";
import { api } from '@/lib/api';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [graphVisible, setGraphVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [liveStats, setLiveStats] = useState({ entities: 0, events: 0, alerts: 0 });

  useEffect(() => {
    setMounted(true);
    const t1 = setTimeout(() => setHeroVisible(true), 200);
    const t2 = setTimeout(() => setGraphVisible(true), 600);
    const t3 = setTimeout(() => setCardsVisible(true), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    Promise.all([api.getEntities(), api.getAlerts()]).then(([entRes, alertRes]) => {
      const totalEvents = (entRes.entities || []).reduce((sum: number, e: any) => sum + (e.event_count || 0), 0);
      setLiveStats({
        entities: entRes.total || (entRes.entities || []).length,
        events: totalEvents,
        alerts: alertRes.summary?.total || 0
      });
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="bg-black text-neutral-50 w-full overflow-hidden min-h-screen">
        <div className="relative h-screen bg-black text-white w-full flex flex-col">
          {/* Glossy black sheen */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 60%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255,255,255,0.02) 0%, transparent 50%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.01) 100%)' }} />

          {/* Animated ambient glow orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-[600px] h-[600px] rounded-full bg-white/[0.012] blur-[120px] -top-[200px] -left-[100px] animate-[ambientDrift_18s_ease-in-out_infinite]" />
            <div className="absolute w-[500px] h-[500px] rounded-full bg-white/[0.008] blur-[100px] -bottom-[200px] -right-[100px] animate-[ambientDrift_22s_ease-in-out_infinite_reverse]" />
          </div>

          {/* Top bar: Logo + Agent Live */}
          <div
            className={`relative z-10 flex px-8 pt-5 justify-between items-start transition-all duration-700 ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 shadow-[0_24px_70px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-xl bg-black/40 border-white/10 border flex justify-center items-center transition-transform duration-500 hover:scale-110 hover:rotate-6 overflow-hidden p-0">
                <Image src="/logo_transparent.png" alt="Mnemos" width={80} height={80} className="object-cover min-w-[80px] min-h-[80px]" />
              </div>
              <div className="flex flex-col">
                <div className="drop-shadow-[0_0_18px_rgba(255,255,255,0.12)] font-bold text-white text-[28px] leading-8 tracking-[-0.64px]">
                  Mnemos
                </div>
                <div className="uppercase text-white/45 text-xs leading-4 tracking-[5.12px]">
                  Relationship Intelligence
                </div>
              </div>
            </div>
            <Link href="/dashboard" className="shadow-[0_24px_70px_rgba(0,0,0,0.72)] backdrop-blur-md rounded-full bg-white/10 border-white/10 border flex px-4 py-2 items-center gap-3 transition-all duration-300 hover:bg-white/15 hover:border-white/20 cursor-pointer">
              <span className="relative w-3 h-3 flex">
                <span className="inline-flex animate-ping opacity-70 rounded-full bg-[#ff1744] absolute w-full h-full" />
                <span className="relative inline-flex w-3 h-3 shadow-[0_0_18px_rgba(255,23,68,0.95)] rounded-full bg-[#ff1744]" />
              </span>
              <span className="font-medium text-white text-sm leading-5">
                Agent Live
              </span>
            </Link>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-[1140px] flex mx-auto px-8 pt-4 flex-col items-center w-full flex-1 min-h-0">
            <div
              className={`max-w-[860px] text-center transition-all duration-1000 ease-out ${
                heroVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              <div className="drop-shadow-[0_0_28px_rgba(255,255,255,0.16)] font-extrabold text-white text-5xl lg:text-6xl tracking-tight">
                Your Relationships. Remembered.
              </div>
              <div
                className={`max-w-[760px] text-white/55 text-lg leading-7 mx-auto mt-3 transition-all duration-1000 ease-out delay-200 ${
                  heroVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
              >
                AI-powered relationship intelligence that never forgets a
                promise.
              </div>
              <div
                className={`flex mt-5 justify-center items-center gap-4 relative z-50 transition-all duration-700 ease-out delay-500 ${
                  heroVisible
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-4 scale-95"
                }`}
              >
                <Link
                  href="/dashboard"
                  className="relative z-50 inline-flex items-center justify-center whitespace-nowrap shadow-[0_18px_50px_rgba(255,255,255,0.18),0_24px_80px_rgba(0,0,0,0.55)] transition-all duration-300 font-semibold rounded-full bg-white text-black text-sm px-6 h-10 hover:bg-neutral-200 hover:scale-105 hover:shadow-[0_20px_60px_rgba(255,255,255,0.25),0_28px_90px_rgba(0,0,0,0.6)] active:scale-95"
                >
                  Get Started
                </Link>
                <button
                  onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all duration-300 font-semibold rounded-full bg-white/10 text-white text-sm border border-white/20 px-6 h-10 hover:bg-white/20 hover:scale-105 hover:border-white/30 active:scale-95"
                >
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Network Graph Visualization */}
            <div
              className={`pointer-events-none relative flex mt-4 justify-center items-center w-full h-[340px] lg:h-[380px] transition-all duration-1200 ease-out ${
                graphVisible
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-90"
              }`}
            >
              {/* Background glow */}
              <div className="blur-3xl rounded-full bg-white/[0.04] absolute inset-x-10 top-4 h-[320px] animate-[breathe_6s_ease-in-out_infinite]" />

              {/* Concentric circles with pulse animation */}
              <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_160px_rgba(255,255,255,0.12)] rounded-full border-white/20 border absolute w-[320px] h-[320px] lg:w-[380px] lg:h-[380px] animate-[concentricPulse_4s_ease-in-out_infinite]" />
              <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 blur-[1px] rounded-full border-white/[0.12] border absolute w-[440px] h-[440px] lg:w-[500px] lg:h-[500px] animate-[concentricPulse_4s_ease-in-out_infinite_0.5s]" />
              <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60 rounded-full border-white/10 border absolute w-[560px] h-[560px] lg:w-[620px] lg:h-[620px] animate-[concentricPulse_4s_ease-in-out_infinite_1s]" />

              {/* Radial lines with slow rotation */}
              <div className="left-1/2 top-[52%] -translate-x-1/2 absolute w-[760px] h-[760px] animate-[spinSlow_60s_linear_infinite]">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 bg-white/10 w-full h-px" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 rotate-45 bg-white/10 w-full h-px" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -rotate-45 bg-white/10 w-full h-px" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 rotate-90 bg-white/10 w-full h-px" />
              </div>

              {/* Bright connection lines radiating from center */}
              <div className="left-[50%] top-[44%] -translate-x-1/2 -translate-y-1/2 rotate-[12deg] shadow-[0_0_18px_rgba(255,255,255,0.45)] rounded-full bg-white/80 absolute w-[220px] h-px animate-[lineGlow_3s_ease-in-out_infinite]" />
              <div className="left-[50%] top-[44%] -translate-x-1/2 -translate-y-1/2 -rotate-[12deg] shadow-[0_0_18px_rgba(255,255,255,0.45)] rounded-full bg-white/80 absolute w-[220px] h-px animate-[lineGlow_3s_ease-in-out_infinite_0.4s]" />
              <div className="left-[50%] top-[44%] -translate-x-1/2 -translate-y-1/2 rotate-[28deg] shadow-[0_0_18px_rgba(255,255,255,0.35)] rounded-full bg-white/70 absolute w-[180px] h-px animate-[lineGlow_3s_ease-in-out_infinite_0.8s]" />
              <div className="left-[50%] top-[44%] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] shadow-[0_0_18px_rgba(255,255,255,0.35)] rounded-full bg-white/70 absolute w-[180px] h-px animate-[lineGlow_3s_ease-in-out_infinite_1.2s]" />
              <div className="left-[50%] top-[44%] -translate-x-1/2 -translate-y-1/2 rotate-[52deg] shadow-[0_0_18px_rgba(255,255,255,0.3)] rounded-full bg-white/60 absolute w-[130px] h-px animate-[lineGlow_3s_ease-in-out_infinite_1.6s]" />
              <div className="left-[50%] top-[44%] -translate-x-1/2 -translate-y-1/2 -rotate-[52deg] shadow-[0_0_18px_rgba(255,255,255,0.3)] rounded-full bg-white/60 absolute w-[130px] h-px animate-[lineGlow_3s_ease-in-out_infinite_2s]" />

              {/* Central node: Core Memory */}
              <div className="left-[50%] top-[44%] -translate-x-1/2 -translate-y-1/2 shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_100px_rgba(255,255,255,0.15),0_0_40px_rgba(255,255,255,0.06)] backdrop-blur-md rounded-full bg-white/[0.14] border-white/30 border flex absolute px-8 py-7 flex-col items-center gap-2 animate-[float_5s_ease-in-out_infinite] transition-transform duration-300 hover:scale-110">
                <div className="uppercase text-white/35 text-xs tracking-[6.4px]">
                  Core Memory
                </div>
                <div className="font-bold text-white text-3xl tracking-[-0.64px]">
                  Mnemos
                </div>
                <div className="text-white/65 text-sm">
                  Live hierarchical relationship graph
                </div>
              </div>

              {/* Orbiting satellite nodes */}
              <div className="left-[24%] top-[18%] shadow-[0_0_50px_rgba(255,255,255,0.12),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-white/10 border-white/20 border flex absolute px-5 py-4 flex-col items-center gap-2 animate-[floatNode1_6s_ease-in-out_infinite] transition-all duration-300 hover:scale-110 hover:bg-white/15 cursor-default">
                <div className="w-4 h-4 shadow-[0_0_18px_rgba(255,255,255,0.85)] rounded-full bg-white animate-[nodePulse_3s_ease-in-out_infinite]" />
                <div className="font-semibold text-white text-xs tracking-[3.2px]">
                  TRUSTED
                </div>
              </div>

              <div className="left-[72%] top-[16%] shadow-[0_0_50px_rgba(255,255,255,0.12),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-white/10 border-white/20 border flex absolute px-5 py-4 flex-col items-center gap-2 animate-[floatNode2_7s_ease-in-out_infinite] transition-all duration-300 hover:scale-110 hover:bg-white/15 cursor-default">
                <div className="w-4 h-4 shadow-[0_0_18px_rgba(255,255,255,0.85)] rounded-full bg-white animate-[nodePulse_3s_ease-in-out_infinite_0.5s]" />
                <div className="font-semibold text-white text-xs tracking-[3.2px]">
                  ENGAGED
                </div>
              </div>

              {/* Critical alert nodes */}
              <div className="left-[18%] top-[70%] shadow-[0_0_60px_rgba(255,23,68,0.35),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-[#ff1744]/10 border-[#ff1744]/30 border flex absolute px-5 py-4 flex-col items-center gap-2 animate-[floatNode3_5.5s_ease-in-out_infinite] transition-all duration-300 hover:scale-110 cursor-default">
                <div className="relative w-4 h-4 shadow-[0_0_22px_rgba(255,23,68,0.95)] rounded-full bg-[#ff1744]">
                  <span className="animate-ping opacity-70 rounded-full bg-[#ff1744] absolute inset-0" />
                </div>
                <div className="font-semibold text-[#ff1744] text-xs tracking-[3.2px]">
                  CUST-0087
                </div>
              </div>

              <div className="left-[76%] top-[70%] shadow-[0_0_60px_rgba(255,23,68,0.35),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-[#ff1744]/10 border-[#ff1744]/30 border flex absolute px-5 py-4 flex-col items-center gap-2 animate-[floatNode4_6.5s_ease-in-out_infinite] transition-all duration-300 hover:scale-110 cursor-default">
                <div className="relative w-4 h-4 shadow-[0_0_22px_rgba(255,23,68,0.95)] rounded-full bg-[#ff1744]">
                  <span className="animate-ping opacity-70 rounded-full bg-[#ff1744] absolute inset-0" />
                </div>
                <div className="font-semibold text-[#ff1744] text-xs tracking-[3.2px]">
                  CUST-0031
                </div>
              </div>

              {/* Bottom prospect node */}
              <div className="left-[50%] top-[88%] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_50px_rgba(255,255,255,0.12),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-white/10 border-white/20 border flex absolute px-5 py-4 flex-col items-center gap-2 animate-[float_7s_ease-in-out_infinite] transition-all duration-300 hover:scale-110 hover:bg-white/15 cursor-default">
                <div className="w-4 h-4 shadow-[0_0_18px_rgba(255,255,255,0.35)] rounded-full bg-white/70 animate-[nodePulse_3s_ease-in-out_infinite_1.5s]" />
                <div className="font-semibold text-white/75 text-xs tracking-[3.2px]">
                  PROSPECT
                </div>
              </div>

              {/* Particle dots with floating animation */}
              <div className="left-[30%] top-[40%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white absolute animate-[particleFloat_4s_ease-in-out_infinite]" />
              <div className="left-[38%] top-[34%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white/80 absolute animate-[particleFloat_5s_ease-in-out_infinite_0.5s]" />
              <div className="left-[62%] top-[34%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white/80 absolute animate-[particleFloat_4.5s_ease-in-out_infinite_1s]" />
              <div className="left-[70%] top-[40%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white absolute animate-[particleFloat_5.5s_ease-in-out_infinite_1.5s]" />
              <div className="left-[42%] top-[66%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white/70 absolute animate-[particleFloat_3.5s_ease-in-out_infinite_2s]" />
              <div className="left-[58%] top-[66%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white/70 absolute animate-[particleFloat_4s_ease-in-out_infinite_2.5s]" />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 pt-1 pb-4 gap-3 w-full">
              <div
                className={`shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border border-white/10 p-5 transition-all duration-700 ease-out hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 cursor-default ${
                  cardsVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: "0ms" }}
              >
                <div className="p-0 flex flex-col gap-3">
                  <div className="text-white/70 flex items-center gap-3">
                    <Users className="w-5 h-5 text-white" />
                    <span className="uppercase text-xs tracking-[5.6px]">
                      Entities Tracked
                    </span>
                  </div>
                  <div className="font-bold text-white text-4xl tracking-tighter">
                    {liveStats.entities}
                  </div>
                </div>
              </div>

              <div
                className={`shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border border-white/10 p-5 transition-all duration-700 ease-out hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 cursor-default ${
                  cardsVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: "100ms" }}
              >
                <div className="p-0 flex flex-col gap-3">
                  <div className="text-white/70 flex items-center gap-3">
                    <Network className="w-5 h-5 text-white/70" />
                    <span className="uppercase text-xs tracking-[5.6px]">
                      Memory Nodes
                    </span>
                  </div>
                  <div className="font-bold text-white text-4xl tracking-tighter">
                    {liveStats.events.toLocaleString()}
                  </div>
                </div>
              </div>

              <div
                className={`shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border border-[#ff1744]/20 p-5 transition-all duration-700 ease-out hover:bg-white/[0.08] hover:border-[#ff1744]/40 hover:-translate-y-1 cursor-default ${
                  cardsVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: "200ms" }}
              >
                <div className="p-0 flex flex-col gap-3">
                  <div className="text-white/70 flex items-center gap-3">
                    <span className="relative w-3 h-3 flex">
                      <span className="inline-flex animate-ping opacity-70 rounded-full bg-[#ff1744] absolute w-full h-full" />
                      <span className="relative inline-flex w-3 h-3 shadow-[0_0_18px_rgba(255,23,68,0.9)] rounded-full bg-[#ff1744]" />
                    </span>
                    <span className="uppercase text-xs tracking-[5.6px]">
                      Critical Alerts
                    </span>
                  </div>
                  <div className="font-bold text-[#ff1744] text-4xl tracking-tighter">
                    {liveStats.alerts}
                  </div>
                </div>
              </div>

              <div
                className={`shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border border-white/10 p-5 transition-all duration-700 ease-out hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 cursor-default ${
                  cardsVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: "300ms" }}
              >
                <div className="p-0 flex flex-col gap-3">
                  <div className="text-white/70 flex items-center gap-3">
                    <span className="relative w-3 h-3 flex">
                      <span className="inline-flex animate-ping opacity-70 rounded-full bg-emerald-400 absolute w-full h-full" />
                      <span className="relative inline-flex w-3 h-3 shadow-[0_0_18px_rgba(74,222,128,0.9)] rounded-full bg-emerald-400" />
                    </span>
                    <span className="uppercase text-xs tracking-[5.6px]">
                      Agent Live 24/7
                    </span>
                  </div>
                  <div className="font-bold text-white text-4xl tracking-tighter">
                    Live
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Powered by Cognee — Fixed bottom-left corner */}
          <a
            href="https://www.cognee.ai"
            target="_blank"
            rel="noopener noreferrer"
            className={`fixed left-6 bottom-6 z-50 shadow-[0_18px_50px_rgba(0,0,0,0.65)] backdrop-blur-md rounded-full bg-white/10 text-white/55 text-sm border-white/20 border px-4 py-2 transition-all duration-700 ease-out hover:bg-white/15 hover:text-white/70 hover:border-white/30 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "1200ms" }}
          >
            Powered by Cognee
          </a>
        </div>

        {/* Features Section */}
        <div id="features-section" className="bg-black text-white py-24 px-8">
          <div className="max-w-[1140px] mx-auto">
            <div className="text-center mb-16">
              <div className="uppercase text-white/35 text-xs tracking-[5.12px] mb-4">How It Works</div>
              <div className="font-extrabold text-white text-4xl tracking-tight">The Memory Lifecycle</div>
              <p className="text-white/50 text-lg mt-3 max-w-[600px] mx-auto">Four stages that transform raw interactions into actionable relationship intelligence.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Remember', desc: 'Ingest emails, calls, and meetings. AI classifies every interaction automatically.', icon: '🧠' },
                { step: '02', title: 'Recall', desc: 'Query any relationship history with natural language. Instant context, zero digging.', icon: '🔍' },
                { step: '03', title: 'Memify', desc: 'Transform raw text into structured memory nodes with sentiment, promises, and signals.', icon: '⚡' },
                { step: '04', title: 'Forget', desc: 'Controlled data lifecycle. Remove entities when relationships end or data expires.', icon: '🗑️' },
              ].map((item) => (
                <div key={item.step} className="group shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border border-white/10 p-8 transition-all duration-500 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-2">
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <div className="text-white/30 font-mono text-xs mb-2">{item.step}</div>
                  <div className="font-bold text-white text-lg mb-2">{item.title}</div>
                  <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
