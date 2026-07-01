import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mnemos ERP Intelligence",
  description: "Relationship entropy monitoring and promise tracking dashboard",
};

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-stone-200 rounded-none">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-600/20 group-hover:shadow-amber-600/40 transition-shadow duration-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-amber-950">
              Mnemos
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600/70 block -mt-1 font-medium">
              ERP Intelligence
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
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
      </div>
    </nav>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-amber-950 hover:bg-stone-100 transition-all duration-200"
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
      <body className="min-h-screen bg-[#faf8f5] antialiased">
        <NavBar />
        <main className="pt-20 pb-12 px-6 max-w-7xl mx-auto relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
