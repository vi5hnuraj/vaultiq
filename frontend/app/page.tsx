'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  FileText,
  Database,
  Coins,
  TrendingUp,
  Github,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { NavbarDemo } from '@/components/layout/Navbar';
import Hero from '@/components/layout/Hero';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const handlePortalAccess = (role: 'enterprise' | 'investor') => {
      router.push(role === 'enterprise' ? `/enterprise/${address}` : `/investor/${address}`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <NavbarDemo />

      <Hero />

      {/* How It Works Section */}
      <section id="features" className="px-6 py-32 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              The Vaultiq Protocol
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Our automated pipeline transforms real-world invoices into liquid on-chain assets with zero-knowledge of privacy-preserving metadata.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Upload,
                title: "Smart Onboarding",
                description: "SMEs upload invoices. Our OCR engine extracts critical data for verification.",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: Database,
                title: "Immutable Storage",
                description: "Metadata is anchored to IPFS, creating a permanent, tamper-proof audit trail.",
                color: "from-indigo-500 to-purple-500"
              },
              {
                icon: FileText,
                title: "RWA Tokenization",
                description: "Invoices are minted as unique NFTs, representing a legal claim on future cash flow.",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Coins,
                title: "Yield Generation",
                description: "Investors provide liquidity for discounted invoices and earn high-fidelity yield.",
                color: "from-pink-500 to-orange-500"
              }
            ].map((step, index) => (
              <div key={index} className="relative group">
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${step.color} rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500`} />
                <div className="relative bg-[#0d0d12] border border-white/5 p-8 rounded-2xl hover:border-white/10 transition-all duration-300 h-full flex flex-col items-center text-center">
                  <div className={`mb-6 p-4 rounded-xl bg-gradient-to-br ${step.color} bg-opacity-10 shadow-lg`}>
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Portal Section */}
      <section id="dashboard" className="px-6 py-32 bg-[#08080a] border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px]" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              Access the Protocol
            </h2>
            <p className="text-slate-400 text-lg">
              Sign up or log in to your specialized portal to begin tokenizing or investing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Investor Card */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-[#0d0d12] border border-white/5 p-10 rounded-3xl text-center">
                <div className="mx-auto mb-8 p-6 rounded-2xl bg-blue-500/10 w-fit">
                  <TrendingUp className="h-12 w-12 text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Investors</h3>
                <p className="text-slate-400 mb-10 text-lg leading-relaxed h-20">
                  Put your capital to work. Fund verified invoices and earn premium yield backed by real-world assets.
                </p>
                {isConnected ? (
                  <Button 
                    onClick={() => handlePortalAccess('investor')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-2xl text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all"
                  >
                    Enter Investor Portal
                  </Button>
                ) : (
                  <div className="flex justify-center">
                    <ConnectButton />
                  </div>
                )}
              </div>
            </div>

            {/* SME Card */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-[#0d0d12] border border-white/5 p-10 rounded-3xl text-center">
                <div className="mx-auto mb-8 p-6 rounded-2xl bg-purple-500/10 w-fit">
                  <Upload className="h-12 w-12 text-purple-400" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">SMEs</h3>
                <p className="text-slate-400 mb-10 text-lg leading-relaxed h-20">
                  Unlock your cash flow. Convert pending invoices into immediate working capital in minutes.
                </p>
                {isConnected ? (
                  <Button 
                    onClick={() => handlePortalAccess('enterprise')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 rounded-2xl text-lg shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all"
                  >
                    Enter SME Portal
                  </Button>
                ) : (
                  <div className="flex justify-center">
                    <ConnectButton />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Pillars / Why Vaultiq */}
      <section className="px-6 py-32 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                Why <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Vaultiq?</span>
              </h2>
              <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                Traditional factoring is broken, slow, and expensive. Vaultiq leverages the transparency of Ethereum and decentralized infrastructure to deliver a new standard for business financing.
              </p>
              
              <div className="space-y-8">
                {[
                  {
                    title: "Instant Capital Injection",
                    text: "SMEs no longer wait 30-90 days for payments. Unlock USDC in minutes based on verified invoice assets."
                  },
                  {
                    title: "Democratized P2P Factoring",
                    text: "Anyone can become an 'Invoice Factor.' Earn institutional-grade yield backed by real economic activity."
                  },
                  {
                    title: "AI-Verified Verification",
                    text: "Automated OCR extraction and IPFS-anchored audit trails eliminate manual entry errors and ensure data integrity."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 group">
                    <div className="flex-shrink-0 w-1.5 h-12 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full group-hover:scale-y-110 transition-transform" />
                    <div>
                      <h4 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                      <p className="text-slate-500 text-sm">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
              <div className="relative bg-[#0d0d12] border border-white/5 p-8 rounded-3xl backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-400" />
                  </div>
                  <h4 className="text-xl font-bold">Protocol Stats</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: "Verification Time", value: "< 2 mins", color: "text-blue-400" },
                    { label: "Avg. Yield (APR)", value: "12-18%", color: "text-green-400" },
                    { label: "RWA Backing", value: "100% Invoices", color: "text-purple-400" },
                    { label: "Settlement", value: "Instant", color: "text-pink-400" }
                  ].map((stat, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-slate-500 text-xs mb-2 uppercase tracking-widest">{stat.label}</div>
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="px-6 py-20 bg-[#050505] border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Vaultiq
          </div>

          <div className="flex flex-wrap justify-center gap-10">
            {['IPFS', 'ENS', 'Ethereum', 'zkSync'].map((link) => (
              <a key={link} href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium tracking-wide hover:scale-105 transform">
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <Github className="h-6 w-6 text-slate-500 hover:text-white cursor-pointer transition-colors" />
            <ExternalLink className="h-6 w-6 text-slate-500 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/5 text-center text-slate-600 text-xs">
          © 2026 Vaultiq Protocol. Secure decentralized RWA financing.
        </div>
      </footer>
    </div>
  );
}