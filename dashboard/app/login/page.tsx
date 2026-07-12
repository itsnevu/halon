"use client";

import { signIn } from "next-auth/react";
import { HalonWordmark } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative px-4">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-lime/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid Pattern */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      {/* Login Card */}
      <div className="w-full max-w-md panel p-8 md:p-10 z-10 neu-raise flex flex-col items-center">
        
        <HalonWordmark className="h-8 w-auto text-white mb-8" />
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display text-white mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-mist text-sm">Sign in to manage your HALON liquidity and access the suppression layer.</p>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-full bg-white text-black font-medium transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-4 w-full text-center">
          <ButtonLink 
            href="/" 
            variant="ghost" 
            className="w-full h-12 flex items-center justify-center rounded-full text-mist hover:text-white transition-colors border border-line bg-surface-2 hover:bg-surface-3"
          >
            ← Back to Home
          </ButtonLink>
        </div>

      </div>
    </div>
  );
}
