"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/cn";

export interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  iconUrl?: string; // Optional, can use default generated icon if missing
  color: string;
}

export const POPULAR_TOKENS: Token[] = [
  { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", balance: "0.00", color: "#2775CA" },
  { symbol: "ETH", name: "Ethereum", address: "0x4200000000000000000000000000000000000006", balance: "0.00", color: "#627EEA" },
  { symbol: "WBTC", name: "Wrapped BTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", balance: "0.00", color: "#F7931A" },
  { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", balance: "0.00", color: "#26A17B" },
  { symbol: "SOL", name: "Solana", address: "0xSo11111111111111111111111111111111111111112", balance: "0.00", color: "#14F195" },
];

function DefaultTokenIcon({ symbol, color }: { symbol: string, color: string }) {
  return (
    <div 
      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium shadow-sm shrink-0"
      style={{ backgroundColor: color }}
    >
      {symbol.charAt(0)}
    </div>
  );
}

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
}

export function TokenSelector({ isOpen, onClose, onSelect }: TokenSelectorProps) {
  const [search, setSearch] = useState("");

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTokens = POPULAR_TOKENS.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) || 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-[420px] panel neu-raise bg-surface border border-line rounded-3xl overflow-hidden flex flex-col shadow-2xl max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <h2 className="text-white font-medium text-lg">Select a token</h2>
          <button 
            onClick={onClose}
            className="text-mist hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text"
              placeholder="Search tokens or paste address"
              className="w-full bg-surface-2 border border-line rounded-xl py-3 pl-10 pr-4 text-white placeholder-mist outline-none focus:border-lime/50 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Popular tokens row */}
        <div className="px-5 pb-4 flex gap-2 flex-wrap">
          {POPULAR_TOKENS.slice(0, 4).map(token => (
            <button
              key={token.symbol}
              className="flex items-center gap-2 bg-surface-2 border border-line hover:bg-surface-3 transition-colors px-3 py-1.5 rounded-full text-sm text-white"
              onClick={() => {
                onSelect(token);
                onClose();
              }}
            >
              <DefaultTokenIcon symbol={token.symbol} color={token.color} />
              {token.symbol}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto border-t border-line/50 custom-scrollbar">
          {filteredTokens.length === 0 ? (
            <div className="p-8 text-center text-mist">
              No tokens found.
            </div>
          ) : (
            <div className="py-2">
              {filteredTokens.map(token => (
                <button
                  key={token.symbol}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
                  onClick={() => {
                    onSelect(token);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-4">
                    <DefaultTokenIcon symbol={token.symbol} color={token.color} />
                    <div className="text-left">
                      <div className="text-white font-medium">{token.name}</div>
                      <div className="text-sm text-mist">{token.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white">{token.balance}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
