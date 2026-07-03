import { useEffect } from "react";
import { Network, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      <div className="bg-neutral-950 text-neutral-50 w-full overflow-hidden min-h-screen">
        <div className="relative min-h-[956px] bg-white/5 text-white w-full">
          <div className="bg-white/5 absolute inset-0" />
          <div className="bg-white/5 absolute inset-0" />
          <div className="bg-white/5 absolute inset-0" />
          <div className="relative z-10 flex px-8 pt-8 justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 shadow-[0_24px_70px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-2xl bg-white/10 border-white/10 border flex justify-center items-center">
                <div className="relative w-6 h-6">
                  <div className="left-1/2 top-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-white/80 border absolute" />
                  <div className="left-[18%] top-[18%] w-1.5 h-1.5 shadow-[0_0_14px_rgba(255,255,255,0.9)] rounded-full bg-white absolute" />
                  <div className="right-[14%] top-[28%] w-1.5 h-1.5 shadow-[0_0_14px_rgba(255,255,255,0.9)] rounded-full bg-white/90 absolute" />
                  <div className="left-[42%] bottom-[12%] w-1.5 h-1.5 shadow-[0_0_14px_rgba(255,255,255,0.9)] rounded-full bg-white/90 absolute" />
                  <div className="left-[24%] top-[28%] w-[42%] rotate-[28deg] bg-white/80 absolute h-px" />
                  <div className="left-[34%] top-[44%] w-[40%] rotate-[-34deg] bg-white/80 absolute h-px" />
                </div>
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
            <div className="shadow-[0_24px_70px_rgba(0,0,0,0.72)] backdrop-blur-md rounded-full bg-white/10 border-white/10 border flex px-4 py-2 items-center gap-3">
              <span className="relative w-3 h-3 flex">
                <span className="inline-flex animate-ping opacity-70 rounded-full bg-[#ff1744] absolute w-full h-full" />
                <span className="relative inline-flex w-3 h-3 shadow-[0_0_18px_rgba(255,23,68,0.95)] rounded-full bg-[#ff1744]" />
              </span>
              <span className="font-medium text-white text-sm leading-5">
                Agent Live
              </span>
            </div>
          </div>
          <div className="relative z-10 max-w-[1140px] flex mx-auto px-8 pt-10 flex-col items-center w-full">
            <div className="max-w-[860px] text-center">
              <div className="drop-shadow-[0_0_28px_rgba(255,255,255,0.16)] font-extrabold text-white text-7xl tracking-tight">
                Your Relationships. Remembered.
              </div>
              <div className="max-w-[760px] text-white/55 text-xl leading-8 mx-auto mt-5">
                AI-powered relationship intelligence that never forgets a
                promise.
              </div>
              <div className="flex mt-8 justify-center items-center gap-4">
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center justify-center whitespace-nowrap shadow-[0_18px_50px_rgba(255,255,255,0.18),0_24px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 font-semibold rounded-full bg-white text-black text-base px-7 h-12 hover:bg-neutral-200"
                >
                  Get Started
                </Link>
                <Button
                  variant="outline"
                  className="shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md transition-transform duration-300 font-semibold rounded-full bg-white/10 text-white text-base border-white/20 px-7 h-12 hover:bg-white/20"
                >
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative flex mt-10 justify-center items-center w-full h-[520px]">
              <div className="blur-3xl rounded-full bg-white/5 absolute inset-x-10 top-8 h-[420px]" />
              <div className="rounded-[40px] bg-white/5 absolute inset-0" />
              <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_120px_rgba(255,255,255,0.08)] rounded-full border-white/10 border absolute w-[460px] h-[460px]" />
              <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 blur-[1px] rounded-full border-white/5 border absolute w-[620px] h-[620px]" />
              <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40 rounded-full border-white/5 border absolute w-[760px] h-[760px]" />
              <div className="left-1/2 top-[52%] -translate-x-1/2 bg-white/10 absolute w-[760px] h-px" />
              <div className="left-1/2 top-[52%] -translate-x-1/2 rotate-45 bg-white/10 absolute w-[760px] h-px" />
              <div className="left-1/2 top-[52%] -translate-x-1/2 -rotate-45 bg-white/10 absolute w-[760px] h-px" />
              <div className="left-1/2 top-[52%] -translate-x-1/2 rotate-90 bg-white/10 absolute w-[760px] h-px" />
              <div className="left-[50%] top-[48%] -translate-x-1/2 -translate-y-1/2 rotate-[12deg] shadow-[0_0_18px_rgba(255,255,255,0.45)] rounded-full bg-white/80 absolute w-[220px] h-px" />
              <div className="left-[50%] top-[48%] -translate-x-1/2 -translate-y-1/2 -rotate-[12deg] shadow-[0_0_18px_rgba(255,255,255,0.45)] rounded-full bg-white/80 absolute w-[220px] h-px" />
              <div className="left-[50%] top-[48%] -translate-x-1/2 -translate-y-1/2 rotate-[28deg] shadow-[0_0_18px_rgba(255,255,255,0.35)] rounded-full bg-white/70 absolute w-[180px] h-px" />
              <div className="left-[50%] top-[48%] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] shadow-[0_0_18px_rgba(255,255,255,0.35)] rounded-full bg-white/70 absolute w-[180px] h-px" />
              <div className="left-[50%] top-[48%] -translate-x-1/2 -translate-y-1/2 rotate-[52deg] shadow-[0_0_18px_rgba(255,255,255,0.3)] rounded-full bg-white/60 absolute w-[130px] h-px" />
              <div className="left-[50%] top-[48%] -translate-x-1/2 -translate-y-1/2 -rotate-[52deg] shadow-[0_0_18px_rgba(255,255,255,0.3)] rounded-full bg-white/60 absolute w-[130px] h-px" />
              <div className="left-[50%] top-[48%] -translate-x-1/2 -translate-y-1/2 shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_80px_rgba(255,255,255,0.08)] backdrop-blur-md rounded-full bg-white/10 border-white/20 border flex absolute px-8 py-7 flex-col items-center gap-2">
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
              <div className="left-[24%] top-[28%] shadow-[0_0_50px_rgba(255,255,255,0.12),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-white/10 border-white/20 border flex absolute px-5 py-4 flex-col items-center gap-2">
                <div className="w-4 h-4 shadow-[0_0_18px_rgba(255,255,255,0.85)] rounded-full bg-white" />
                <div className="font-semibold text-white text-xs tracking-[3.2px]">
                  TRUSTED
                </div>
              </div>
              <div className="left-[72%] top-[26%] shadow-[0_0_50px_rgba(255,255,255,0.12),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-white/10 border-white/20 border flex absolute px-5 py-4 flex-col items-center gap-2">
                <div className="w-4 h-4 shadow-[0_0_18px_rgba(255,255,255,0.85)] rounded-full bg-white" />
                <div className="font-semibold text-white text-xs tracking-[3.2px]">
                  ENGAGED
                </div>
              </div>
              <div className="left-[18%] top-[58%] shadow-[0_0_60px_rgba(255,23,68,0.35),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-[#ff1744]/10 border-[#ff1744]/30 border flex absolute px-5 py-4 flex-col items-center gap-2">
                <div className="relative w-4 h-4 shadow-[0_0_22px_rgba(255,23,68,0.95)] rounded-full bg-[#ff1744]">
                  <span className="animate-ping opacity-70 rounded-full bg-[#ff1744] absolute inset-0" />
                </div>
                <div className="font-semibold text-[#ff1744] text-xs tracking-[3.2px]">
                  CUST-0087
                </div>
              </div>
              <div className="left-[76%] top-[58%] shadow-[0_0_60px_rgba(255,23,68,0.35),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-[#ff1744]/10 border-[#ff1744]/30 border flex absolute px-5 py-4 flex-col items-center gap-2">
                <div className="relative w-4 h-4 shadow-[0_0_22px_rgba(255,23,68,0.95)] rounded-full bg-[#ff1744]">
                  <span className="animate-ping opacity-70 rounded-full bg-[#ff1744] absolute inset-0" />
                </div>
                <div className="font-semibold text-[#ff1744] text-xs tracking-[3.2px]">
                  CUST-0031
                </div>
              </div>
              <div className="left-[50%] top-[72%] -translate-x-1/2 shadow-[0_0_50px_rgba(255,255,255,0.12),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm rounded-full bg-white/10 border-white/20 border flex absolute px-5 py-4 flex-col items-center gap-2">
                <div className="w-4 h-4 shadow-[0_0_18px_rgba(255,255,255,0.35)] rounded-full bg-white/70" />
                <div className="font-semibold text-white/75 text-xs tracking-[3.2px]">
                  PROSPECT
                </div>
              </div>
              <div className="left-[30%] top-[40%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white absolute" />
              <div className="left-[38%] top-[34%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white/80 absolute" />
              <div className="left-[62%] top-[34%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white/80 absolute" />
              <div className="left-[70%] top-[40%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white absolute" />
              <div className="left-[42%] top-[66%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white/70 absolute" />
              <div className="left-[58%] top-[66%] w-2 h-2 shadow-[0_0_12px_rgba(255,255,255,0.9)] rounded-full bg-white/70 absolute" />
            </div>
            <div className="grid grid-cols-4 pt-2 pb-8 gap-4 w-full">
              <Card className="shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border-white/10 p-5">
                <CardContent className="p-0 flex flex-col gap-3">
                  <div className="text-white/70 flex items-center gap-3">
                    <Users className="w-5 h-5 text-white" />
                    <span className="uppercase text-xs tracking-[5.6px]">
                      Entities Tracked
                    </span>
                  </div>
                  <div className="font-bold text-white text-4xl tracking-tighter">
                    284
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border-white/10 p-5">
                <CardContent className="p-0 flex flex-col gap-3">
                  <div className="text-white/70 flex items-center gap-3">
                    <Network className="w-5 h-5 text-white/70" />
                    <span className="uppercase text-xs tracking-[5.6px]">
                      Memory Nodes
                    </span>
                  </div>
                  <div className="font-bold text-white text-4xl tracking-tighter">
                    1,284
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border-[#ff1744]/20 p-5">
                <CardContent className="p-0 flex flex-col gap-3">
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
                    12
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-md rounded-3xl bg-white/5 border-white/10 p-5">
                <CardContent className="p-0 flex flex-col gap-3">
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
                </CardContent>
              </Card>
            </div>
            <div className="shadow-[0_18px_50px_rgba(0,0,0,0.65)] backdrop-blur-md rounded-full bg-white/10 text-white/55 text-sm border-white/20 border absolute left-8 bottom-6 px-4 py-2">
              Powered by Cognee
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
