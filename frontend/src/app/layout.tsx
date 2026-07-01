import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Mnemos ERP Intelligence",
  description: "Relationship entropy monitoring and promise tracking dashboard",
};

function NavBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 pointer-events-none">
      <nav className="max-w-7xl mx-auto h-16 glass-panel pointer-events-auto flex items-center justify-between px-6 rounded-2xl">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 flex items-center justify-center drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] group-hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] transition-all duration-300">
            <Image src="/logo_transparent.png" alt="Mnemos Logo" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">
              Mnemos
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-electric-400 block -mt-1 font-medium">
              ERP Intelligence
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <NavLink href="/" label="Dashboard" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          } />
          <NavLink href="/import" label="Import" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          } />
        </div>
      </nav>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-stone-400 hover:text-white hover:bg-white/5 transition-all duration-200"
    >
      {icon}
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-midnight-900 text-stone-200 antialiased selection:bg-electric-500/30 selection:text-white">
        <NavBar />
        <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}

