"use client";

import Link from "next/link";
import { HalonWordmark } from "@/components/ui/logo";
import { useState } from "react";
import { cn } from "@/lib/cn";

export default function DocsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npx skills add halon-ai --skill swap-protection");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#BDBDBD] font-sans overflow-x-hidden selection:bg-[#FC0F9F]/30">
      
      {/* DEVELOPER HEADER */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 border-b border-[#222222] bg-[#0F0F0F]">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-80 transition-opacity flex items-center gap-2">
            {/* Mock Unicorn-style logo for HALON Devs */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FC0F9F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 22h20L12 2z"></path>
              <circle cx="12" cy="14" r="3" fill="#FC0F9F"></circle>
            </svg>
            <span className="text-white font-medium text-lg tracking-tight">Developers</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2 text-sm font-medium">
          <Link href="/docs" className="text-white">Docs</Link>
          <Link href="/docs" className="hover:text-white transition-colors">API Reference</Link>
          <button className="hover:text-white transition-colors flex items-center gap-1">
            Resources
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <button className="text-mist hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          </button>
          <button className="bg-[#FC0F9F] text-white font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-[#FC0F9F]/90 transition-colors">
            API keys
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex max-w-[1440px] mx-auto w-full relative">
        
        {/* SIDEBAR */}
        <aside className="w-[280px] shrink-0 border-r border-[#222222] min-h-[calc(100vh-4rem)] p-6 hidden lg:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
          
          <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full bg-[#1A1A1A] border border-[#2B2B2B] text-white text-sm rounded-lg pl-9 pr-8 py-2 outline-none focus:border-[#FC0F9F]/50 transition-colors"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#555]">
              /
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-white font-bold text-sm mb-3">Get Started</h3>
              <ul className="space-y-2 text-sm text-[#999]">
                <li><Link href="#" className="text-white block">Quick Start</Link></li>
                <li>
                  <button className="flex items-center justify-between w-full hover:text-white transition-colors">
                    Concepts
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-sm mb-3">Trade</h3>
              <ul className="space-y-3 text-sm text-[#999]">
                <li><Link href="#" className="hover:text-white transition-colors block">Trading Overview</Link></li>
                <li>
                  <button className="flex items-center justify-between w-full hover:text-white transition-colors">
                    Swapping
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </li>
                <li><Link href="#" className="hover:text-white transition-colors block">Custom Linking</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-sm mb-3">Liquidity</h3>
              <ul className="space-y-3 text-sm text-[#999]">
                <li><Link href="#" className="hover:text-white transition-colors block">Liquidity Overview</Link></li>
                <li>
                  <button className="flex items-center justify-between w-full hover:text-white transition-colors">
                    Liquidity Provisioning
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </li>
                <li>
                  <button className="flex items-center justify-between w-full hover:text-white transition-colors">
                    Liquidity Launchpad
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </li>
                <li>
                  <button className="flex items-center justify-between w-full hover:text-white transition-colors">
                    HalonX
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 p-8 md:p-12 lg:p-16 relative">
          
          {/* Subtle grid background matching Uniswap Dev portal */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

          <div className="max-w-4xl mx-auto relative z-10">
            
            <div className="flex flex-col xl:flex-row gap-12 items-start justify-between mb-24">
              
              <div className="flex-1">
                <h1 className="text-5xl md:text-6xl font-medium text-white tracking-tight mb-6 leading-[1.1]">
                  HALON<br/>Documentation
                </h1>
                <p className="text-lg text-[#999] mb-8 max-w-md">
                  Integrate swaps, manage liquidity, launch tokens and more with AI-friendly DeFi tooling.
                </p>
                <div className="flex gap-4">
                  <button className="bg-[#FC0F9F] text-white font-medium px-6 py-3 rounded-full hover:bg-[#FC0F9F]/90 transition-colors">
                    Quick start
                  </button>
                  <button className="bg-[#FC0F9F]/10 text-[#FC0F9F] font-medium px-6 py-3 rounded-full hover:bg-[#FC0F9F]/20 transition-colors">
                    Agent skills
                  </button>
                </div>
              </div>

              {/* QUICK START CODE BLOCK WIDGET */}
              <div className="w-full xl:w-[480px] bg-[#111111] border border-[#2B2B2B] rounded-2xl overflow-hidden shadow-2xl shrink-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B2B2B] bg-[#161616]">
                  <span className="text-white text-sm font-medium">Quick Start</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#999] text-xs flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                      Agent skills <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    </span>
                    <button onClick={handleCopy} className="text-[#999] hover:text-white transition-colors">
                      {copied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CDFF71" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-6 overflow-x-auto font-mono text-sm leading-relaxed">
                  <span className="text-[#999]">npx</span> <span className="text-[#A78BFA]">skills</span> <span className="text-[#60A5FA]">add</span> <span className="text-white">halon/halon-ai --skill swap-protection</span>
                </div>
              </div>

            </div>

            {/* GUIDES SECTION */}
            <div className="mb-16">
              <h2 className="text-2xl font-medium text-white mb-6">Guides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Guide Card 1 */}
                <div className="bg-[#24151E] border border-[#3A1E2E] rounded-2xl p-8 hover:border-[#FC0F9F]/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#FC0F9F]/20 flex items-center justify-center text-[#FC0F9F]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline></svg>
                    </div>
                    <h3 className="text-xl text-white font-medium group-hover:text-[#FC0F9F] transition-colors">Swap tokens</h3>
                  </div>
                  <p className="text-[#999] ml-14">Add swaps to your app</p>
                </div>

                {/* Guide Card 2 */}
                <div className="bg-[#121A2A] border border-[#1E2D4A] rounded-2xl p-8 hover:border-[#3B82F6]/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
                    </div>
                    <h3 className="text-xl text-white font-medium group-hover:text-[#3B82F6] transition-colors">Manage liquidity</h3>
                  </div>
                  <p className="text-[#999] ml-14">Earn fees programmatically</p>
                </div>

              </div>
            </div>

            {/* Feedback Float */}
            <div className="fixed bottom-6 right-6 hidden md:block">
              <button className="bg-[#1A1A1A] border border-[#2B2B2B] text-[#BDBDBD] hover:text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-lg">
                Feedback
              </button>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
