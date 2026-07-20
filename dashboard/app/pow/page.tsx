export default function PoWLandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          ProofOfWork
        </h1>
        <p className="text-xl text-gray-400">
          The ultimate escrow and advance financing platform combining RWA, DeFi Lending, and AI Agents on the Robinhood Chain.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          <a href="/pow/client" className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-blue-500 transition-colors group">
            <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-400">Client Portal</h3>
            <p className="text-gray-500">Create escrows, lock AAPL/USDG, and manage freelancer milestones.</p>
          </a>
          
          <a href="/pow/freelancer" className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-emerald-500 transition-colors group">
            <h3 className="text-2xl font-bold mb-2 group-hover:text-emerald-400">Freelancer Portal</h3>
            <p className="text-gray-500">Upload proofs, let the AI verify, and get paid instantly.</p>
          </a>
          
          <a href="/pow/lp" className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-purple-500 transition-colors group">
            <h3 className="text-2xl font-bold mb-2 group-hover:text-purple-400">Liquidity Provider</h3>
            <p className="text-gray-500">Provide liquidity to Robinhood Earn pools for advance financing yields.</p>
          </a>
        </div>
      </div>
    </div>
  );
}
