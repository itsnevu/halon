import Link from "next/link";
import { ReactNode } from "react";

export default function PoWLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <nav className="border-b border-gray-800 bg-black sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/pow" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            ProofOfWork
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/pow/client" className="hover:text-blue-400 transition-colors">Client Portal</Link>
            <Link href="/pow/freelancer" className="hover:text-emerald-400 transition-colors">Freelancer Portal</Link>
            <Link href="/pow/lp" className="hover:text-purple-400 transition-colors">LP (Earn)</Link>
            <div className="h-6 w-px bg-gray-800 mx-2"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-400">Privy Wallet Connected</span>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
