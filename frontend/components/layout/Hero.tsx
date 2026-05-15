'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Upload, TrendingUp } from 'lucide-react';
import Eth from '@/components/ui/Eth';

export default function Hero() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const handlePortalAccess = (role: 'enterprise' | 'investor') => {
      router.push(role === 'enterprise' ? `/enterprise/${address}` : `/investor/${address}`);
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full animate-pulse -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full animate-pulse -z-10" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="text-left">


          {/* Hero Title */}
          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-[1.0] animate-in slide-in-from-left duration-1000">
            <span className="text-white">Unlock Cash Flow.</span><br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Automate Yield.
            </span>
          </h1>

          {/* Hero Description */}
          <p className="text-slate-400 text-lg max-w-xl mb-12 leading-relaxed animate-in fade-in duration-1000 delay-300">
            The next generation of RWA Tokenization. Institutional-grade invoice financing for SMEs, high-yield opportunities for DeFi investors.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-6 animate-in slide-in-from-bottom-4 duration-1000 delay-500">
            {isConnected ? (
              <>
                <button
                  onClick={() => handlePortalAccess('enterprise')}
                  className="group relative w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Upload className="h-5 w-5" />
                    Upload Invoices
                  </div>
                </button>

                <button
                  onClick={() => handlePortalAccess('investor')}
                  className="group relative w-full sm:w-auto px-8 py-4 bg-transparent border border-white/20 text-white font-bold rounded-2xl transition-all hover:bg-white/5 hover:border-white/40 active:scale-95"
                >
                  <div className="flex items-center justify-center gap-3">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    Investor Portal
                  </div>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-4 w-full sm:w-auto">
                <ConnectButton />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: 3D Visualization */}
        <div className="relative hidden md:flex items-center justify-center">
           <div className="absolute w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />
           <Eth />
        </div>
      </div>
    </section>
  );
}
